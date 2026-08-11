// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/// @title Taskify — on-chain bounty board for the Mezo / Bitcoin ecosystem
/// @notice Solidity port of taskify.clar. Same modules, same fee math, same
/// wave-reward and grant-voting logic — MUSD plays the role USDX plays on
/// Stacks, MEZO plays the role STX plays for governance-weight staking.
contract Taskify is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ----- Errors (mirror the ERR-* constants in taskify.clar) -----
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
    error WaveNotFinished();
    error AlreadyClaimed();
    error NoReward();
    error InvalidWave();
    error StakeTooLow();
    error TaskKindMismatch();
    error InvalidWinnerCount();
    error WinnerNotJoined();
    error DuplicateWinner();

    // ----- Enums -----
    enum Role {
        None,
        Creator,
        Contributor,
        Investor
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
    uint256 public constant MIN_MEZO_STAKE = 1e18; // 1 MEZO
    uint256 public constant MIN_PATRON_DEPOSIT = 50e18; // 50 MUSD
    // Applied to raw (18-decimal) wei, so the resulting on-chain weight is
    // large — e.g. 100 MUSD deposited or 1000 MEZO staked each contribute
    // 10,000,000 raw units. That scale never affects vote outcomes (grant
    // approval in executeGrant() is a percentage of votesFor vs. total cast,
    // not an absolute threshold), but it's confusing to display directly.
    // The frontend divides the raw weight by 1e6 for display, which maps
    // back to the "100 MUSD / 1000 MEZO = 10 units" scale these divisors
    // were originally designed around — see lib/taskify.ts's
    // VOTE_WEIGHT_DISPLAY_SCALE.
    uint256 public constant MUSD_VOTE_DIVISOR = 1e13;
    uint256 public constant MEZO_VOTE_DIVISOR = 1e14;
    uint256 public constant GRANT_PASS_THRESHOLD = 70; // 70% of cast votes required to pass

    uint8 public constant TIER_NEWCOMER = 0;
    uint8 public constant TIER_JUNIOR = 1;
    uint8 public constant TIER_MID = 2;
    uint8 public constant TIER_SENIOR = 3;
    uint8 public constant TIER_EXPERT = 4;

    address public immutable CONTRACT_OWNER;
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
    }

    struct Patron {
        uint256 totalDeposited;
        uint256 mezoStaked;
        uint8 tier; // 99 = none, 0=Bronze 1=Silver 2=Gold 3=Diamond
    }

    struct GrantVote {
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
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

    address public treasuryAddress;
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
    event WaveAdvanced(uint256 indexed finishedWaveId, uint256 newWaveId);
    event WaveRewardClaimed(uint256 indexed waveId, address indexed creator, uint256 reward);
    event Deposited(address indexed patron, uint256 amount, uint8 newTier);
    event MezoStaked(address indexed patron, uint256 amount);
    event MezoUnstaked(address indexed patron, uint256 amount);

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

    // ----- Read helpers -----

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
        if (role != Role.Creator && role != Role.Contributor && role != Role.Investor) revert InvalidRole();
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

        if (role == Role.Investor) {
            patrons[msg.sender] = Patron({totalDeposited: 0, mezoStaked: 0, tier: 99});
        }

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
            maxWinners: 0
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
            maxWinners: maxWinners
        });

        nextTaskId = taskId + 1;
        emit TaskCreated(taskId, msg.sender, amount, token);
        return taskId;
    }

    // ----- Grant Pool & Staking Module -----

    function depositToPool(uint256 amount) external nonReentrant {
        if (users[msg.sender].role != Role.Investor) revert UserNotRegistered();
        Patron storage patron = patrons[msg.sender];
        if (amount < MIN_PATRON_DEPOSIT) revert InvalidAmount();

        IERC20(musd).safeTransferFrom(msg.sender, address(this), amount);

        grantPoolBalance += amount;
        patron.totalDeposited += amount;
        patron.tier = _calculateTier(patron.totalDeposited);

        emit Deposited(msg.sender, amount, patron.tier);
    }

    function stakeMezo(uint256 amount) external nonReentrant {
        User storage user = users[msg.sender];
        if (user.role != Role.Investor) revert UserNotRegistered();
        if (amount < MIN_MEZO_STAKE) revert StakeTooLow();

        IERC20(mezo).safeTransferFrom(msg.sender, address(this), amount);

        patrons[msg.sender].mezoStaked += amount;
        emit MezoStaked(msg.sender, amount);
    }

    function unstakeMezo(uint256 amount) external nonReentrant {
        User storage user = users[msg.sender];
        if (user.role != Role.Investor) revert UserNotRegistered();
        Patron storage patron = patrons[msg.sender];
        if (patron.mezoStaked < amount) revert InsufficientFunds();

        patron.mezoStaked -= amount;
        IERC20(mezo).safeTransfer(msg.sender, amount);

        emit MezoUnstaked(msg.sender, amount);
    }

    // ----- Grant Proposal & Voting Module -----

    function applyForGrant(string calldata title, uint256 amount, uint8 experienceMin, uint8 experienceMax)
        external
        returns (uint256)
    {
        User storage user = users[msg.sender];
        if (user.role == Role.None) revert UserNotRegistered();
        if (user.role != Role.Creator) revert InvalidRole();
        if (amount < MIN_TASK_AMOUNT) revert InvalidAmount();
        if (experienceMin > experienceMax) revert InvalidExperience();
        if (experienceMax > TIER_EXPERT) revert InvalidExperience();

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
            maxWinners: 0
        });

        grantVotes[taskId] = GrantVote({votesFor: 0, votesAgainst: 0, deadline: deadline, executed: false});

        nextTaskId = taskId + 1;
        emit GrantApplied(taskId, msg.sender, amount);
        return taskId;
    }

    function voteOnGrant(uint256 taskId, bool support) external {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        GrantVote storage vote = grantVotes[taskId];
        Patron storage patron = patrons[msg.sender];
        if (users[msg.sender].role != Role.Investor) revert NoStake();

        if (task.status != Status.GrantPending) revert InvalidStatus();
        if (block.timestamp >= vote.deadline) revert VotingClosed();
        if (vote.executed) revert VotingClosed();
        if (grantVoters[taskId][msg.sender]) revert AlreadyVoted();

        uint256 votingWeight = (patron.totalDeposited / MUSD_VOTE_DIVISOR) + (patron.mezoStaked / MEZO_VOTE_DIVISOR);
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

        bool approved = totalVotes > 0 && (vote.votesFor * 100) >= (totalVotes * GRANT_PASS_THRESHOLD);

        if (approved) {
            if (grantPoolBalance < amount) revert InsufficientFunds();
            grantPoolBalance -= amount;

            uint256 fee = (amount * GRANT_FUNDED_FEE_BPS) / 10000;
            uint256 treasuryFee = (fee * TREASURY_SHARE) / 100;
            uint256 wavePoolFee = fee - treasuryFee;

            IERC20(musd).safeTransfer(treasuryAddress, treasuryFee);
            wavePoolAmount += wavePoolFee;
            // Grant-funded tasks do not count toward the creator leaderboard —
            // only self-funded tasks accumulate wave reward credits.

            task.status = Status.Open;
            task.deadline = block.timestamp + WAVE_EPOCH_DURATION;
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

        IERC20(token).safeTransfer(creator, netAmount);
        emit TaskCancelled(taskId);
    }

    function markExpired(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        Status status = task.status;
        if (
            status == Status.FundsReleased || status == Status.Cancelled || status == Status.Expired
                || status == Status.GrantRejected
        ) revert InvalidStatus();
        if (block.timestamp <= task.deadline) revert DeadlineNotPassed();

        uint256 feeBps = task.fundingType == FundingType.Self ? SELF_FUNDED_FEE_BPS : GRANT_FUNDED_FEE_BPS;
        uint256 fee = (task.amount * feeBps) / 10000;
        uint256 netAmount = task.amount - fee;

        task.status = Status.Expired;

        if (task.fundingType == FundingType.Self) {
            IERC20(task.token).safeTransfer(task.creator, netAmount);
        } else {
            if (task.token != musd) revert InvalidToken();
            grantPoolBalance += netAmount;
        }

        emit TaskExpired(taskId);
    }

    // ----- Wave Rewards Module -----

    function advanceWave() external {
        if (msg.sender != CONTRACT_OWNER) revert NotAuthorized();
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

    // ----- Owner Settings -----

    function setTreasuryAddress(address newTreasury) external {
        if (msg.sender != CONTRACT_OWNER) revert NotAuthorized();
        treasuryAddress = newTreasury;
    }
}
