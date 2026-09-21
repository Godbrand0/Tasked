// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Taskify} from "../src/Taskify.sol";
import {MockMUSD} from "../src/MockMUSD.sol";
import {MockMEZO} from "../src/MockMEZO.sol";
import {MockVotingEscrow} from "../src/MockVotingEscrow.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @notice A second, unrelated ERC20 with none of Taskify's payment-token
/// blessing — stands in for a scam/malicious token in the M-1 regression test.
contract RandomToken is MockMUSD {}

/// @notice Malicious IMezoVotingEscrow whose getPastVotes attempts to reenter
/// voteOnGrant on the same proposal, to test whether Taskify.sol's external
/// calls into veBTCEscrow can be abused to double-count a single vote's
/// weight.
///
/// getPastVotes is deliberately NOT declared `view` here — solc's static
/// analysis correctly refuses to compile a `view` function containing a
/// state-modifying-looking low-level `.call()`, so this contract's own
/// declaration has to be honest about that. The actual protection doesn't
/// come from this contract at all: it comes from Taskify calling this
/// function through IMezoVotingEscrow, which declares getPastVotes `view`
/// in the *interface* Taskify uses, so solc emits a STATICCALL at that call
/// site regardless of what the real deployed contract's own function
/// mutability turns out to be. Per EIP-214, every nested call beneath a
/// STATICCALL — even ones made via a plain, non-static low-level `.call()`,
/// as this contract does — inherits the same read-only restriction. So the
/// reentrant call into voteOnGrant() runs inside an inherited static
/// context, and its own SSTORE (grantVoters[...] = true) causes that inner
/// call frame to fail. This contract deliberately ignores that failure
/// (ignores the low-level call's success flag) to prove the outer,
/// legitimate voteOnGrant() call still completes normally with exactly one
/// vote recorded, not that the whole transaction reverts.
contract ReentrantEscrow {
    Taskify public target;
    uint256 public reenterTaskId;
    uint256 public reportedWeight;

    constructor(Taskify _target, uint256 _taskId, uint256 _weight) {
        target = _target;
        reenterTaskId = _taskId;
        reportedWeight = _weight;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 1;
    }

    function ownerToNFTokenIdList(address, uint256) external pure returns (uint256) {
        return 1;
    }

    function getPastVotes(address, uint256, uint256) external returns (uint256) {
        // Deliberately ignore the return value — we only care whether the
        // *outer* vote ends up double-counted, which we check from the test.
        (bool ok,) = address(target).call(abi.encodeWithSignature("voteOnGrant(uint256,bool)", reenterTaskId, true));
        ok; // silence unused-variable warning; we intentionally don't act on it
        return reportedWeight;
    }
}

