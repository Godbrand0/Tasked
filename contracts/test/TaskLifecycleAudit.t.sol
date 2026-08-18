// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Taskify} from "../src/Taskify.sol";
import {MockMUSD} from "../src/MockMUSD.sol";
import {MockMEZO} from "../src/MockMEZO.sol";
import {MockVotingEscrow} from "../src/MockVotingEscrow.sol";

/// @notice Regression tests for the task-lifecycle findings surfaced by an
/// external automated scan — separate from the internal review in
/// TASKIFY_SECURITY_AUDIT.md.
///
/// F-233656, F-233658, F-233716, F-233717 all trace back to
/// markExpired()'s status-exclusion list being wrong: GrantPending and
/// Submitted were both expirable, letting expiry fabricate grantPoolBalance
/// out of thin air (F-233716) and steal already-delivered work from
/// contributors (F-233658). Fixing that list closes F-233717 too (there was
/// never a need for hard deadline checks on start/submit/approve — the fix
/// is entirely about what markExpired is allowed to touch). F-233656
/// (cancelled/expired tasks retaining wave credit) is a related but
/// independent bug in the same area, fixed alongside it.
///
/// F-233719, F-233721, and F-233723 are three separate, unrelated findings
/// from the same scan, fixed in the same round: stranded grant-only wave
/// fees, a missing zero-address guard on the treasury setter, and an
/// integer-overflow DoS in executeGrant's pass/fail comparison.
contract TaskLifecycleAuditTest is Test {
    Taskify taskify;
    MockMUSD musd;
    MockMEZO mezo;
    MockVotingEscrow veEscrow;

    address deployer = address(this);
    address alice = makeAddr("alice"); // creator
    address bob = makeAddr("bob"); // contributor
    address charlie = makeAddr("charlie"); // investor / patron+voter

    function setUp() public {
        musd = new MockMUSD();
        mezo = new MockMEZO();
        taskify = new Taskify(address(musd), address(mezo));
        veEscrow = new MockVotingEscrow();
        taskify.setVeBTCEscrow(address(veEscrow));

        address[] memory approved = new address[](1);
        approved[0] = charlie;
        taskify.setApprovedVoters(approved, true);

        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        vm.prank(bob);
        taskify.registerUser("bob", Taskify.Role.Contributor, 0, true, false);
        vm.prank(charlie);
        taskify.registerUser("charlie", Taskify.Role.Investor, 0, false, false);
    }

    function _getStatus(uint256 taskId) internal view returns (Taskify.Status) {
        (,,,,,, Taskify.Status status,,,,,,,,) = taskify.tasks(taskId);
        return status;
    }

    // ─────────────────────────────────────────────────────────────────────
    // F-233716 (fixed): a never-executed grant proposal could be
    // markExpired()'d instead of executeGrant()'d, fabricating
    // grantPoolBalance for an amount that was never actually debited from
    // it — permissionless, zero-cost, no privileged access required.
    // ─────────────────────────────────────────────────────────────────────
    function test_PendingGrantCannotBeExpired() public {
        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("Unexecuted grant", 1_000_000e18, 0, 4, 30 days);

        (,, uint256 votingDeadline,,,) = taskify.grantVotes(taskId);
        vm.warp(votingDeadline + 1);

        uint256 poolBalanceBefore = taskify.grantPoolBalance();
        vm.expectRevert(Taskify.InvalidStatus.selector);
        taskify.markExpired(taskId);

        // Nothing was fabricated — balance is exactly what it was before the
        // attempt (zero here, since nobody ever deposited).
        assertEq(taskify.grantPoolBalance(), poolBalanceBefore);
        assertEq(uint8(_getStatus(taskId)), uint8(Taskify.Status.GrantPending));

        // The only valid resolution is executeGrant() — still works fine.
        vm.prank(alice);
        bool approved = taskify.executeGrant(taskId);
        assertFalse(approved); // nobody voted
        assertEq(uint8(_getStatus(taskId)), uint8(Taskify.Status.GrantRejected));
    }

    // ─────────────────────────────────────────────────────────────────────
    // F-233658 (fixed): once work is Submitted, markExpired() used to be
    // able to refund the *creator* instead of paying the contributor who
    // already delivered. Now Submitted is excluded — the task stays
    // resolvable by the creator (approve or reject) regardless of deadline.
    // ─────────────────────────────────────────────────────────────────────
    function test_SubmittedWorkCannotBeExpired() public {
        musd.mint(1000e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 1000e18);
        uint256 taskId = taskify.createTask("Fix a bug", 1000e18, address(musd), 0, 4, block.timestamp + 7 days);
        vm.stopPrank();

        vm.prank(bob);
        taskify.applyForTask(taskId);
        vm.prank(alice);
        taskify.assignTask(taskId, bob);
        vm.prank(bob);
        taskify.startTask(taskId);
        vm.prank(bob);
        taskify.submitTask(taskId);

        // Deadline passes before the creator gets around to approving.
        vm.warp(block.timestamp + 8 days);

        vm.expectRevert(Taskify.InvalidStatus.selector);
        taskify.markExpired(taskId);

        // The creator can still approve and pay bob, deadline notwithstanding.
        vm.prank(alice);
        taskify.approveAndRelease(taskId);
        assertEq(musd.balanceOf(bob), 970e18); // 1000 - 3% fee
        assertEq(uint8(_getStatus(taskId)), uint8(Taskify.Status.FundsReleased));
    }

    // ─────────────────────────────────────────────────────────────────────
    // rejectSubmission: the creator's real alternative to letting bad work
    // sit forever or (pre-fix) being able to expire-refund it. Confirms the
    // escrow stays locked in the task (not refunded to the creator) and the
    // task genuinely reopens for someone else to complete.
    // ─────────────────────────────────────────────────────────────────────
    function test_RejectSubmissionReopensTaskWithoutRefundingCreator() public {
        address dave = makeAddr("dave");
        vm.prank(dave);
        taskify.registerUser("dave", Taskify.Role.Contributor, 0, false, false);

        musd.mint(1000e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 1000e18);
        uint256 taskId = taskify.createTask("Fix a bug", 1000e18, address(musd), 0, 4, block.timestamp + 30 days);
        vm.stopPrank();

        vm.prank(bob);
        taskify.applyForTask(taskId);
        vm.prank(alice);
        taskify.assignTask(taskId, bob);
        vm.prank(bob);
        taskify.startTask(taskId);
        vm.prank(bob);
        taskify.submitTask(taskId);

        uint256 contractBalanceBefore = musd.balanceOf(address(taskify));

        // Only the creator can reject, and only while Submitted.
        vm.prank(bob);
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.rejectSubmission(taskId);

        vm.prank(alice);
        taskify.rejectSubmission(taskId);

        assertEq(uint8(_getStatus(taskId)), uint8(Taskify.Status.Open));
        (,,,,,,,, address assignee,,,,,,) = taskify.tasks(taskId);
        assertEq(assignee, address(0));

        // Bob got nothing, and — critically — neither did alice. The escrow
        // is still fully sitting in the contract.
        assertEq(musd.balanceOf(bob), 0);
        assertEq(musd.balanceOf(address(taskify)), contractBalanceBefore);

        // Can't reject twice.
        vm.prank(alice);
        vm.expectRevert(Taskify.InvalidStatus.selector);
        taskify.rejectSubmission(taskId);

        // A different contributor can now pick up the reopened task, and
        // this time gets paid normally — proving the funds were genuinely
        // still there, not phantom.
        vm.prank(dave);
        taskify.applyForTask(taskId);
        vm.prank(alice);
        taskify.assignTask(taskId, dave);
        vm.prank(dave);
        taskify.startTask(taskId);
        vm.prank(dave);
        taskify.submitTask(taskId);
        vm.prank(alice);
        taskify.approveAndRelease(taskId);

        assertEq(musd.balanceOf(dave), 970e18);
    }

    // ─────────────────────────────────────────────────────────────────────
    // workDuration: grant-funded tasks now use a creator-chosen post-
    // approval work window instead of a hardcoded 30 days.
    // ─────────────────────────────────────────────────────────────────────
    function test_GrantApprovalUsesCreatorChosenWorkDuration() public {
        vm.expectRevert(Taskify.InvalidDuration.selector);
        vm.prank(alice);
        taskify.applyForGrant("Zero duration", 100e18, 0, 4, 0);

        vm.expectRevert(Taskify.InvalidDuration.selector);
        vm.prank(alice);
        taskify.applyForGrant("Absurd duration", 100e18, 0, 4, 181 days);

        // Fund the pool so the grant can actually be paid out.
        musd.mint(1000e18, charlie);
        vm.startPrank(charlie);
        musd.approve(address(taskify), 1000e18);
        taskify.depositToPool(1000e18);
        vm.stopPrank();

        veEscrow.mint(charlie, 1, 100);

        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("14-day grant", 100e18, 0, 4, 14 days);

        vm.prank(charlie);
        taskify.voteOnGrant(taskId, true);

        (,, uint256 votingDeadline,,,) = taskify.grantVotes(taskId);
        vm.warp(votingDeadline + 1);

        vm.prank(alice);
        bool approved = taskify.executeGrant(taskId);
        assertTrue(approved);

        (,,,,,,,,, uint256 taskDeadline,,,,,) = taskify.tasks(taskId);
        assertEq(taskDeadline, block.timestamp + 14 days); // not the old hardcoded 30 days
    }

    // ─────────────────────────────────────────────────────────────────────
    // F-233656 (fixed): cancelling (or expiring) a self-funded MUSD task
    // used to permanently retain the wave credit it was granted at creation,
    // letting a creator inflate their share of the wave-reward pool by
    // create-then-cancel spamming. Now reversed — but only while the task's
    // wave is still live; a snapshot already taken by advanceWave() can't be
    // corrected retroactively (see _reverseWaveCreditIfLive's docstring).
    // ─────────────────────────────────────────────────────────────────────
    function test_CancelTaskReversesWaveCreditWithinSameWave() public {
        musd.mint(1000e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 1000e18);
        uint256 taskId = taskify.createTask("Spammy task", 100e18, address(musd), 0, 4, block.timestamp + 7 days);
        vm.stopPrank();

        (,, uint256 poolAfterCreate, uint256 totalAfterCreate) = taskify.getCurrentWave();
        assertEq(totalAfterCreate, 1);
        assertGt(poolAfterCreate, 0);

        vm.prank(alice);
        taskify.cancelTask(taskId);

        (,, uint256 poolAfterCancel, uint256 totalAfterCancel) = taskify.getCurrentWave();
        assertEq(totalAfterCancel, 0, "wave task count must be reversed on cancel");
        assertEq(poolAfterCancel, poolAfterCreate, "the fee itself is not refunded, only the task-count credit");
    }

    function test_MarkExpiredAlsoReversesWaveCreditWithinSameWave() public {
        musd.mint(1000e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 1000e18);
        uint256 taskId = taskify.createTask("Never applied", 100e18, address(musd), 0, 4, block.timestamp + 1 days);
        vm.stopPrank();

        (,,, uint256 totalAfterCreate) = taskify.getCurrentWave();
        assertEq(totalAfterCreate, 1);

        vm.warp(block.timestamp + 2 days);
        taskify.markExpired(taskId);

        (,,, uint256 totalAfterExpire) = taskify.getCurrentWave();
        assertEq(totalAfterExpire, 0);
    }

    /// @dev Documents the known, accepted limitation: once a wave has been
    /// snapshotted, a later cancellation of a task from that wave can't
    /// retroactively fix the now-immutable snapshot — so the guard
    /// correctly does nothing in that case rather than corrupting the *new*
    /// wave's live counters.
    function test_CancelTaskDoesNotCorruptANewerWaveAfterAdvance() public {
        musd.mint(2000e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 2000e18);
        uint256 taskId = taskify.createTask("Old-wave task", 100e18, address(musd), 0, 4, block.timestamp + 60 days);
        vm.stopPrank();

        vm.warp(taskify.waveStartTime() + 30 days);
        taskify.advanceWave();

        // A second task, created fresh in the new (now-current) wave.
        vm.startPrank(alice);
        taskify.createTask("New-wave task", 100e18, address(musd), 0, 4, block.timestamp + 60 days);
        vm.stopPrank();
        (,,, uint256 totalBeforeCancel) = taskify.getCurrentWave();
        assertEq(totalBeforeCancel, 1); // only the new-wave task counts live

        // Cancelling the OLD task (from the already-snapshotted wave) must
        // not touch the new wave's live counter at all.
        vm.prank(alice);
        taskify.cancelTask(taskId);

        (,,, uint256 totalAfterCancel) = taskify.getCurrentWave();
        assertEq(totalAfterCancel, 1, "cancelling a task from an already-snapshotted wave must not affect the live wave");
    }

    // ─────────────────────────────────────────────────────────────────────
    // F-233723 (fixed): votesFor/votesAgainst come from externally-reported,
    // not-fully-trusted veBTC weight — a large enough value used to overflow
    // executeGrant's `votesFor * 100 >= totalVotes * 70` comparison and
    // revert permanently (vote.votesFor is already stored, so every future
    // call hits the same overflow). Now uses Math.mulDiv with Ceil
    // rounding, which can't overflow and stays exactly equivalent to the
    // original comparison — verified two ways: a magnitude that would have
    // overflowed the old code, and a boundary case that used to expose an
    // off-by-one in an earlier (floor-rounded) attempt at this same fix.
    // ─────────────────────────────────────────────────────────────────────
    function test_ExecuteGrantHandlesOverflowMagnitudeWeight() public {
        musd.mint(1000e18, charlie);
        vm.startPrank(charlie);
        musd.approve(address(taskify), 1000e18);
        taskify.depositToPool(1000e18);
        vm.stopPrank();

        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("Huge weight probe", 100e18, 0, 4, 30 days);

        // Large enough that the old `votesFor * 100` would overflow
        // uint256 (type(uint256).max / 100 is the overflow threshold).
        uint256 hugeWeight = type(uint256).max / 50;
        veEscrow.mint(charlie, 1, hugeWeight);

        vm.prank(charlie);
        taskify.voteOnGrant(taskId, true);

        (,, uint256 deadline,,,) = taskify.grantVotes(taskId);
        vm.warp(deadline + 1);

        // Must not revert, and must correctly approve (100% support).
        bool approved = taskify.executeGrant(taskId);
        assertTrue(approved);
    }

    /// @dev Same boundary case used to verify the fix's math by hand:
    /// votesFor=7, votesAgainst=4 (totalVotes=11) must fail — 7*100=700 <
    /// 11*70=770. A naive Math.mulDiv rewrite using the default Floor
    /// rounding gets this wrong (floor(11*70/100)=7, so 7>=7 would
    /// incorrectly pass); only Ceil rounding reproduces the original
    /// integer comparison exactly.
    function test_ExecuteGrantBoundaryRoundingMatchesOriginalSemantics() public {
        address dave = makeAddr("daveVoter");
        vm.prank(dave);
        taskify.registerUser("dave", Taskify.Role.Investor, 0, false, false);
        address[] memory approved = new address[](1);
        approved[0] = dave;
        taskify.setApprovedVoters(approved, true);

        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("Boundary probe", 100e18, 0, 4, 30 days);

        veEscrow.mint(charlie, 1, 7);
        veEscrow.mint(dave, 2, 4);

        vm.prank(charlie);
        taskify.voteOnGrant(taskId, true);
        vm.prank(dave);
        taskify.voteOnGrant(taskId, false);

        (uint256 votesFor, uint256 votesAgainst,,,,) = taskify.grantVotes(taskId);
        assertEq(votesFor, 7);
        assertEq(votesAgainst, 4);

        (,, uint256 deadline,,,) = taskify.grantVotes(taskId);
        vm.warp(deadline + 1);

        bool wasApproved = taskify.executeGrant(taskId);
        assertFalse(wasApproved, "7/11 = 63.6% support must fail a 70% threshold");
    }

    // ─────────────────────────────────────────────────────────────────────
    // F-233721 (fixed): setTreasuryAddress had no zero-address guard — a
    // zero treasury would brick every fee-bearing flow, since standard
    // ERC20 transfer() to address(0) reverts.
    // ─────────────────────────────────────────────────────────────────────
    function test_SetTreasuryAddressRejectsZeroAddress() public {
        address originalTreasury = taskify.treasuryAddress();

        vm.expectRevert(Taskify.InvalidTreasury.selector);
        taskify.setTreasuryAddress(address(0));

        assertEq(taskify.treasuryAddress(), originalTreasury);
    }

    // ─────────────────────────────────────────────────────────────────────
    // F-233719 (fixed): a wave that closes with zero self-funded tasks but
    // nonzero poolAmount (from grant-approval fees alone) has no possible
    // legitimate claimant under claimWaveReward — waveCreatorTasks is 0 for
    // everyone, forever. claimStrandedWaveFunds sweeps exactly that case to
    // treasury, and only that case.
    // ─────────────────────────────────────────────────────────────────────
    function test_StrandedGrantOnlyWaveFundsAreClaimableByTreasury() public {
        // Fund the pool and get a grant approved — no self-funded tasks
        // exist this wave at all, so waveTotalTasks stays 0 throughout.
        musd.mint(1000e18, charlie);
        vm.startPrank(charlie);
        musd.approve(address(taskify), 1000e18);
        taskify.depositToPool(1000e18);
        vm.stopPrank();

        veEscrow.mint(charlie, 1, 100);

        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("Wave-fee probe", 100e18, 0, 4, 30 days);
        vm.prank(charlie);
        taskify.voteOnGrant(taskId, true);

        (,, uint256 votingDeadline,,,) = taskify.grantVotes(taskId);
        vm.warp(votingDeadline + 1);
        taskify.executeGrant(taskId);

        (,, uint256 poolBeforeAdvance, uint256 totalBeforeAdvance) = taskify.getCurrentWave();
        assertGt(poolBeforeAdvance, 0, "grant approval fee must have funded the wave pool");
        assertEq(totalBeforeAdvance, 0, "no self-funded tasks existed this wave");

        vm.warp(taskify.waveStartTime() + 30 days);
        taskify.advanceWave();

        address treasury = taskify.treasuryAddress();
        uint256 treasuryBalanceBefore = musd.balanceOf(treasury);

        taskify.claimStrandedWaveFunds(1);

        assertEq(musd.balanceOf(treasury), treasuryBalanceBefore + poolBeforeAdvance);

        // Can't double-claim.
        vm.expectRevert(Taskify.AlreadyClaimed.selector);
        taskify.claimStrandedWaveFunds(1);
    }

    /// @dev A wave with real self-funded tasks must never be sweepable this
    /// way, even permissionlessly — those funds belong to the creators who
    /// earned them via claimWaveReward, not to the treasury.
    function test_ClaimStrandedWaveFundsRejectsWaveWithRealClaimants() public {
        musd.mint(1000e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 1000e18);
        taskify.createTask("Real task", 100e18, address(musd), 0, 4, block.timestamp + 7 days);
        vm.stopPrank();

        vm.warp(taskify.waveStartTime() + 30 days);
        taskify.advanceWave();

        vm.expectRevert(Taskify.NotStranded.selector);
        taskify.claimStrandedWaveFunds(1);
    }
}
