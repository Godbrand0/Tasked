// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Math} from "openzeppelin-contracts/contracts/utils/math/Math.sol";

/// @notice Minimal read interface onto Mezo's Tigris veBTC/veMEZO voting-escrow
/// contracts. Patron voting weight is sourced live from here instead of a
/// Taskify-custodied stake — see VOTING_SYSTEM_REDESIGN.md.
interface IMezoVotingEscrow {
    function balanceOf(address owner) external view returns (uint256);
    function ownerToNFTokenIdList(address owner, uint256 index) external view returns (uint256);
    function getPastVotes(address account, uint256 tokenId, uint256 timestamp) external view returns (uint256);
}

/// @title Taskify — on-chain bounty board for the Mezo / Bitcoin ecosystem
/// @notice MUSD is the escrow and grant-pool currency; MEZO amplifies
/// governance-weight staking.
contract Taskify is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ----- Errors -----
    error NotAuthorized();
    error UserAlreadyRegistered();
    error UserNotRegistered();
    error InvalidRole();
    error InvalidExperience();
    error CooldownActive();
    error InvalidAmount();
    error TaskNotFound();
    error InvalidStatus();
    error ExperienceMismatch();
    error AlreadyApplied();
    error NotApplied();
    error InvalidAssignee();
    error DeadlineNotPassed();
    error DeadlinePassed();
    error InsufficientFunds();
    error InvalidToken();
    error VotingClosed();
    error VotingOpen();
    error AlreadyVoted();
    error NoStake();
    error NotApprovedVoter();
    error WaveNotFinished();
    error AlreadyClaimed();
    error NoReward();
    error InvalidWave();
    error TaskKindMismatch();
    error InvalidWinnerCount();
    error WinnerNotJoined();
    error DuplicateWinner();
    error InvalidOwner();
    error InvalidDuration();
    error InvalidTreasury();
    error NotStranded();

    // ----- Enums -----
    enum Role {
        None,
        Creator,
        Contributor
    }

    enum FundingType {
        Self,
        Grant
    }

    enum TaskKind {
        Development, // single assignee, experience-gated, GitHub-signaled
        Community // open to any registered user, creator pays N winners
    }

    enum Status {
        None,
        Open,
        Assigned,
        InProgress,
        Submitted,
        FundsReleased,
        Cancelled,
        Expired,
        GrantPending,
        GrantRejected
    }

    // ----- Constants -----
    uint256 public constant SELF_FUNDED_FEE_BPS = 300; // 3%
    uint256 public constant GRANT_FUNDED_FEE_BPS = 500; // 5%
    uint256 public constant TREASURY_SHARE = 60; // 60% of fee
    uint256 public constant WAVE_POOL_SHARE = 40; // 40% of fee
    uint256 public constant WAVE_EPOCH_DURATION = 30 days;
    uint256 public constant GRANT_VOTING_DURATION = 3 days;
    uint256 public constant EXPERIENCE_UPDATE_COOLDOWN = 1 days;

    uint256 public constant MIN_TASK_AMOUNT = 1e18; // 1 MUSD (18 decimals)
    uint256 public constant MIN_PATRON_DEPOSIT = 50e18; // 50 MUSD
    uint256 public constant GRANT_PASS_THRESHOLD = 70; // 70% of cast votes required to pass
    // Per-wallet cap on veBTC NFTs aggregated in one voteOnGrant() call. Each
    // NFT costs a cross-contract call plus a checkpoint binary search inside
    // getPastVotes, so this bounds worst-case gas. Legitimate holders have no
    // voting-power reason to fragment a position across many NFTs, so 20
    // comfortably covers real holders — revisit with real testnet gas numbers.
    uint256 public constant MAX_VE_NFTS_PER_VOTE = 20;
    // Bounds on the creator-chosen post-approval work window for grant-funded
    // tasks (see applyForGrant). Prevents a 0-length window (instantly
    // expirable) and an unreasonably long one (funds effectively locked
    // indefinitely if the work is never finished).
    uint256 public constant MIN_WORK_DURATION = 1 days;
    uint256 public constant MAX_WORK_DURATION = 180 days;

    uint8 public constant TIER_NEWCOMER = 0;
    uint8 public constant TIER_JUNIOR = 1;
    uint8 public constant TIER_MID = 2;
    uint8 public constant TIER_SENIOR = 3;
    uint8 public constant TIER_EXPERT = 4;

    // Not immutable — see transferOwnership() and TASKIFY_SECURITY_AUDIT.md
    // finding L-2. An immutable owner with no recovery path means losing
    // the deployer key permanently freezes setTreasuryAddress/setVeBTCEscrow/
    // setVeMEZOEscrow/setApprovedVoters forever; this at least allows
    // recovery/rotation (e.g. to a multisig) without a redeploy.
    address public CONTRACT_OWNER;
    address public immutable musd;
    address public immutable mezo;

    // ----- Storage -----
    struct User {
        string username;
        Role role;
        uint8 experienceLevel; // 0-4, contributors only
        uint256 tasksCompleted;
        uint256 totalEarned;
        bool githubVerified;
        uint256 registeredAt;
        uint256 lastExperienceUpdate;
        bool xVerified; // self-declared X (Twitter) link, gates Community task participation client-side
    }

    struct Task {
        address creator;
        string title;
        uint256 amount; // gross amount deposited
        address token;
        uint8 experienceMin; // Community tasks: unused, always 0
        uint8 experienceMax; // Community tasks: unused, always 0
        Status status;
        FundingType fundingType;
        address assignee; // Development only; address(0) = none. Always none for Community.
        uint256 deadline;
        uint256 createdAt;
        TaskKind kind;
        uint8 maxWinners; // Community only; unused (0) for Development
        // Grant-funded only: creator-specified work window, applied to
        // `deadline` when executeGrant() approves the proposal (replaces the
        // old hardcoded WAVE_EPOCH_DURATION). Unused (0) for self-funded
        // tasks, which pass their own absolute deadline at creation instead.
        uint256 workDuration;
        // Self-funded MUSD tasks only: the wave this task's creation credit
        // (waveTotalTasks/waveCreatorTasks) was recorded under, so
        // cancelTask/markExpired can safely reverse that credit — but only
        // if this wave hasn't already been snapshotted by advanceWave(),
        // since a finalized snapshot can never be corrected retroactively.
        // See TASKIFY_SECURITY_AUDIT.md's follow-up findings (F-233656).
        uint256 waveId;
    }

    struct Patron {
        uint256 totalDeposited;
        uint8 tier; // 99 = none, 0=Bronze 1=Silver 2=Gold 3=Diamond
    }

    struct GrantVote {
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        uint256 snapshotTimestamp; // fixed at proposal creation; passed to every getPastVotes call for this proposal
        // Fixed at proposal creation alongside snapshotTimestamp — see
        // TASKIFY_SECURITY_AUDIT.md finding H-1. Without this, veBTCEscrow
        // being owner-mutable at any time would let a malicious/compromised
        // owner momentarily point it at a fabricated-weight contract, have
        // a vote cast against it, then swap back — invisible after the
        // fact. Locking the escrow address per-proposal, the same way the
        // timestamp is locked, closes that window for any already-open vote.
        address escrowAtSnapshot;
        bool executed;
    }

    struct WaveSnapshot {
        uint256 poolAmount;
        uint256 totalTasks;
    }

    mapping(address => User) public users;
    mapping(uint256 => Task) public tasks;
    mapping(uint256 => mapping(address => uint256)) public taskApplicantAppliedAt; // 0 = not applied/joined
    mapping(uint256 => mapping(address => string)) public taskSubmissions; // Community: proof-of-participation link
    mapping(address => Patron) public patrons;
    mapping(uint256 => GrantVote) public grantVotes;
    mapping(uint256 => mapping(address => bool)) public grantVoters;
    mapping(uint256 => WaveSnapshot) public waveSnapshots;
    mapping(uint256 => mapping(address => bool)) public waveClaims;
    mapping(uint256 => mapping(address => uint256)) public waveCreatorTasks;
    // A wave's poolAmount includes fees from approved grants (executeGrant)
    // as well as self-funded tasks, but only self-funded tasks ever
    // increment waveTotalTasks/waveCreatorTasks. A wave that closes with
    // zero self-funded tasks but a nonzero poolAmount (from grant approvals
    // alone) has no possible legitimate claimant under claimWaveReward —
    // see claimStrandedWaveFunds and TASKIFY_SECURITY_AUDIT.md's wave-fees
    // follow-up finding, F-233719.
    mapping(uint256 => bool) public waveStrandedFundsClaimed;

    address public treasuryAddress;
    // Mezo Tigris voting-escrow contracts patron voting weight is read from
    // live — see IMezoVotingEscrow and _votingWeight(). veMEZOEscrow is
    // unused until Mezo deploys veMEZO boost support (see VOTING_SYSTEM_REDESIGN.md).
    address public veBTCEscrow;
    address public veMEZOEscrow;
    // Pilot-phase voter whitelist — voteOnGrant requires
    // approvedVoters[msg.sender] on top of the veBTC-weight check.
    // Deliberately narrows the otherwise-permissionless voting model
    // while the platform is bootstrapping with a small, DevRel-sourced set
    // of real veBTC holders — see VOTING_SYSTEM_REDESIGN.md. Independent of
    // registration role: any registered wallet (Creator or Contributor) can
    // be approved to vote, and any registered wallet can also deposit into
    // the grant pool — see depositToPool.
    mapping(address => bool) public approvedVoters;
    uint256 public nextTaskId = 1;

    uint256 public currentWaveId = 1;
    uint256 public waveStartTime;
    uint256 public wavePoolAmount;
    uint256 public waveTotalTasks;

    uint256 public grantPoolBalance;

    // ----- Events -----
    event UserRegistered(address indexed user, Role role, uint8 experienceLevel);
    event ExperienceUpdated(address indexed user, uint8 newTier);
    event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 amount, address token);
    event GrantApplied(uint256 indexed taskId, address indexed creator, uint256 amount);
    event GrantVoted(uint256 indexed taskId, address indexed voter, bool support, uint256 weight);
    event GrantExecuted(uint256 indexed taskId, bool approved);
    event TaskApplied(uint256 indexed taskId, address indexed contributor);
    event CommunityTaskJoined(uint256 indexed taskId, address indexed participant, string proofUrl);
    event WinnersSelected(uint256 indexed taskId, address[] winners, uint256 perWinnerAmount);
    event TaskAssigned(uint256 indexed taskId, address indexed assignee);
    event TaskStarted(uint256 indexed taskId);
    event TaskSubmitted(uint256 indexed taskId);
    event TaskFundsReleased(uint256 indexed taskId, address indexed assignee, uint256 netAmount);
    event TaskCancelled(uint256 indexed taskId);
    event TaskExpired(uint256 indexed taskId);
    event SubmissionRejected(uint256 indexed taskId, address indexed formerAssignee);
    event WaveAdvanced(uint256 indexed finishedWaveId, uint256 newWaveId);
    event WaveRewardClaimed(uint256 indexed waveId, address indexed creator, uint256 reward);
    event StrandedWaveFundsClaimed(uint256 indexed waveId, uint256 amount);
    event Deposited(address indexed patron, uint256 amount, uint8 newTier);
    event VoterApproved(address indexed voter, bool approved);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address _musd, address _mezo) {
        CONTRACT_OWNER = msg.sender;
        treasuryAddress = msg.sender;
        musd = _musd;
        mezo = _mezo;
        waveStartTime = block.timestamp;
    }

    // ----- Internal helpers -----

    function _calculateTier(uint256 amount) internal pure returns (uint8) {
        if (amount >= 5000e18) return 3; // Diamond
        if (amount >= 1000e18) return 2; // Gold
        if (amount >= 500e18) return 1; // Silver
        if (amount >= 100e18) return 0; // Bronze
        return 99; // None
    }

    /// @dev Aggregates voting weight across every veBTC NFT `account` holds,
    /// as of `snapshotTimestamp`, read from `escrow` specifically (never the
    /// live veBTCEscrow variable directly — callers must pass whichever
    /// escrow address is actually authoritative for their use case; see
    /// getVotingWeight vs. getProposalVotingWeight/voteOnGrant below and
    /// TASKIFY_SECURITY_AUDIT.md finding H-1).
    function _votingWeight(address account, uint256 snapshotTimestamp, address escrow)
        internal
        view
        returns (uint256 weight)
    {
        if (escrow == address(0)) return 0;
        IMezoVotingEscrow ve = IMezoVotingEscrow(escrow);
        uint256 count = ve.balanceOf(account);
        uint256 iterations = count > MAX_VE_NFTS_PER_VOTE ? MAX_VE_NFTS_PER_VOTE : count;
        for (uint256 i = 0; i < iterations; i++) {
            uint256 tokenId = ve.ownerToNFTokenIdList(account, i);
            weight += ve.getPastVotes(account, tokenId, snapshotTimestamp);
        }
    }

    // ----- Read helpers -----

    /// @notice Live veBTC-derived voting weight for `account` as of
    /// `snapshotTimestamp`, read against the *current* veBTCEscrow. This is
    /// a non-binding preview only — an actual vote on a specific proposal
    /// uses that proposal's locked snapshot + escrow (see
    /// getProposalVotingWeight), which can differ from this if veBTCEscrow
    /// has changed since. Frontend should never re-implement this
    /// aggregation client-side — call this directly.
    function getVotingWeight(address account, uint256 snapshotTimestamp) external view returns (uint256) {
        return _votingWeight(account, snapshotTimestamp, veBTCEscrow);
    }

    /// @notice The exact voting weight `account` would use if they voted on
    /// `taskId` right now — reads that proposal's locked snapshotTimestamp
    /// and escrowAtSnapshot, not live values, so this always matches what
    /// voteOnGrant() will actually record for them on this proposal.
    function getProposalVotingWeight(uint256 taskId, address account) external view returns (uint256) {
        GrantVote storage vote = grantVotes[taskId];
        return _votingWeight(account, vote.snapshotTimestamp, vote.escrowAtSnapshot);
    }

    function getCurrentWave()
        external
        view
        returns (uint256 waveId, uint256 startTime, uint256 poolAmount, uint256 totalTasks)
    {
        return (currentWaveId, waveStartTime, wavePoolAmount, waveTotalTasks);
    }

    // ----- User Registration Module -----

    function registerUser(
        string calldata username,
        Role role,
        uint8 experienceLevel,
        bool githubVerified,
        bool xVerified
    ) external {
        if (users[msg.sender].role != Role.None) revert UserAlreadyRegistered();
        if (role != Role.Creator && role != Role.Contributor) revert InvalidRole();
        if (experienceLevel > TIER_EXPERT) revert InvalidExperience();

        users[msg.sender] = User({
            username: username,
            role: role,
            experienceLevel: role == Role.Contributor ? experienceLevel : 0,
            tasksCompleted: 0,
            totalEarned: 0,
            githubVerified: githubVerified,
            registeredAt: block.timestamp,
            lastExperienceUpdate: block.timestamp,
            xVerified: xVerified
        });

        // Every registered wallet, regardless of role, can support the grant
        // pool (depositToPool) — initialize Patron state up front so tier
        // reads "None" (99) rather than Solidity's zero-value default, which
        // would otherwise collide with tier 0 ("Bronze").
        patrons[msg.sender] = Patron({totalDeposited: 0, tier: 99});

        emit UserRegistered(msg.sender, role, experienceLevel);
    }

    /// @notice Lets an already-registered user link/unlink their X account
    /// after the fact, independent of role — Community task eligibility is
    /// gated on this flag, not on Role, so a Contributor can also pick up
    /// social tasks on the same wallet once verified.
    function setXVerified(bool verified) external {
        if (users[msg.sender].role == Role.None) revert UserNotRegistered();
        users[msg.sender].xVerified = verified;
    }

    function updateExperience(uint8 newTier) external {
        User storage user = users[msg.sender];
        if (user.role == Role.None) revert UserNotRegistered();
        if (user.role != Role.Contributor) revert InvalidRole();
        if (newTier > TIER_EXPERT) revert InvalidExperience();
        if (block.timestamp < user.lastExperienceUpdate + EXPERIENCE_UPDATE_COOLDOWN) revert CooldownActive();

        user.experienceLevel = newTier;
        user.lastExperienceUpdate = block.timestamp;

        emit ExperienceUpdated(msg.sender, newTier);
    }

    // ----- Task Escrow Module -----

    /// @dev Pulls `amount` of `token` into escrow and routes the self-funded
    /// fee to treasury/wave-pool. Shared by createTask and createCommunityTask
    /// so the two self-funded creation paths can't drift out of sync.
    function _escrowSelfFunded(address token, uint256 amount) private {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * SELF_FUNDED_FEE_BPS) / 10000;
        if (token == musd) {
            uint256 treasuryFee = (fee * TREASURY_SHARE) / 100;
            uint256 wavePoolFee = fee - treasuryFee;
            IERC20(token).safeTransfer(treasuryAddress, treasuryFee);
            wavePoolAmount += wavePoolFee;
            waveTotalTasks += 1;
            waveCreatorTasks[currentWaveId][msg.sender] += 1;
        } else {
            IERC20(token).safeTransfer(treasuryAddress, fee);
        }
    }

    /// @dev Reverses the wave-creation credit _escrowSelfFunded granted, for
    /// a self-funded MUSD task that's being cancelled or expired without
    /// ever completing — called from cancelTask/markExpired. Only safe to
    /// do while task.waveId is still the live currentWaveId: once
    /// advanceWave() has snapshotted a wave, that snapshot is immutable, so
    /// a cancellation/expiry after the fact has no way to correct it
    /// retroactively — the credit for that already-finalized wave is a
    /// known, permanent (but no longer growing) discrepancy. See
    /// TASKIFY_SECURITY_AUDIT.md's markExpired follow-up findings (F-233656).
    function _reverseWaveCreditIfLive(Task storage task) private {
        if (task.fundingType == FundingType.Self && task.token == musd && task.waveId == currentWaveId) {
            waveTotalTasks -= 1;
            waveCreatorTasks[currentWaveId][task.creator] -= 1;
        }
    }

    function createTask(
        string calldata title,
        uint256 amount,
        address token,
        uint8 experienceMin,
        uint8 experienceMax,
        uint256 deadline
    ) external nonReentrant returns (uint256) {
        User storage user = users[msg.sender];
        if (user.role == Role.None) revert UserNotRegistered();
        if (user.role != Role.Creator) revert InvalidRole();
        if (amount < MIN_TASK_AMOUNT) revert InvalidAmount();
        if (token != musd && token != mezo) revert InvalidToken();
        if (experienceMin > experienceMax) revert InvalidExperience();
        if (experienceMax > TIER_EXPERT) revert InvalidExperience();
        if (deadline <= block.timestamp) revert DeadlinePassed();

        uint256 taskId = nextTaskId;
        _escrowSelfFunded(token, amount);

        tasks[taskId] = Task({
            creator: msg.sender,
            title: title,
            amount: amount,
            token: token,
            experienceMin: experienceMin,
            experienceMax: experienceMax,
            status: Status.Open,
            fundingType: FundingType.Self,
            assignee: address(0),
            deadline: deadline,
            createdAt: block.timestamp,
            kind: TaskKind.Development,
            maxWinners: 0,
            workDuration: 0,
            waveId: currentWaveId
        });

        nextTaskId = taskId + 1;
        emit TaskCreated(taskId, msg.sender, amount, token);
        return taskId;
    }

    /// @notice Creates a Community task — open to any registered user (not
    /// gated by experience tier), paid out to up to `maxWinners` participants
    /// the creator selects via selectWinners, split evenly.
    function createCommunityTask(
        string calldata title,
        uint256 amount,
        address token,
        uint8 maxWinners,
        uint256 deadline
    ) external nonReentrant returns (uint256) {
        User storage user = users[msg.sender];
        if (user.role == Role.None) revert UserNotRegistered();
        if (user.role != Role.Creator) revert InvalidRole();
        if (amount < MIN_TASK_AMOUNT) revert InvalidAmount();
        if (token != musd && token != mezo) revert InvalidToken();
        if (maxWinners == 0 || maxWinners > 20) revert InvalidWinnerCount();
        if (deadline <= block.timestamp) revert DeadlinePassed();

        uint256 taskId = nextTaskId;
        _escrowSelfFunded(token, amount);

        tasks[taskId] = Task({
            creator: msg.sender,
            title: title,
            amount: amount,
            token: token,
            experienceMin: 0,
            experienceMax: 0,
            status: Status.Open,
            fundingType: FundingType.Self,
            assignee: address(0),
            deadline: deadline,
            createdAt: block.timestamp,
            kind: TaskKind.Community,
            maxWinners: maxWinners,
            workDuration: 0,
            waveId: currentWaveId
        });

        nextTaskId = taskId + 1;
        emit TaskCreated(taskId, msg.sender, amount, token);
        return taskId;
    }

    // ----- Grant Pool & Staking Module -----

    /// @notice Deposit MUSD into the shared grant pool. Open to any
    /// registered wallet regardless of role — supporting the pool and voting
    /// on grants (see voteOnGrant) are independent capabilities, not tied to
    /// a specific role.
    function depositToPool(uint256 amount) external nonReentrant {
        if (users[msg.sender].role == Role.None) revert UserNotRegistered();
        Patron storage patron = patrons[msg.sender];
        if (amount < MIN_PATRON_DEPOSIT) revert InvalidAmount();

        IERC20(musd).safeTransferFrom(msg.sender, address(this), amount);

        grantPoolBalance += amount;
        patron.totalDeposited += amount;
        patron.tier = _calculateTier(patron.totalDeposited);

        emit Deposited(msg.sender, amount, patron.tier);
    }

    // ----- Grant Proposal & Voting Module -----

    /// @param workDuration How long the creator gets to complete the work
    /// once (if) the grant is approved — applied to task.deadline at
    /// executeGrant() time, replacing the old hardcoded 30-day
    /// WAVE_EPOCH_DURATION reuse. Creator-chosen, e.g. 7/14/30/60/90 days.
    function applyForGrant(
        string calldata title,
        uint256 amount,
        uint8 experienceMin,
        uint8 experienceMax,
        uint256 workDuration
    ) external returns (uint256) {
        User storage user = users[msg.sender];
        if (user.role == Role.None) revert UserNotRegistered();
        if (user.role != Role.Creator) revert InvalidRole();
        if (amount < MIN_TASK_AMOUNT) revert InvalidAmount();
        if (experienceMin > experienceMax) revert InvalidExperience();
        if (experienceMax > TIER_EXPERT) revert InvalidExperience();
        if (workDuration < MIN_WORK_DURATION || workDuration > MAX_WORK_DURATION) revert InvalidDuration();

        uint256 taskId = nextTaskId;
        uint256 deadline = block.timestamp + GRANT_VOTING_DURATION;

        tasks[taskId] = Task({
            creator: msg.sender,
            title: title,
            amount: amount,
            token: musd,
            experienceMin: experienceMin,
            experienceMax: experienceMax,
            status: Status.GrantPending,
            fundingType: FundingType.Grant,
            assignee: address(0),
            deadline: deadline,
            createdAt: block.timestamp,
            kind: TaskKind.Development,
            maxWinners: 0,
            workDuration: workDuration,
            waveId: currentWaveId
        });

        grantVotes[taskId] = GrantVote({
            votesFor: 0,
            votesAgainst: 0,
            deadline: deadline,
            snapshotTimestamp: block.timestamp,
            escrowAtSnapshot: veBTCEscrow,
            executed: false
        });

        nextTaskId = taskId + 1;
        emit GrantApplied(taskId, msg.sender, amount);
        return taskId;
    }

    function voteOnGrant(uint256 taskId, bool support) external {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        GrantVote storage vote = grantVotes[taskId];
        if (users[msg.sender].role == Role.None) revert NoStake();
        if (!approvedVoters[msg.sender]) revert NotApprovedVoter();

        if (task.status != Status.GrantPending) revert InvalidStatus();
        if (block.timestamp >= vote.deadline) revert VotingClosed();
        if (vote.executed) revert VotingClosed();
        if (grantVoters[taskId][msg.sender]) revert AlreadyVoted();

        uint256 votingWeight = _votingWeight(msg.sender, vote.snapshotTimestamp, vote.escrowAtSnapshot);
        if (votingWeight == 0) revert NoStake();

        grantVoters[taskId][msg.sender] = true;

        if (support) {
            vote.votesFor += votingWeight;
        } else {
            vote.votesAgainst += votingWeight;
        }

        emit GrantVoted(taskId, msg.sender, support, votingWeight);
    }

    function executeGrant(uint256 taskId) external nonReentrant returns (bool) {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        GrantVote storage vote = grantVotes[taskId];

        if (task.status != Status.GrantPending) revert InvalidStatus();
        if (block.timestamp < vote.deadline) revert VotingOpen();
        if (vote.executed) revert VotingClosed();

        vote.executed = true;
        uint256 amount = task.amount;
        uint256 totalVotes = vote.votesFor + vote.votesAgainst;

        // votesFor/votesAgainst are sums of externally-reported veBTC weight
        // (see _votingWeight) — not fully trusted, and not bounded to any
        // realistic magnitude. A plain `votesFor * 100 >= totalVotes * 70`
        // comparison can overflow and revert here if either side gets large
        // enough, and since vote.votesFor is already permanently stored,
        // that revert would repeat on every future call — permanently
        // stuck in GrantPending with no resolution path (see
        // TASKIFY_SECURITY_AUDIT.md's executeGrant follow-up findings,
        // F-233723). Math.mulDiv computes totalVotes * threshold / 100
        // using a wide intermediate, so this can never overflow regardless
        // of how large the vote weights get. Ceil rounding (not the
        // default Floor) is required for this to stay exactly equivalent
        // to the original `votesFor * 100 >= totalVotes * threshold`
        // comparison at non-exact boundaries — e.g. votesFor=7,
        // totalVotes=11 must still fail (7*100=700 < 11*70=770), which only
        // holds with Ceil: votesFor(7) >= ceil(11*70/100)=8 is false, while
        // Floor would wrongly give votesFor(7) >= floor(7.7)=7 → true.
        bool approved =
            totalVotes > 0 && vote.votesFor >= Math.mulDiv(totalVotes, GRANT_PASS_THRESHOLD, 100, Math.Rounding.Ceil);

        if (approved) {
            if (grantPoolBalance < amount) revert InsufficientFunds();
            grantPoolBalance -= amount;

            uint256 fee = (amount * GRANT_FUNDED_FEE_BPS) / 10000;
            uint256 treasuryFee = (fee * TREASURY_SHARE) / 100;
            uint256 wavePoolFee = fee - treasuryFee;

            // All state written before the external transfer below —
            // checks-effects-interactions, defense-in-depth alongside
            // nonReentrant (see TASKIFY_SECURITY_AUDIT.md finding L-1).
            wavePoolAmount += wavePoolFee;
            // Grant-funded tasks do not count toward the creator leaderboard —
            // only self-funded tasks accumulate wave reward credits.

            task.status = Status.Open;
            task.deadline = block.timestamp + task.workDuration;

            IERC20(musd).safeTransfer(treasuryAddress, treasuryFee);
        } else {
            task.status = Status.GrantRejected;
        }

        emit GrantExecuted(taskId, approved);
        return approved;
    }

    // ----- Task Lifecycle Module -----

    function applyForTask(uint256 taskId) external {
        User storage contributor = users[msg.sender];
        if (contributor.role == Role.None) revert UserNotRegistered();
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.kind != TaskKind.Development) revert TaskKindMismatch();

        if (contributor.role != Role.Contributor) revert InvalidRole();
        if (task.status != Status.Open) revert InvalidStatus();
        uint8 exp = contributor.experienceLevel;
        if (exp < task.experienceMin || exp > task.experienceMax) revert ExperienceMismatch();
        if (taskApplicantAppliedAt[taskId][msg.sender] != 0) revert AlreadyApplied();

        taskApplicantAppliedAt[taskId][msg.sender] = block.timestamp;
        emit TaskApplied(taskId, msg.sender);
    }

    function assignTask(uint256 taskId, address assignee) external {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.kind != TaskKind.Development) revert TaskKindMismatch();
        if (task.creator != msg.sender) revert NotAuthorized();
        if (task.status != Status.Open) revert InvalidStatus();
        if (taskApplicantAppliedAt[taskId][assignee] == 0) revert NotApplied();

        task.status = Status.Assigned;
        task.assignee = assignee;

        emit TaskAssigned(taskId, assignee);
    }

    // ----- Community Task Module -----

    /// @notice Any registered user (except the task's own creator) can join a
    /// Community task with a self-declared proof-of-participation link. The
    /// creator reviews submissions off-chain and pays out via selectWinners.
    function joinCommunityTask(uint256 taskId, string calldata proofUrl) external {
        User storage participant = users[msg.sender];
        if (participant.role == Role.None) revert UserNotRegistered();
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.kind != TaskKind.Community) revert TaskKindMismatch();
        if (task.status != Status.Open) revert InvalidStatus();
        if (msg.sender == task.creator) revert NotAuthorized();
        if (block.timestamp >= task.deadline) revert DeadlinePassed();
        if (taskApplicantAppliedAt[taskId][msg.sender] != 0) revert AlreadyApplied();

        taskApplicantAppliedAt[taskId][msg.sender] = block.timestamp;
        taskSubmissions[taskId][msg.sender] = proofUrl;

        emit CommunityTaskJoined(taskId, msg.sender, proofUrl);
    }

    /// @notice Creator picks up to maxWinners addresses (each must have
    /// joined) and the escrowed net amount is split evenly between them in
    /// one transaction; any integer-division remainder goes to the last winner.
    function selectWinners(uint256 taskId, address[] calldata winners) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.kind != TaskKind.Community) revert TaskKindMismatch();
        if (task.creator != msg.sender) revert NotAuthorized();
        if (task.status != Status.Open) revert InvalidStatus();
        if (winners.length == 0 || winners.length > task.maxWinners) revert InvalidWinnerCount();

        for (uint256 i = 0; i < winners.length; i++) {
            if (taskApplicantAppliedAt[taskId][winners[i]] == 0) revert WinnerNotJoined();
            for (uint256 j = i + 1; j < winners.length; j++) {
                if (winners[i] == winners[j]) revert DuplicateWinner();
            }
        }

        uint256 feeBps = task.fundingType == FundingType.Self ? SELF_FUNDED_FEE_BPS : GRANT_FUNDED_FEE_BPS;
        uint256 fee = (task.amount * feeBps) / 10000;
        uint256 netAmount = task.amount - fee;
        uint256 share = netAmount / winners.length;
        uint256 remainder = netAmount - (share * winners.length);
        address token = task.token;

        task.status = Status.FundsReleased;

        for (uint256 i = 0; i < winners.length; i++) {
            uint256 payout = share + (i == winners.length - 1 ? remainder : 0);
            User storage winnerProfile = users[winners[i]];
            winnerProfile.tasksCompleted += 1;
            winnerProfile.totalEarned += payout;
            IERC20(token).safeTransfer(winners[i], payout);
        }

        emit WinnersSelected(taskId, winners, share);
    }

    function startTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.assignee == address(0)) revert InvalidAssignee();
        if (task.assignee != msg.sender) revert NotAuthorized();
        if (task.status != Status.Assigned) revert InvalidStatus();

        task.status = Status.InProgress;
        emit TaskStarted(taskId);
    }

    function submitTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.assignee == address(0)) revert InvalidAssignee();
        if (task.assignee != msg.sender) revert NotAuthorized();
        if (task.status != Status.InProgress) revert InvalidStatus();

        task.status = Status.Submitted;
        emit TaskSubmitted(taskId);
    }

    function approveAndRelease(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.assignee == address(0)) revert InvalidAssignee();
        if (task.creator != msg.sender) revert NotAuthorized();
        if (task.status != Status.Submitted) revert InvalidStatus();

        User storage assigneeProfile = users[task.assignee];
        if (assigneeProfile.role == Role.None) revert UserNotRegistered();

        uint256 feeBps = task.fundingType == FundingType.Self ? SELF_FUNDED_FEE_BPS : GRANT_FUNDED_FEE_BPS;
        uint256 fee = (task.amount * feeBps) / 10000;
        uint256 netAmount = task.amount - fee;
        address assignee = task.assignee;
        address token = task.token;

        task.status = Status.FundsReleased;

        assigneeProfile.tasksCompleted += 1;
        assigneeProfile.totalEarned += netAmount;

        IERC20(token).safeTransfer(assignee, netAmount);

        emit TaskFundsReleased(taskId, assignee, netAmount);
    }

    function cancelTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.creator != msg.sender) revert NotAuthorized();
        if (task.status != Status.Open) revert InvalidStatus();
        if (task.fundingType != FundingType.Self) revert NotAuthorized();

        uint256 fee = (task.amount * SELF_FUNDED_FEE_BPS) / 10000;
        uint256 netAmount = task.amount - fee;
        address creator = task.creator;
        address token = task.token;

        task.status = Status.Cancelled;
        _reverseWaveCreditIfLive(task);

        IERC20(token).safeTransfer(creator, netAmount);
        emit TaskCancelled(taskId);
    }

    /// @notice Expiry is only ever valid before real work exists to protect:
    /// GrantPending is excluded because nothing was ever debited from the
    /// pool for an unexecuted proposal — the only valid resolution for that
    /// is executeGrant(), never an expiry-refund (see
    /// TASKIFY_SECURITY_AUDIT.md's markExpired follow-up findings, F-233716).
    /// Submitted is excluded because a contributor has already delivered
    /// real work by that point — from there the creator must explicitly
    /// approveAndRelease() or rejectSubmission(), never a silent
    /// timeout-refund to the creator (F-233658). So expiry is only reachable
    /// from Open/Assigned/InProgress — before a submission exists, or after
    /// grant funds have already been legitimately committed via
    /// executeGrant() and then abandoned.
    function markExpired(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        Status status = task.status;
        if (
            status != Status.Open && status != Status.Assigned && status != Status.InProgress
        ) revert InvalidStatus();
        if (block.timestamp <= task.deadline) revert DeadlineNotPassed();

        uint256 feeBps = task.fundingType == FundingType.Self ? SELF_FUNDED_FEE_BPS : GRANT_FUNDED_FEE_BPS;
        uint256 fee = (task.amount * feeBps) / 10000;
        uint256 netAmount = task.amount - fee;

        task.status = Status.Expired;
        _reverseWaveCreditIfLive(task);

        if (task.fundingType == FundingType.Self) {
            IERC20(task.token).safeTransfer(task.creator, netAmount);
        } else {
            if (task.token != musd) revert InvalidToken();
            grantPoolBalance += netAmount;
        }

        emit TaskExpired(taskId);
    }

    /// @notice Creator-only alternative to approveAndRelease() for work that
    /// isn't good enough to pay for. Does NOT refund the creator — that
    /// would let a creator reject good work for free and keep the option to
    /// just take the escrow back regardless of merit. Instead the task
    /// reopens exactly as if nobody had been assigned: the escrowed funds
    /// stay locked in the task, a new contributor (or the same one,
    /// reassigned) can pick it up, or it becomes normally expirable again
    /// from Open if nobody does. See TASKIFY_SECURITY_AUDIT.md's
    /// markExpired follow-up findings (F-233658).
    function rejectSubmission(uint256 taskId) external {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.creator != msg.sender) revert NotAuthorized();
        if (task.status != Status.Submitted) revert InvalidStatus();

        address formerAssignee = task.assignee;
        task.status = Status.Open;
        task.assignee = address(0);

        emit SubmissionRejected(taskId, formerAssignee);
    }

    // ----- Wave Rewards Module -----

    /// @notice Permissionless — anyone can advance a wave once its epoch has
    /// genuinely elapsed (see TASKIFY_SECURITY_AUDIT.md finding L-2). This is
    /// a pure time-gated bookkeeping snapshot with no economic decision in
    /// it, so there's no reason it needs to be owner-only; making it
    /// permissionless means wave rewards can never get stuck just because
    /// the owner goes inactive.
    function advanceWave() external {
        if (block.timestamp < waveStartTime + WAVE_EPOCH_DURATION) revert WaveNotFinished();

        waveSnapshots[currentWaveId] = WaveSnapshot({poolAmount: wavePoolAmount, totalTasks: waveTotalTasks});

        uint256 finishedWaveId = currentWaveId;
        currentWaveId += 1;
        waveStartTime = block.timestamp;
        wavePoolAmount = 0;
        waveTotalTasks = 0;

        emit WaveAdvanced(finishedWaveId, currentWaveId);
    }

    function claimWaveReward(uint256 waveId) external nonReentrant returns (uint256) {
        if (waveId >= currentWaveId) revert InvalidWave();
        WaveSnapshot storage snapshot = waveSnapshots[waveId];

        uint256 taskCount = waveCreatorTasks[waveId][msg.sender];
        if (taskCount == 0) revert NoReward();
        if (waveClaims[waveId][msg.sender]) revert AlreadyClaimed();

        uint256 reward = (snapshot.poolAmount * taskCount) / snapshot.totalTasks;
        if (reward == 0) revert NoReward();

        waveClaims[waveId][msg.sender] = true;

        IERC20(musd).safeTransfer(msg.sender, reward);

        emit WaveRewardClaimed(waveId, msg.sender, reward);
        return reward;
    }

    /// @notice Permissionless, same rationale as advanceWave() — a pure
    /// mechanical sweep to a fixed destination (treasuryAddress) with no
    /// economic decision in it, so there's no reason to gate it to the
    /// owner. Only ever moves money that has no possible legitimate
    /// claimant: a wave whose snapshot shows zero self-funded tasks (so
    /// waveCreatorTasks is 0 for literally every address, forever) but a
    /// nonzero poolAmount from grant-approval fees alone. Waves with any
    /// real self-funded tasks are completely untouched by this — those
    /// funds stay reachable only through claimWaveReward by the creators
    /// who actually earned them. See TASKIFY_SECURITY_AUDIT.md's wave-fees
    /// follow-up finding, F-233719.
    function claimStrandedWaveFunds(uint256 waveId) external nonReentrant {
        if (waveId >= currentWaveId) revert InvalidWave();
        WaveSnapshot storage snapshot = waveSnapshots[waveId];
        if (snapshot.totalTasks != 0) revert NotStranded();
        if (waveStrandedFundsClaimed[waveId]) revert AlreadyClaimed();
        if (snapshot.poolAmount == 0) revert NoReward();

        waveStrandedFundsClaimed[waveId] = true;
        uint256 amount = snapshot.poolAmount;

        IERC20(musd).safeTransfer(treasuryAddress, amount);

        emit StrandedWaveFundsClaimed(waveId, amount);
    }

    // ----- Owner Settings -----

    function setTreasuryAddress(address newTreasury) external {
        if (msg.sender != CONTRACT_OWNER) revert NotAuthorized();
        // A zero treasury bricks every fee-bearing flow — standard ERC20
        // transfer() to address(0) reverts, so createTask,
        // createCommunityTask, and grant approval would all start failing
        // until fixed (see TASKIFY_SECURITY_AUDIT.md's setTreasuryAddress
        // follow-up finding, F-233721).
        if (newTreasury == address(0)) revert InvalidTreasury();
        treasuryAddress = newTreasury;
    }

    function setVeBTCEscrow(address _veBTCEscrow) external {
        if (msg.sender != CONTRACT_OWNER) revert NotAuthorized();
        veBTCEscrow = _veBTCEscrow;
    }

    function setVeMEZOEscrow(address _veMEZOEscrow) external {
        if (msg.sender != CONTRACT_OWNER) revert NotAuthorized();
        veMEZOEscrow = _veMEZOEscrow;
    }

    /// @notice Adds or removes addresses from the pilot-phase voter
    /// whitelist. voteOnGrant() requires approvedVoters[msg.sender] in
    /// addition to its existing role + veBTC-weight checks.
    function setApprovedVoters(address[] calldata voters, bool approved) external {
        if (msg.sender != CONTRACT_OWNER) revert NotAuthorized();
        for (uint256 i = 0; i < voters.length; i++) {
            approvedVoters[voters[i]] = approved;
            emit VoterApproved(voters[i], approved);
        }
    }

    /// @notice Moves ownership to a new address — e.g. to a multisig, or to
    /// recover from a compromised/lost key without a full redeploy. See
    /// TASKIFY_SECURITY_AUDIT.md finding L-2.
    function transferOwnership(address newOwner) external {
        if (msg.sender != CONTRACT_OWNER) revert NotAuthorized();
        if (newOwner == address(0)) revert InvalidOwner();
        address previousOwner = CONTRACT_OWNER;
        CONTRACT_OWNER = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