/// @notice Regression tests for TASKIFY_SECURITY_AUDIT.md. Each test here
/// originally demonstrated a real, working exploit against the pre-fix
/// contract; they're kept (rewritten to assert the fixed behavior) as
/// permanent regression coverage rather than deleted once the underlying
/// bug was fixed.
contract SecurityAuditTest is Test {
    Taskify taskify;
    MockMUSD musd;
    MockMEZO mezo;
    MockVotingEscrow realEscrow;

    address deployer = address(this); // CONTRACT_OWNER
    address alice = makeAddr("alice"); // creator / grant applicant
    address charlie = makeAddr("charlie"); // contributor / patron+voter

    function setUp() public {
        musd = new MockMUSD();
        mezo = new MockMEZO();
        Taskify implementation = new Taskify(address(musd), address(mezo));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), abi.encodeCall(Taskify.initialize, ()));
        taskify = Taskify(address(proxy));
        realEscrow = new MockVotingEscrow();
        taskify.setVeBTCEscrow(address(realEscrow));

        address[] memory approved = new address[](1);
        approved[0] = charlie;
        taskify.setApprovedVoters(approved, true);

        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        vm.prank(charlie);
        taskify.registerUser("charlie", Taskify.Role.Contributor, 0, false, false);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Reentrancy through the external veBTCEscrow call in voteOnGrant().
    // VERIFIED SAFE — see ReentrantEscrow's docstring for why. This test
    // proves it empirically rather than just by reasoning about EIP-214: a
    // single legitimate voteOnGrant() call, backed by a malicious escrow
    // that tries to double-vote via reentrancy, results in exactly one
    // vote's worth of weight recorded — not two. Unlike the other tests in
    // this file, this was never a bug — no fix was needed here.
    // ─────────────────────────────────────────────────────────────────────
    function test_ReentrancyThroughVotingEscrowIsBlocked() public {
        // The malicious escrow has to be in place *before* the proposal
        // opens now that H-1 is fixed (escrowAtSnapshot is locked at
        // applyForGrant time) — this is also the more realistic threat
        // model regardless: a compromised/malicious escrow is dangerous
        // for whatever proposals open while it's active, not just ones
        // opened before it was swapped in.
        ReentrantEscrow malicious = new ReentrantEscrow(taskify, 1, 1000);
        taskify.setVeBTCEscrow(address(malicious));

        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("Reentrancy probe", 100e18, 0, 4, 30 days);
        assertEq(taskId, 1); // must match ReentrantEscrow's hardcoded reenterTaskId

        vm.prank(charlie);
        taskify.voteOnGrant(taskId, true);

        (uint256 votesFor,,,,,) = taskify.grantVotes(taskId);
        // If reentrancy had succeeded, this would be 2000 (voted twice) or
        // revert entirely. Exactly 1000 proves the reentrant attempt failed
        // silently and the legitimate call completed exactly once.
        assertEq(votesFor, 1000);
        assertTrue(taskify.grantVoters(taskId, charlie));
    }

    // ─────────────────────────────────────────────────────────────────────
    // H-1 (fixed): veBTCEscrow used to be read live on every vote, so an
    // owner could momentarily swap it for a fabricated-weight contract,
    // vote, then swap back — invisible after the fact. Now GrantVote locks
    // escrowAtSnapshot at proposal-open time, and every vote on that
    // proposal uses that locked address regardless of what veBTCEscrow is
    // live-set to afterward. This test proves a post-open swap now has zero
    // effect on the vote: charlie's recorded weight is their real weight
    // (1) from the escrow that was live when the proposal opened, not the
    // fabricated weight (1_000_000_000e18) from the escrow swapped in after.
    // ─────────────────────────────────────────────────────────────────────
    function test_EscrowSwapAfterProposalOpenDoesNotAffectVote() public {
        realEscrow.mint(charlie, 1, 1);

        vm.prank(alice);
        uint256 taskId = taskify.applyForGrant("Escrow-swap probe", 100e18, 0, 4, 30 days);

        uint256 weightBefore = taskify.getProposalVotingWeight(taskId, charlie);
        assertEq(weightBefore, 1);

        // --- attempted attack window: owner swaps to a fabricated-weight
        // escrow *after* the proposal has already locked in the real one ---
        MockVotingEscrow fakeEscrow = new MockVotingEscrow();
        fakeEscrow.mint(charlie, 1, 1_000_000_000e18);
        taskify.setVeBTCEscrow(address(fakeEscrow));

        // getVotingWeight (the live-preview read) does reflect the swap —
        // that's expected, it's explicitly documented as a non-binding
        // preview against the *current* escrow, not a proposal-locked one.
        assertEq(taskify.getVotingWeight(charlie, block.timestamp), 1_000_000_000e18);

        // But the weight that actually matters for THIS proposal is
        // unaffected by the swap, because it's locked to escrowAtSnapshot.
        assertEq(taskify.getProposalVotingWeight(taskId, charlie), 1);

        vm.prank(charlie);
        taskify.voteOnGrant(taskId, true);

        (uint256 votesFor,,,,,) = taskify.grantVotes(taskId);
        assertEq(votesFor, 1, "vote must use the locked, real weight - the fabricated escrow swap must have no effect");
    }

    // ─────────────────────────────────────────────────────────────────────
    // M-1 (fixed): createTask/createCommunityTask used to accept any ERC20
    // as the payment token, with no check against musd/mezo. Both now
    // revert InvalidToken() for anything else.
    // ─────────────────────────────────────────────────────────────────────
    function test_CreateTaskRejectsUnapprovedToken() public {
        RandomToken scamToken = new RandomToken();
        scamToken.mint(1000e18, alice);

        vm.startPrank(alice);
        scamToken.approve(address(taskify), 1000e18);

        vm.expectRevert(Taskify.InvalidToken.selector);
        taskify.createTask("Scam-token task", 100e18, address(scamToken), 0, 4, block.timestamp + 7 days);

        vm.expectRevert(Taskify.InvalidToken.selector);
        taskify.createCommunityTask("Scam-token community task", 100e18, address(scamToken), 3, block.timestamp + 7 days);
        vm.stopPrank();

        // musd and mezo both still work, unaffected by the new check.
        musd.mint(1000e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 1000e18);
        uint256 taskId = taskify.createTask("Real task", 100e18, address(musd), 0, 4, block.timestamp + 7 days);
        vm.stopPrank();
        assertEq(taskId, 1);
    }

    // ─────────────────────────────────────────────────────────────────────
    // L-2 (fixed): CONTRACT_OWNER used to be immutable with no recovery
    // path. transferOwnership() now allows rotation (e.g. to a multisig, or
    // recovering from a compromised key) without a redeploy.
    // ─────────────────────────────────────────────────────────────────────
    //
    // SECURITY-REVIEW-2026-09-15 finding 2 (fixed): the transfer is now
    // two-step, so ownership only moves once the new address has proven it
    // can sign by calling acceptOwnership().
    // ─────────────────────────────────────────────────────────────────────
    function test_OwnershipCanBeTransferred() public {
        address newOwner = makeAddr("multisig");

        vm.prank(alice); // not the owner
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.transferOwnership(newOwner);

        taskify.transferOwnership(newOwner);
        assertEq(taskify.pendingOwner(), newOwner);
        // Proposing moves nothing — the current owner keeps full control.
        assertEq(taskify.CONTRACT_OWNER(), deployer);
        taskify.setTreasuryAddress(deployer);

        vm.prank(newOwner);
        taskify.acceptOwnership();
        assertEq(taskify.CONTRACT_OWNER(), newOwner);
        assertEq(taskify.pendingOwner(), address(0));

        // Old owner has lost all owner-gated access immediately.
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.setTreasuryAddress(alice);

        // New owner has it.
        vm.prank(newOwner);
        taskify.setTreasuryAddress(alice);
        assertEq(taskify.treasuryAddress(), alice);
    }

    function test_TransferOwnershipRejectsZeroAddress() public {
        vm.expectRevert(Taskify.InvalidOwner.selector);
        taskify.transferOwnership(address(0));
    }

    /// @notice A typo'd or undeployed destination can never take ownership,
    /// and the current owner can simply re-propose to replace it.
    function test_OnlyPendingOwnerCanAcceptOwnership() public {
        address typo = makeAddr("typo");
        address multisig = makeAddr("multisig");

        // Nobody can accept when nothing is pending.
        vm.prank(alice);
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.acceptOwnership();

        taskify.transferOwnership(typo);

        vm.prank(alice);
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.acceptOwnership();

        // Re-proposing replaces the mistaken address.
        taskify.transferOwnership(multisig);
        vm.prank(typo);
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.acceptOwnership();
        assertEq(taskify.CONTRACT_OWNER(), deployer);

        vm.prank(multisig);
        taskify.acceptOwnership();
        assertEq(taskify.CONTRACT_OWNER(), multisig);

        // Acceptance clears the pending slot, so it can't be replayed.
        vm.prank(multisig);
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.acceptOwnership();
    }

    // ─────────────────────────────────────────────────────────────────────
    // SECURITY-REVIEW-2026-09-15 finding 4 (fixed): floor division in
    // claimWaveReward used to strand the remainder permanently. The claim
    // that completes a wave's task count now takes whatever is left.
    // ─────────────────────────────────────────────────────────────────────
    function test_WaveRewardsDrainPoolExactly() public {
        address bob = makeAddr("bob");
        vm.prank(bob);
        taskify.registerUser("bob", Taskify.Role.Creator, 0, true, false);

        // The review's PoC amounts: pool 36000000000000001 over 3 tasks.
        _createFundedTask(alice, 1e18);
        _createFundedTask(alice, 1e18);
        _createFundedTask(bob, 1e18 + 34);

        vm.warp(taskify.waveStartTime() + taskify.WAVE_EPOCH_DURATION());
        taskify.advanceWave();
        (uint256 poolAmount, uint256 totalTasks) = taskify.waveSnapshots(1);
        assertEq(poolAmount, 36000000000000001);
        assertEq(totalTasks, 3);

        vm.prank(alice);
        uint256 aliceReward = taskify.claimWaveReward(1);
        vm.prank(bob);
        uint256 bobReward = taskify.claimWaveReward(1);

        assertEq(aliceReward, 24000000000000000); // floor(pool * 2 / 3)
        assertEq(bobReward, 12000000000000001); // floor share + 1 wei remainder
        assertEq(aliceReward + bobReward, poolAmount);
    }

    /// @notice Whatever the task amounts and claim order, a wave's claims
    /// always sum to exactly its snapshotted pool — never less (stranded
    /// dust) and never more (eating into task escrow).
    function testFuzz_WaveRewardsSumToPool(uint96[3] memory rawAmounts, bool bobClaimsFirst) public {
        address bob = makeAddr("bob");
        vm.prank(bob);
        taskify.registerUser("bob", Taskify.Role.Creator, 0, true, false);

        _createFundedTask(alice, bound(rawAmounts[0], 1e18, 1e27));
        _createFundedTask(bob, bound(rawAmounts[1], 1e18, 1e27));
        _createFundedTask(alice, bound(rawAmounts[2], 1e18, 1e27));

        vm.warp(taskify.waveStartTime() + taskify.WAVE_EPOCH_DURATION());
        taskify.advanceWave();
        (uint256 poolAmount,) = taskify.waveSnapshots(1);

        (address first, address second) = bobClaimsFirst ? (bob, alice) : (alice, bob);
        vm.prank(first);
        uint256 total = taskify.claimWaveReward(1);
        vm.prank(second);
        total += taskify.claimWaveReward(1);

        assertEq(total, poolAmount);
        assertEq(taskify.waveClaimedAmount(1), poolAmount);
    }

    function _createFundedTask(address creator, uint256 amount) private {
        musd.mint(amount, creator);
        vm.startPrank(creator);
        musd.approve(address(taskify), amount);
        taskify.createTask("Wave task", amount, address(musd), 0, 4, block.timestamp + 7 days);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────
    // L-2 (fixed): advanceWave() used to be owner-only, so an inactive
    // owner would permanently freeze wave-reward snapshotting. It's now
    // permissionless, gated only by the epoch actually having elapsed.
    // ─────────────────────────────────────────────────────────────────────
    function test_AdvanceWaveIsPermissionless() public {
        vm.warp(taskify.waveStartTime() + 30 days);

        vm.prank(alice); // not the owner, not previously possible
        taskify.advanceWave();

        assertEq(taskify.currentWaveId(), 2);
    }
}
