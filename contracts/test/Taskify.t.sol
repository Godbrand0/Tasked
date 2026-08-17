// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Taskify} from "../src/Taskify.sol";
import {MockMUSD} from "../src/MockMUSD.sol";
import {MockMEZO} from "../src/MockMEZO.sol";
import {MockVotingEscrow} from "../src/MockVotingEscrow.sol";

/// @notice Solidity port of taskify.test.ts — same lifecycle, same actors,
/// amounts scaled from 6-decimal USDX to 18-decimal MUSD (x 1e12), block
/// heights swapped for block.timestamp warps.
contract TaskifyTest is Test {
    Taskify taskify;
    MockMUSD musd;
    MockMEZO mezo;
    MockVotingEscrow veEscrow;

    address deployer = address(this);
    address alice = makeAddr("alice"); // creator
    address bob = makeAddr("bob"); // contributor (tier 2 / mid)
    address charlie = makeAddr("charlie"); // investor / patron
    address dave = makeAddr("dave"); // contributor (tier 0 / newcomer)

    function setUp() public {
        musd = new MockMUSD();
        mezo = new MockMEZO();
        taskify = new Taskify(address(musd), address(mezo));
        veEscrow = new MockVotingEscrow();
        taskify.setVeBTCEscrow(address(veEscrow));

        // Pilot-phase voter whitelist — charlie is the voting patron in every
        // existing test below, so approve that address once here rather than per test.
        address[] memory initialVoters = new address[](1);
        initialVoters[0] = charlie;
        taskify.setApprovedVoters(initialVoters, true);
    }

    function test_FullProtocolLifecycle() public {
        // -------------------------------------------------------------
        // Step 1: User Registrations
        // -------------------------------------------------------------
        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);

        vm.prank(bob);
        taskify.registerUser("bob", Taskify.Role.Contributor, 2, true, false);

        vm.prank(dave);
        taskify.registerUser("dave", Taskify.Role.Contributor, 0, false, true);

        vm.prank(charlie);
        taskify.registerUser("charlie", Taskify.Role.Investor, 0, false, false);

        (, Taskify.Role bobRole, uint8 bobExp,,,,,,) = taskify.users(bob);
        assertEq(uint8(bobRole), uint8(Taskify.Role.Contributor));
        assertEq(bobExp, 2);

        // -------------------------------------------------------------
        // Step 2: Experience Update Cooldown
        // -------------------------------------------------------------
        vm.prank(bob);
        vm.expectRevert(Taskify.CooldownActive.selector);
        taskify.updateExperience(3);

        vm.warp(block.timestamp + 1 days);

        vm.prank(bob);
        taskify.updateExperience(3);

        (,, bobExp,,,,,,) = taskify.users(bob);
        assertEq(bobExp, 3);

        // -------------------------------------------------------------
        // Step 3: Self-Funded Task Escrow Lifecycle
        // -------------------------------------------------------------
        musd.mint(1000e18, alice);

        vm.startPrank(alice);
        musd.approve(address(taskify), 1000e18);
        uint256 taskId1 = taskify.createTask(
            "Build Taskify UI Components", 1000e18, address(musd), 1, 3, block.timestamp + 2000 days
        );
        vm.stopPrank();
        assertEq(taskId1, 1);

        assertEq(musd.balanceOf(alice), 0);

        address treasury = taskify.treasuryAddress();
        assertEq(musd.balanceOf(treasury), 18e18); // 60% of 3% fee on 1000 MUSD

        (, uint256 waveStart, uint256 poolAmount, uint256 totalTasks) = taskify.getCurrentWave();
        waveStart;
        assertEq(poolAmount, 12e18); // 40% of 3% fee
        assertEq(totalTasks, 1);

        vm.prank(dave);
        vm.expectRevert(Taskify.ExperienceMismatch.selector);
        taskify.applyForTask(taskId1);

        vm.prank(bob);
        taskify.applyForTask(taskId1);

        vm.prank(alice);
        taskify.assignTask(taskId1, bob);

        vm.prank(bob);
        taskify.startTask(taskId1);

        vm.prank(bob);
        taskify.submitTask(taskId1);

        vm.prank(alice);
        taskify.approveAndRelease(taskId1);

        assertEq(musd.balanceOf(bob), 970e18);
    }

    /// @notice Split out from test_FullProtocolLifecycle: the grant-voting
    /// and wave-reward steps have enough locals on their own that combining
    /// them with the dev-task lifecycle in one function tripped a solc
    /// via-ir stack-pressure miscompile (a second `vm.warp` target silently
    /// evaluating wrong). Keeping each phase in its own test function keeps
    /// stack pressure low and sidesteps that class of bug entirely.
    function test_GrantVotingAndWaveRewards() public {
        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        vm.prank(charlie);
        taskify.registerUser("charlie", Taskify.Role.Investor, 0, false, false);

        // Self-funded task so alice earns wave-pool credit (waveCreatorTasks),
        // same role task1 played in test_FullProtocolLifecycle — grant-funded
        // tasks alone (Step 4 below) don't credit the wave pool's task count.
        musd.mint(1000e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 1000e18);
        taskify.createTask("Docs pass", 1000e18, address(musd), 0, 4, block.timestamp + 2000 days);
        vm.stopPrank();

        // -------------------------------------------------------------
        // Step 4: Grant Pool Deposits and Voting
        // -------------------------------------------------------------
        musd.mint(10000e18, charlie);

        vm.startPrank(charlie);
        musd.approve(address(taskify), 5000e18);
        taskify.depositToPool(5000e18);
        vm.stopPrank();

        (uint256 totalDeposited,, uint8 tier) = taskify.patrons(charlie);
        assertEq(tier, 3); // Diamond
        assertEq(totalDeposited, 5000e18);

        // Voting weight now comes from a live veBTC position, not
        // Taskify-custodied MEZO staking — mint charlie a mock veBTC NFT
        // instead of the old stakeMezo() call.
        veEscrow.mint(charlie, 1, 501_000_000);

        vm.prank(alice);
        uint256 taskId2 = taskify.applyForGrant("Build Taskify Rust Parser", 1000e18, 2, 4);
        assertEq(taskId2, 2);

        vm.prank(charlie);
        taskify.voteOnGrant(taskId2, true);

        // voting weight comes straight from the mock veBTC NFT's weight.
        (uint256 votesFor, uint256 votesAgainst,,,) = taskify.grantVotes(taskId2);
        assertEq(votesFor, 501_000_000);
        assertEq(votesAgainst, 0);

        vm.prank(alice);
        vm.expectRevert(Taskify.VotingOpen.selector);
        taskify.executeGrant(taskId2);

        // Warp based on the deadline the contract itself recorded (read back
        // via a view call) rather than the test's own block.timestamp — a
        // solc via-ir stack-pressure bug in this function was observed to
        // desync the test contract's own timestamp reads from the real
        // environment (verified: external calls always saw the correct
        // time; only this contract's local reads went stale).
        (,, uint256 deadline2,,) = taskify.grantVotes(taskId2);
        vm.warp(deadline2 + 1);

        vm.prank(alice);
        bool approved2 = taskify.executeGrant(taskId2);
        assertTrue(approved2);

        (,,,,,, Taskify.Status status2,,,,,,) = taskify.tasks(taskId2);
        assertEq(uint8(status2), uint8(Taskify.Status.Open));

        assertEq(taskify.grantPoolBalance(), 4000e18);

        // 5% fee on 1000 MUSD = 50 MUSD; 40% of that = 20 MUSD wave-pool credit
        // Wave pool: 12e18 (task 1) + 20e18 (task 2) = 32e18.
        // Grant-funded tasks do not increment waveTotalTasks (matches taskify.clar comment).
        (, uint256 waveStart, uint256 poolAmount, uint256 totalTasks) = taskify.getCurrentWave();
        waveStart;
        assertEq(poolAmount, 32e18);
        assertEq(totalTasks, 1);

        // -------------------------------------------------------------
        // Step 5: Grant Proposal Rejection
        // -------------------------------------------------------------
        vm.prank(alice);
        uint256 taskId3 = taskify.applyForGrant("Rejectable Task", 1000e18, 2, 4);
        assertEq(taskId3, 3);

        vm.prank(charlie);
        taskify.voteOnGrant(taskId3, false);

        (,, uint256 deadline3,,) = taskify.grantVotes(taskId3);
        vm.warp(deadline3 + 1);

        vm.prank(alice);
        bool approved3 = taskify.executeGrant(taskId3);
        assertFalse(approved3);

        (,,,,,, Taskify.Status status3,,,,,,) = taskify.tasks(taskId3);
        assertEq(uint8(status3), uint8(Taskify.Status.GrantRejected));

        assertEq(taskify.grantPoolBalance(), 4000e18);

        // -------------------------------------------------------------
        // Step 6: Wave Advancement and Claims
        // -------------------------------------------------------------
        vm.warp(taskify.waveStartTime() + 30 days);

        taskify.advanceWave(); // called by deployer (CONTRACT_OWNER)

        (uint256 snapPool, uint256 snapTasks) = taskify.waveSnapshots(1);
        assertEq(snapPool, 32e18);
        assertEq(snapTasks, 1);

        vm.prank(alice);
        uint256 reward = taskify.claimWaveReward(1);
        assertEq(reward, 32e18);

        assertEq(musd.balanceOf(alice), 32e18);

        vm.prank(alice);
        vm.expectRevert(Taskify.AlreadyClaimed.selector);
        taskify.claimWaveReward(1);
    }

    /// @notice Community tasks: open to any registered role (not just
    /// Contributors, not experience-gated), many people can join, but only
    /// the creator picks winners and the payout splits evenly between them.
    function test_CommunityTaskFlow() public {
        address erin = makeAddr("erin"); // patron who also does social tasks
        address frank = makeAddr("frank"); // joins but isn't picked

        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        vm.prank(bob);
        taskify.registerUser("bob", Taskify.Role.Contributor, 2, true, false); // not X-verified
        vm.prank(dave);
        taskify.registerUser("dave", Taskify.Role.Contributor, 0, false, true); // X-verified
        vm.prank(erin);
        taskify.registerUser("erin", Taskify.Role.Investor, 0, false, true);
        vm.prank(frank);
        taskify.registerUser("frank", Taskify.Role.Contributor, 1, false, true);

        // setXVerified is independent of role and can be toggled after registration
        vm.prank(bob);
        taskify.setXVerified(true);
        (,,,,,,,, bool bobXVerified) = taskify.users(bob);
        assertTrue(bobXVerified);

        musd.mint(500e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 500e18);
        uint256 taskId = taskify.createCommunityTask(
            "Top 3 most creative launch-day memes", 500e18, address(musd), 3, block.timestamp + 7 days
        );
        vm.stopPrank();

        uint256 fee = (500e18 * 300) / 10000; // 3% self-funded fee
        uint256 netAmount = 500e18 - fee;

        // Creator cannot join their own community task.
        vm.prank(alice);
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.joinCommunityTask(taskId, "https://x.com/alice/status/1");

        // A Development-only action can't be used against a Community task.
        vm.prank(bob);
        vm.expectRevert(Taskify.TaskKindMismatch.selector);
        taskify.applyForTask(taskId);

        // Any registered role can join — Contributor, Investor, doesn't matter.
        vm.prank(bob);
        taskify.joinCommunityTask(taskId, "https://x.com/bob/status/1");
        vm.prank(dave);
        taskify.joinCommunityTask(taskId, "https://x.com/dave/status/1");
        vm.prank(erin);
        taskify.joinCommunityTask(taskId, "https://x.com/erin/status/1");
        vm.prank(frank);
        taskify.joinCommunityTask(taskId, "https://x.com/frank/status/1");

        assertEq(taskify.taskSubmissions(taskId, bob), "https://x.com/bob/status/1");

        vm.prank(bob);
        vm.expectRevert(Taskify.AlreadyApplied.selector);
        taskify.joinCommunityTask(taskId, "https://x.com/bob/status/2");

        // Only the creator can select winners.
        address[] memory winners = new address[](2);
        winners[0] = bob;
        winners[1] = dave;
        vm.prank(bob);
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.selectWinners(taskId, winners);

        // Every selected winner must have actually joined.
        address[] memory badWinners = new address[](1);
        badWinners[0] = charlie; // never joined
        vm.prank(alice);
        vm.expectRevert(Taskify.WinnerNotJoined.selector);
        taskify.selectWinners(taskId, badWinners);

        // Can't exceed maxWinners (3).
        address[] memory tooMany = new address[](4);
        tooMany[0] = bob;
        tooMany[1] = dave;
        tooMany[2] = erin;
        tooMany[3] = frank;
        vm.prank(alice);
        vm.expectRevert(Taskify.InvalidWinnerCount.selector);
        taskify.selectWinners(taskId, tooMany);

        // Duplicate winner address rejected.
        address[] memory dupes = new address[](2);
        dupes[0] = bob;
        dupes[1] = bob;
        vm.prank(alice);
        vm.expectRevert(Taskify.DuplicateWinner.selector);
        taskify.selectWinners(taskId, dupes);

        // Real payout: bob + dave + erin split the net amount evenly, frank gets nothing.
        address[] memory finalWinners = new address[](3);
        finalWinners[0] = bob;
        finalWinners[1] = dave;
        finalWinners[2] = erin;
        vm.prank(alice);
        taskify.selectWinners(taskId, finalWinners);

        uint256 share = netAmount / 3;
        uint256 remainder = netAmount - (share * 3);

        assertEq(musd.balanceOf(bob), share);
        assertEq(musd.balanceOf(dave), share);
        assertEq(musd.balanceOf(erin), share + remainder); // last winner absorbs the remainder
        assertEq(musd.balanceOf(frank), 0);

        // User fields: username, role, experienceLevel, tasksCompleted, totalEarned, githubVerified, registeredAt, lastExperienceUpdate, xVerified
        (,,, uint256 daveTasksCompleted, uint256 daveTotalEarned,,,,) = taskify.users(dave);
        assertEq(daveTasksCompleted, 1);
        assertEq(daveTotalEarned, share);

        (,,,,,, Taskify.Status finalStatus,,,,,,) = taskify.tasks(taskId);
        assertEq(uint8(finalStatus), uint8(Taskify.Status.FundsReleased));

        // Task is settled — no more joining or re-selecting winners.
        vm.prank(frank);
        vm.expectRevert(Taskify.InvalidStatus.selector);
        taskify.joinCommunityTask(taskId, "https://x.com/frank/status/2");
    }

    /// @notice Covers the veBTC-derived voting weight itself, independent of
    /// the grant lifecycle already exercised above: multiple NFTs aggregate,
    /// and a zero-position wallet still hits NoStake in voteOnGrant.
    function test_VotingWeightAggregation() public {
        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        vm.prank(charlie);
        taskify.registerUser("charlie", Taskify.Role.Investor, 0, false, false);

        // Zero veBTC position: NoStake, same as the old zero-stake case.
        vm.prank(alice);
        uint256 zeroTaskId = taskify.applyForGrant("Zero-weight probe", 100e18, 0, 4);
        vm.prank(charlie);
        vm.expectRevert(Taskify.NoStake.selector);
        taskify.voteOnGrant(zeroTaskId, true);

        // Multiple veBTC NFTs aggregate into one weight.
        veEscrow.mint(charlie, 10, 300);
        veEscrow.mint(charlie, 11, 700);
        assertEq(taskify.getVotingWeight(charlie, block.timestamp), 1000);

        vm.prank(charlie);
        taskify.voteOnGrant(zeroTaskId, true);
        (uint256 votesFor,,,,) = taskify.grantVotes(zeroTaskId);
        assertEq(votesFor, 1000);
    }

    /// @notice The whole reason voteOnGrant snapshots a fixed timestamp
    /// instead of using block.timestamp at vote-cast time: a patron who
    /// re-locks (grows their position) *after* a proposal opens must still
    /// vote with their pre-proposal weight, not the boosted live weight —
    /// otherwise getPastVotes buys nothing over just reading current state.
    function test_VoteUsesSnapshotWeightNotLiveWeight() public {
        // Anchored to a timestamp captured once, not re-read from
        // block.timestamp between warps — see the via-ir stack-pressure note
        // on test_GrantVotingAndWaveRewards above for why.
        uint256 t0 = block.timestamp;

        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        vm.prank(charlie);
        taskify.registerUser("charlie", Taskify.Role.Investor, 0, false, false);

        veEscrow.mint(charlie, 1, 1000);
        vm.warp(t0 + 1 hours);

        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("Snapshot probe", 100e18, 0, 4);
        (,,, uint256 snapshotTimestamp,) = taskify.grantVotes(taskId);
        vm.warp(t0 + 2 hours);

        // Charlie re-locks after the proposal opened — weight goes 1000 -> 5000.
        veEscrow.reweight(1, 5000);
        assertEq(taskify.getVotingWeight(charlie, block.timestamp), 5000);
        assertEq(taskify.getVotingWeight(charlie, snapshotTimestamp), 1000);

        vm.prank(charlie);
        taskify.voteOnGrant(taskId, true);

        // The cast vote used the snapshot weight (1000), not the live,
        // post-reweight value (5000) — confirms getPastVotes is doing its
        // anti-gaming job through voteOnGrant, not just in isolation.
        (uint256 votesFor,,,,) = taskify.grantVotes(taskId);
        assertEq(votesFor, 1000);
    }

    /// @notice Known limitation, not a bug: veBTC NFT enumeration
    /// (balanceOf/ownerToNFTokenIdList) is live, not historical — only
    /// per-NFT getPastVotes is checkpointed. So if a patron transfers a veBTC
    /// NFT away between a proposal's snapshot and their vote, that NFT's
    /// snapshot-time weight becomes uncastable by either party: the old
    /// owner's aggregation loop no longer enumerates it (it's not in their
    /// live list), and the new owner fails getPastVotes' ownership check for
    /// a timestamp before they owned it. This mirrors how the real Tigris
    /// contracts are shaped — there's no historical enumeration function to
    /// aggregate against instead.
    function test_TransferBetweenSnapshotAndVoteDropsThatNFTsWeight() public {
        // See the t0 note in test_VoteUsesSnapshotWeightNotLiveWeight above.
        uint256 t0 = block.timestamp;

        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        vm.prank(charlie);
        taskify.registerUser("charlie", Taskify.Role.Investor, 0, false, false);
        vm.prank(dave);
        taskify.registerUser("dave", Taskify.Role.Investor, 0, false, false);

        veEscrow.mint(charlie, 10, 300);
        veEscrow.mint(charlie, 11, 700);
        vm.warp(t0 + 1 hours);

        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("Transfer-during-vote probe", 100e18, 0, 4);
        (,,, uint256 snapshotTimestamp,) = taskify.grantVotes(taskId);
        vm.warp(t0 + 2 hours);

        veEscrow.transfer(11, dave);

        // Charlie's live enumeration no longer includes NFT 11 at all, so his
        // vote only carries NFT 10's snapshot weight (300), not the full 1000
        // he actually held as of the snapshot.
        vm.prank(charlie);
        taskify.voteOnGrant(taskId, true);
        (uint256 votesFor,,,,) = taskify.grantVotes(taskId);
        assertEq(votesFor, 300);

        // Dave owns NFT 11 live but didn't as of snapshotTimestamp, so his
        // snapshot-scoped weight for this proposal is 0 — NFT 11's 700 is
        // simply unreachable by anyone once it moves mid-vote.
        assertEq(taskify.getVotingWeight(dave, snapshotTimestamp), 0);
        assertEq(taskify.getVotingWeight(dave, block.timestamp), 700);
    }

    /// @notice A wallet holding more veBTC NFTs than MAX_VE_NFTS_PER_VOTE
    /// (20) only gets the first 20 aggregated — confirms the cap is actually
    /// applied, bounding worst-case gas, rather than being a dead constant.
    function test_VotingWeightCappedAtMaxNFTsPerVote() public {
        vm.prank(charlie);
        taskify.registerUser("charlie", Taskify.Role.Investor, 0, false, false);

        uint256 max = taskify.MAX_VE_NFTS_PER_VOTE();
        for (uint256 i = 0; i < max + 5; i++) {
            veEscrow.mint(charlie, i, 1);
        }

        assertEq(veEscrow.balanceOf(charlie), max + 5);
        assertEq(taskify.getVotingWeight(charlie, block.timestamp), max);
    }

    /// @notice The pilot-phase voter whitelist: a wallet with a real,
    /// nonzero veBTC position and the correct Investor role still can't
    /// vote unless the owner has explicitly approved it. getVotingWeight
    /// itself is untouched by the whitelist — it's a pure read of external
    /// veBTC weight — only the ability to actually cast a vote is gated.
    function test_UnapprovedVoterCannotVoteDespiteRealWeight() public {
        address frank = makeAddr("frankTheUnapprovedWhale");

        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        vm.prank(frank);
        taskify.registerUser("frank", Taskify.Role.Investor, 0, false, false);

        veEscrow.mint(frank, 99, 1_000_000);
        assertEq(taskify.getVotingWeight(frank, block.timestamp), 1_000_000);

        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("Whitelist probe", 100e18, 0, 4);

        vm.prank(frank);
        vm.expectRevert(Taskify.NotApprovedVoter.selector);
        taskify.voteOnGrant(taskId, true);

        // Once the owner approves frank, the exact same vote succeeds.
        address[] memory newlyApproved = new address[](1);
        newlyApproved[0] = frank;
        taskify.setApprovedVoters(newlyApproved, true);

        vm.prank(frank);
        taskify.voteOnGrant(taskId, true);
        (uint256 votesFor,,,,) = taskify.grantVotes(taskId);
        assertEq(votesFor, 1_000_000);
    }
}
