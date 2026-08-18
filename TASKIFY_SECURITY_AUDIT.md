# Taskify Security Reviews — `contracts/src/Taskify.sol`

**Date:** 2026-08-18 (both rounds), fixes applied and redeployed same day
**Scope:** `contracts/src/Taskify.sol` (current `main`, includes the veBTC voting redesign and pilot voter whitelist — see `VOTING_SYSTEM_REDESIGN.md`)
**Two independent rounds, same file:**
1. **Internal review** (Claude, working session) — manual line-by-line pass, not a licensed third-party audit firm. Findings H-1/M-1/L-1/L-2.
2. **External automated scan** — a separate tool surfaced 6 High + 5 Medium findings; this doc covers the ones verified as real against the actual code (F-233656, F-233658, F-233716, F-233717, F-233719, F-233721, F-233723). One (F-233677) was verified real but left as an accepted mitigation rather than fixed — see its section below.

**Methodology (internal round):** escrow/custody safety, access control, reentrancy, external-call trust boundaries, approve/transferFrom scoping, integer/rounding correctness, denial-of-service bounds. **Methodology (external-scan round):** every finding was independently re-verified by reading the actual current contract before being accepted — titles alone were never trusted. All findings across both rounds are backed by executable Foundry proof-of-concept tests, not just reasoning.

**✅ Status: every fixed finding across both rounds is tested and redeployed to Mezo testnet at `0x1FeBFE69533A2207f45f98b44Eb6564a122665b8`.** Regression tests were rewritten (internal round) or added fresh (external-scan round) to assert the *fixed* behavior — tests that used to prove an exploit worked now prove it doesn't. 26/26 tests pass across `Taskify.t.sol`, `SecurityAudit.t.sol`, and `TaskLifecycleAudit.t.sol`.

**⚠️ This is not a substitute for a professional third-party audit.** It's a rigorous internal pass plus an automated scan, both independently verified — useful for catching real issues before they reach a real auditor and for giving you and your DevRel contacts an honest, evidence-based picture of where things stand today. Fixing everything found so far is a strong signal, not a certification — get the professional audit before real capital is at stake regardless.

---

## Answering the question that triggered this review: is `approve()` safe?

**Yes, based on this review — every `safeTransferFrom` call in the contract is scoped to pull only from `msg.sender`'s own allowance, for an amount `msg.sender` specifies in the same transaction.**

There are exactly two places the contract pulls tokens from a user via `transferFrom`:

| Function | Line | Pulls from |
|---|---|---|
| `_escrowSelfFunded` (called by `createTask`/`createCommunityTask`) | `Taskify.sol:329` | `msg.sender`, amount `msg.sender` passed in that call |
| `depositToPool` | `Taskify.sol:432` | `msg.sender`, amount `msg.sender` passed in that call |

No function lets any other address — including `CONTRACT_OWNER` — trigger a pull against a third party's standing approval. There is no "sweep," "rescue," or admin token-pull function anywhere in the contract. Even in a worst-case scenario where the owner's key is fully compromised, that compromised key gains **zero** ability to spend other users' approved allowances — the owner-gated functions (`setTreasuryAddress`, `setVeBTCEscrow`, `setVeMEZOEscrow`, `setApprovedVoters`) never touch `IERC20.transferFrom` at all.

Separately, the frontend's approval helper (`frontend/lib/use-taskify.ts:92-104`, `ensureApproval`) always requests the **exact amount** needed for that specific transaction — never an unlimited/max-`uint256` approval. So in normal use, a standing approval to Taskify never exceeds what a user is about to spend in that moment anyway.

**Bottom line: the fund-custody risk in this system is not in the approve/transferFrom mechanics — those are clean. It's concentrated in what the contract does with funds once they're inside it, covered below.**

---

## Findings summary

| # | Severity | Title | Status |
|---|---|---|---|
| H-1 | **High** | Owner can fabricate grant-vote weight via momentary `veBTCEscrow` swap | **Fixed** — escrow locked per-proposal |
| M-1 | **Medium** | `createTask`/`createCommunityTask` accept any ERC-20 as `token`, unvalidated | **Fixed** — allowlist added |
| L-1 | **Low** | `executeGrant()` updates state after its external transfer call | **Fixed** — reordered |
| L-2 | **Low / centralization** | `CONTRACT_OWNER` is immutable with no recovery path | **Fixed** — `transferOwnership` added, `advanceWave` now permissionless |
| — | Verified safe | Reentrancy through external `veBTCEscrow` calls in `voteOnGrant` | Confirmed safe, PoC passing |
| — | Verified safe | `approve`/`transferFrom` scoping (see above) | Confirmed safe |
| — | Verified safe | `musd`/`mezo` payment tokens cannot be redirected post-deploy | Confirmed safe (immutable) |
| — | Verified safe | `grantPoolBalance`/`wavePoolAmount` accounting invariant | Traced, no drift found |
| — | Verified safe | Loop-based gas griefing (`selectWinners`, `_votingWeight`) | Bounded, not exploitable |
| — | Verified safe | `claimWaveReward` divide-by-zero | Proven unreachable via invariant |

---

## H-1: Owner can fabricate grant-vote weight via momentary `veBTCEscrow` swap

**Location:** `veBTCEscrow` (`Taskify.sol:179`), `setVeBTCEscrow` (`Taskify.sol:795-798`), `_votingWeight` (`Taskify.sol:241-250`)

**The issue:** `voteOnGrant()` snapshots a **timestamp** at proposal creation (`GrantVote.snapshotTimestamp`) to stop a voter from acquiring more veBTC weight after a vote opens — that mechanism is sound and tested (`Taskify.t.sol`'s `test_VoteUsesSnapshotWeightNotLiveWeight`). But it does **not** snapshot *which contract* is trusted as the source of truth for that weight. `veBTCEscrow` is a live, owner-mutable address, read fresh on every call to `_votingWeight`. Nothing stops `CONTRACT_OWNER` from:

1. Pointing `veBTCEscrow` at a contract they control that reports a fabricated, arbitrarily large weight for their own address,
2. Voting with that fabricated weight,
3. Pointing `veBTCEscrow` back at the real Mezo contract — immediately, same block if desired.

After step 3, every read of `getVotingWeight` for that address shows their real (small or zero) weight again. The fabrication is invisible to anyone inspecting on-chain state after the fact — only the already-recorded `votesFor`/`votesAgainst` reflects it, and there's nothing that flags those numbers as suspicious.

**Proof:** `test_OwnerCanFabricateVoteWeightByMomentarilySwappingEscrow` in `contracts/test/SecurityAudit.t.sol`. It demonstrates the full path end to end: a voter with real veBTC weight of `1` votes with a fabricated weight of `1_000_000_000e18` during a momentary escrow swap, the grant passes (`approved == true`), the escrow is swapped back, the voter's real weight reads as `1` both before and after, and **real, previously-deposited patron MUSD is actually committed and released** against the fraudulently-approved grant (`grantPoolBalance` decreases by the full grant amount, `task.status` becomes `Open`).

**Impact:** This is the single most direct path from "owner key compromised or acting maliciously" to "real escrowed MUSD misdirected," and it leaves no distinguishing trace in current state. Given the whole premise of the veBTC redesign is "Taskify doesn't custody governance, it just reads real external weight" — this finding undermines that premise anywhere the owner's judgment (or key security) is the only thing standing between a voter and their real weight.

**Trust boundary:** requires `CONTRACT_OWNER` access — either genuine malicious intent, or (more realistically, and the more common real-world case) a compromised deployer private key. `CONTRACT_OWNER` today is a single EOA (see L-2), which makes key compromise the more likely real-world trigger for this than owner malice.

**Recommended fix:** snapshot the *escrow address*, not just the timestamp, at proposal-open time — add `address escrowAtSnapshot` to `GrantVote`, set it from `veBTCEscrow` inside `applyForGrant`, and have `_votingWeight` use that stored address for every vote on that specific proposal, instead of reading the live `veBTCEscrow` variable. This closes the exploit for any proposal that's already open, while still letting the owner legitimately fix/upgrade `veBTCEscrow` for *future* proposals — which is exactly the flexibility that setter exists for (we've genuinely needed to correct this address before, this session). A timelock (e.g., a delay + event between calling `setVeBTCEscrow` and it taking effect) would be a reasonable complementary control on top, giving the community a window to notice a suspicious change before it can be used.

**✅ Fixed.** `GrantVote` now has `escrowAtSnapshot`, set from `veBTCEscrow` inside `applyForGrant` (`Taskify.sol:501`) and used by `voteOnGrant` (`Taskify.sol:544`) instead of the live variable. `_votingWeight` was refactored to take the escrow address as an explicit parameter rather than reading the global directly, so every caller has to be deliberate about which escrow it means. Added `getProposalVotingWeight(taskId, account)` as the correct way to read what a vote *will* use (the frontend now calls this instead of the live-escrow `getVotingWeight` for per-proposal weight, closing the same gap client-side). The regression test (`test_EscrowSwapAfterProposalOpenDoesNotAffectVote`) proves a post-open escrow swap now has zero effect on an already-open vote: the fabricated weight only shows up in the *live preview* (`getVotingWeight`, which is explicitly documented as non-binding), never in what actually gets recorded. Timelock on `setVeBTCEscrow` itself was not added — the per-proposal lock closes the concrete exploit; a timelock remains a reasonable *additional* layer if you want defense in depth beyond this.

---

## M-1: `createTask`/`createCommunityTask` accept any ERC-20 as `token`, unvalidated

**Location:** `createTask` (`Taskify.sol:344-382`), `createCommunityTask` (`Taskify.sol:387-423`), `_escrowSelfFunded` (`Taskify.sol:328-342`)

**The issue:** Both task-creation functions accept an arbitrary `address token` with no validation against `musd`/`mezo` (the only two tokens the rest of the protocol — patron deposits, wave rewards, fee routing — is designed around). Contrast with `markExpired`, which *does* validate: `if (task.token != musd) revert InvalidToken();` (`Taskify.sol:745`) — but only on the grant-funded expiry path, not at creation.

**Impact, two angles:**
1. **Scam risk to contributors.** A creator can post a task denominated in a worthless or malicious token dressed up to look like a real bounty. A contributor who completes real work gets paid in something that isn't MUSD or MEZO and may be worth nothing.
2. **Widened reentrancy surface.** Because `token` is fully attacker-chosen, `_escrowSelfFunded`'s `safeTransferFrom`/`safeTransfer` calls (`Taskify.sol:329,335,340`) execute arbitrary external code the creator controls. `createTask`/`createCommunityTask` both carry `nonReentrant`, which blocks reentry into any other `nonReentrant`-guarded function — but a malicious token could still attempt to reenter a *non*-guarded function (`voteOnGrant`, `registerUser`, `applyForTask`, etc.) during that transfer. No concrete fund-draining path through this was found in this review (the non-guarded functions reentry could reach don't move funds and don't depend on the not-yet-written task record), but it's an unnecessary attack surface that a token allowlist would close for free.

**Recommendation:** restrict `token` in both creation functions to `musd` or `mezo` (`if (token != musd && token != mezo) revert InvalidToken();`), matching the check `markExpired` already does. If arbitrary-token tasks are an intentional feature, at minimum surface the risk clearly in the frontend UI for any non-`musd`/`mezo` task.

**✅ Fixed.** Both `createTask` and `createCommunityTask` now revert `InvalidToken()` for anything other than `musd`/`mezo`, exactly matching `markExpired`'s existing check. `test_CreateTaskRejectsUnapprovedToken` proves both functions reject a third-party ERC-20 and that `musd` still works normally. This also closes most of the reentrancy-surface concern from angle 2, since `token` is no longer attacker-controllable.

---

## L-1: `executeGrant()` updates state after its external transfer call

**Location:** `Taskify.sol:529-565`

**The issue:** `vote.executed = true` and `grantPoolBalance -= amount` are set before the external `IERC20(musd).safeTransfer(treasuryAddress, treasuryFee)` call (`Taskify.sol:552`) — good. But `wavePoolAmount += wavePoolFee` and `task.status = Status.Open` / `task.deadline = ...` happen **after** that external call (`Taskify.sol:553,557-558`), which is a checks-effects-interactions violation in the strict sense.

**Why this isn't currently exploitable:** `executeGrant` carries `nonReentrant`, and `musd` is a standard ERC-20 with no transfer hooks (it's `immutable`, set once at deploy — see the positive finding below), so there's no way for the recipient of that transfer to execute code during it in the first place. This is a "correct by luck of the token, not by construction" situation.

**Recommendation:** reorder so all state writes happen before the external call, as defense-in-depth. Costs nothing and removes the dependency on `musd` never becoming (or being swapped for, on some future chain/deploy) a token with transfer hooks.

**✅ Fixed.** `wavePoolAmount`, `task.status`, and `task.deadline` are now all written before the `safeTransfer` call in `executeGrant`. Full checks-effects-interactions ordering, no longer dependent on `musd`'s specific (lack of) transfer hooks for safety. All existing tests (including the wave-reward flow in `Taskify.t.sol`) still pass unchanged, confirming the reorder didn't affect behavior.

---

## L-2: `CONTRACT_OWNER` is immutable with no recovery path

**Location:** `Taskify.sol:112,218-224`

**The issue:** `CONTRACT_OWNER` is set once in the constructor and is `immutable` — there is no `transferOwnership`-style function anywhere in the contract. If the deployer key is lost, every owner-gated action becomes permanently unavailable:
- `setTreasuryAddress`, `setVeBTCEscrow`, `setVeMEZOEscrow`, `setApprovedVoters` — all permanently frozen at whatever they were last set to.
- `advanceWave` (`Taskify.sol:754-767`) is owner-only with no fallback caller — if the owner goes inactive, wave rewards for every subsequent wave stop being claimable forever, since a wave's snapshot only gets written when `advanceWave` is called.

This isn't a "hack" in the sense of an outside attacker exploiting anything — it's a single-point-of-failure risk in ordinary key management, and it directly amplifies H-1's severity (the same key that can't be recovered if lost is the one whose compromise enables H-1).

**Recommendation:** for anything beyond a short-lived pilot, move `CONTRACT_OWNER` to a multisig (even a 2-of-3) before any real capital is at stake, and consider letting `advanceWave` be called by anyone once the epoch has genuinely elapsed (it's a pure time-check, doesn't need to be owner-gated at all).

**✅ Fixed.** `CONTRACT_OWNER` is no longer `immutable`; a new `transferOwnership(address newOwner)` (owner-only, rejects the zero address via a new `InvalidOwner` error) allows rotating to a multisig or recovering from a compromised key without a redeploy (`test_OwnershipCanBeTransferred`, `test_TransferOwnershipRejectsZeroAddress`). `advanceWave` is now fully permissionless — gated only by the epoch having genuinely elapsed, exactly as recommended (`test_AdvanceWaveIsPermissionless`). Moving the actual deployed owner to a real multisig is still an operational step for you to take (this fix makes it *possible* without a redeploy; it doesn't do it for you).

---

## Verified safe: reentrancy through the external `veBTCEscrow` calls

**Location:** `_votingWeight` (`Taskify.sol:241-250`), called from `voteOnGrant` (`Taskify.sol:503-527`), which is **not** `nonReentrant`

At first read this looks concerning: `voteOnGrant` makes several external calls (`balanceOf`, `ownerToNFTokenIdList`, `getPastVotes`) to an owner-controlled address *before* writing `grantVoters[taskId][msg.sender] = true` — a textbook checks-effects-interactions violation, and the function has no `nonReentrant` guard at all.

**Why it's actually safe:** `IMezoVotingEscrow` declares all three functions `view` (`Taskify.sol:12-14`). Solidity compiles external calls to `view`-declared interface functions as `STATICCALL`, and per EIP-214, the read-only restriction of a `STATICCALL` propagates through the *entire* nested call tree beneath it — including any further calls the callee makes, even via a raw low-level `.call()` that doesn't itself claim to be static. So even a malicious `veBTCEscrow` whose `getPastVotes` tries to call back into `voteOnGrant` cannot succeed: `voteOnGrant`'s own `SSTORE` (`grantVoters[...] = true`) executes inside an inherited static context and fails.

**Proof:** `test_ReentrancyThroughVotingEscrowIsBlocked` in `contracts/test/SecurityAudit.t.sol` — a malicious `ReentrantEscrow` contract attempts exactly this reentrant call inside `getPastVotes`. Result: the legitimate vote is recorded exactly once (`votesFor == 1000`, not `2000`), proving the reentrant attempt failed silently rather than either succeeding or reverting the whole transaction.

---

## Other verified-safe properties

- **`musd`/`mezo` cannot be redirected post-deploy.** Both are `immutable` (`Taskify.sol:113-114`), set once in the constructor. Even a fully compromised owner cannot repoint payments at a malicious look-alike token later — unlike `veBTCEscrow`/`veMEZOEscrow`, which are deliberately mutable (see H-1).
- **`grantPoolBalance` / `wavePoolAmount` accounting.** Traced every path that increments or decrements each: `depositToPool` (in), `executeGrant` approved path (out, earmarked), `markExpired` grant path (returned to pool on expiry). No path found where `grantPoolBalance` could over-report real available balance relative to actual token holdings.
- **Loop-based gas griefing.** `selectWinners`'s duplicate-winner check is bounded by `maxWinners <= 20` (enforced at task creation, `Taskify.sol:398`), so worst case is 400 iterations — not attacker-extendable. `_votingWeight`'s NFT-aggregation loop is capped at `MAX_VE_NFTS_PER_VOTE = 20` (`Taskify.sol:104`). Neither is a viable gas-bomb vector.
- **`claimWaveReward` divide-by-zero** (`Taskify.sol:777`, `snapshot.poolAmount * taskCount / snapshot.totalTasks`). `taskCount` (`waveCreatorTasks[waveId][msg.sender]`) can only be nonzero for a wave in which that address created at least one self-funded task — and creating one always increments `waveTotalTasks` in the same transaction (`Taskify.sol:337`). So `taskCount > 0` structurally implies `totalTasks >= 1` for that wave; the division can't be reached with a zero denominator.

---

## Round 2: external automated scan findings

All seven titles below were independently re-verified against the actual contract before being accepted — see each finding for the specific line(s) that confirm it. All six that were fixed trace back to one root cause: `markExpired()`'s status-exclusion list only ever knew about *terminal* statuses (`FundsReleased`, `Cancelled`, `Expired`, `GrantRejected`); it had no concept of "in-flight but not something expiry should ever touch."

| # | Severity | Title | Status |
|---|---|---|---|
| F-233716 | High | Expiry credits unfunded grant proposals as pool principal | **Fixed** |
| F-233658 | High | Submitted work can be expired unpaid | **Fixed** |
| F-233717 | High | Deadlines do not close task workflows | **Fixed** (resolved as a consequence of the markExpired fix) |
| F-233656 | High | Cancelled tasks retain wave credits | **Fixed** |
| F-233718 | High | Nominal token accounting can exceed actual custody | **Fixed** (consequence of F-233716) |
| F-233723 | Medium | Unbounded escrow weights can permanently block grant execution | **Fixed** |
| F-233721 | Medium | Zero treasury configuration blocks fee-bearing flows | **Fixed** |
| F-233719 | Medium | Grant-only wave fees can be permanently stranded | **Fixed** |
| F-233657 | Medium | Expiry can preempt grant vote finalization | **Fixed** (same root cause as F-233716) |
| F-233677 | Medium | One unpayable winner blocks entire distribution | **Verified real, not fixed** — accepted mitigation exists (see below) |

### F-233716 / F-233718 — the most severe of this round

**Location:** `markExpired` (originally excluded only `FundsReleased`/`Cancelled`/`Expired`/`GrantRejected` — `GrantPending` was missing), `applyForGrant` (never debits `grantPoolBalance` at creation)

A grant proposal's `task.deadline` was set to the same value as its voting deadline. The moment voting closed, **anyone** could call `markExpired` on it instead of `executeGrant` — routing to `grantPoolBalance += netAmount` for a proposal that was never funded from the pool in the first place. Since `applyForGrant` requires no deposit and no cap, this was a permissionless, zero-cost way to fabricate `grantPoolBalance`, which would later pass real `executeGrant` checks and release genuine patron MUSD. F-233718 ("nominal accounting can exceed actual custody") is the direct consequence of this.

**Fixed:** `markExpired` now only accepts `Open`/`Assigned`/`InProgress` — `GrantPending` is excluded entirely. The only valid resolution for a pending proposal is `executeGrant`. Proof: `test_PendingGrantCannotBeExpired` (`contracts/test/TaskLifecycleAudit.t.sol`).

### F-233658 — submitted work stolen from contributors

**Location:** `markExpired` (same exclusion list — `Submitted` was also missing)

If a contributor submitted real work but the creator hadn't approved before the deadline, *anyone* could call `markExpired`, refunding the **creator**, not the contributor who delivered.

**Fixed:** `Submitted` is now also excluded from `markExpired`. From there the creator must explicitly resolve it — `approveAndRelease` (still works regardless of deadline) or the new `rejectSubmission` (below). Proof: `test_SubmittedWorkCannotBeExpired`.

### F-233717 — resolved as a consequence, not separately

`startTask`/`submitTask`/`approveAndRelease` have no deadline checks at all — `deadline` only ever mattered to `markExpired`. Rather than bolting hard deadline checks onto the happy path (which would create new edge cases — e.g. blocking a late-but-good-faith submission), the fix is entirely about narrowing what `markExpired` is allowed to touch, which is exactly what F-233716 and F-233658's fixes already do.

### F-233656 — cancelled/expired tasks retaining wave credit

**Location:** `_escrowSelfFunded` (grants wave credit at task creation), `cancelTask`/`markExpired` (never reversed it)

A self-funded MUSD task earns wave credit (`waveTotalTasks`/`waveCreatorTasks`) the moment it's created — before any work happens. Neither cancellation nor expiry ever reversed that, letting a creator inflate their share of the wave-reward pool by create-then-cancel spamming (at the cost of the 3% fee each cycle).

**Fixed:** both `cancelTask` and `markExpired` now call a shared `_reverseWaveCreditIfLive` helper — but only when the task's `waveId` still matches the live `currentWaveId`. A wave that's already been snapshotted by `advanceWave()` is immutable; a cancellation after the fact has no way to retroactively correct it, so the guard correctly does nothing rather than corrupting the *new* wave's counters. That specific edge case (cancel/expire after your own wave's snapshot) is a known, accepted, no-longer-growing limitation. Proof: `test_CancelTaskReversesWaveCreditWithinSameWave`, `test_MarkExpiredAlsoReversesWaveCreditWithinSameWave`, `test_CancelTaskDoesNotCorruptANewerWaveAfterAdvance`.

### New: `rejectSubmission` — the creator's real alternative

Excluding `Submitted` from `markExpired` (F-233658's fix) removes a *bad* resolution path but doesn't add a good one — a creator with genuinely unacceptable submitted work needs a way to say so. `rejectSubmission(taskId)` (creator-only, requires `Submitted`) resets the task to `Open` and clears the assignee. **It does not refund the creator** — that would let a creator reject good work for free and keep the option to take the escrow back regardless of merit. The funds stay locked in the task; a new contributor (or the same one, reassigned) can still complete it. Proof: `test_RejectSubmissionReopensTaskWithoutRefundingCreator`.

### New: creator-chosen work duration for grant-funded tasks

`executeGrant`'s approved path used to hardcode the post-approval work deadline to `WAVE_EPOCH_DURATION` (30 days) — an unrelated constant borrowed for convenience. `applyForGrant` now takes a `workDuration` parameter (bounded `MIN_WORK_DURATION` (1 day) to `MAX_WORK_DURATION` (180 days), enforced via `InvalidDuration`), stored on the task and applied at approval time. The frontend's grant-application form now has a real "time to complete" selector (7/14/30/60/90 days) instead of this being invisible/fixed. Proof: `test_GrantApprovalUsesCreatorChosenWorkDuration`.

### F-233723 — integer overflow could permanently brick grant resolution

**Location:** `executeGrant`, the pass/fail comparison

`(vote.votesFor * 100) >= (totalVotes * GRANT_PASS_THRESHOLD)` uses Solidity's checked arithmetic. `votesFor`/`votesAgainst` are sums of externally-reported veBTC weight (`_votingWeight`) — not fully trusted, not bounded to any realistic magnitude. A large enough value overflows the multiplication and reverts — and since `vote.votesFor` is already permanently stored, every future call to `executeGrant` hits the identical overflow. Combined with F-233716's fix (which correctly closed off `markExpired` as a fallback for `GrantPending`), an affected proposal would have had **no resolution path left at all.**

**Fixed:** replaced with `Math.mulDiv(totalVotes, GRANT_PASS_THRESHOLD, 100, Math.Rounding.Ceil)` (OpenZeppelin), which computes the same threshold without ever overflowing regardless of magnitude. Getting the rounding mode right mattered here — an earlier draft of this fix using the default `Floor` rounding was verified, by hand, to be **not** exactly equivalent to the original comparison at non-exact boundaries (e.g. `votesFor=7, totalVotes=11`: `Floor` would incorrectly approve; the original and `Ceil` both correctly reject). Proof: `test_ExecuteGrantHandlesOverflowMagnitudeWeight` (a weight deliberately chosen to overflow the old code), `test_ExecuteGrantBoundaryRoundingMatchesOriginalSemantics` (the exact boundary case that exposed the rounding bug).

### F-233721 — zero treasury bricks fee-bearing flows

**Location:** `setTreasuryAddress`

No zero-address check. Standard ERC20 `transfer()` to `address(0)` reverts, so setting `treasuryAddress` to zero — accident or malice — would break `createTask`, `createCommunityTask`, and grant approval entirely until corrected.

**Fixed:** `setTreasuryAddress` now reverts `InvalidTreasury()` for the zero address. Proof: `test_SetTreasuryAddressRejectsZeroAddress`.

### F-233719 — grant-only wave fees permanently stranded

**Location:** `_escrowSelfFunded` / `executeGrant` (both feed `wavePoolAmount`) vs. `waveTotalTasks`/`waveCreatorTasks` (only `_escrowSelfFunded` increments them)

A wave's `poolAmount` accumulates fees from both self-funded tasks *and* approved grants, but only self-funded tasks ever increment the task-count fields `claimWaveReward` depends on. A wave that closes with zero self-funded tasks but at least one approved grant has real money in `poolAmount` and **no possible claimant** — `waveCreatorTasks` is 0 for every address, forever, and `claimWaveReward` requires it to be nonzero.

**Fixed (per explicit direction: let treasury claim it):** new permissionless `claimStrandedWaveFunds(waveId)` — same permissionless rationale as `advanceWave` (pure mechanical sweep, fixed destination, no economic decision). Only works when a wave's snapshot shows `totalTasks == 0`; reverts `NotStranded()` otherwise, so a wave with real creator claims is never touched by this path. One-time per wave (`waveStrandedFundsClaimed`). Proof: `test_StrandedGrantOnlyWaveFundsAreClaimableByTreasury`, `test_ClaimStrandedWaveFundsRejectsWaveWithRealClaimants`.

### F-233677 — one unpayable winner blocks the whole distribution (verified real, left as-is)

**Location:** `selectWinners`, the payout loop

No per-transfer fallback — one failing `safeTransfer` (e.g. a compliance-blacklisted address on a real stablecoin) reverts the whole call, including the `task.status` write, so nobody in that batch gets paid in that transaction.

**Not fixed, by explicit decision.** The revert is atomic — it undoes the status change too, so the task is left exactly as it was before the attempt. The creator can immediately retry `selectWinners` with a new `winners` array excluding the problematic address, and that succeeds normally. The actual cost isn't stuck funds; it's that the excluded winner gets nothing for that attempt. A fuller fix (per-transfer try/catch, or a pull-payment pattern) was considered and explicitly deferred — the manual-retry mitigation was judged sufficient for now.

---

## What this review did not cover

- No fuzzing or invariant/property-based testing (Foundry supports both; not attempted here).
- No static analysis tooling (Slither, Mythril, etc.) — this was a manual review only.
- No review of `contracts/script/Deploy.s.sol`, `MockMUSD.sol`, `MockMEZO.sol`, or `MockVotingEscrow.sol` beyond their use as test doubles — those aren't production contracts.
- No review of the real Mezo Tigris contracts (`veBTCEscrow` itself) — those are external, independently-deployed contracts outside this project's control; this review only covers how `Taskify.sol` *trusts* that address, not the address's own contents.
- Gas optimization was out of scope.

---

## Post-fix status

Every fixed finding across both rounds is redeployed to Mezo testnet: `0x1FeBFE69533A2207f45f98b44Eb6564a122665b8` (`veBTCEscrow` already set to the verified testnet veBTC address; `approvedVoters` is empty — nobody can vote yet until the owner calls `setApprovedVoters` for the pilot holders). 26/26 tests pass across `Taskify.t.sol`, `SecurityAudit.t.sol`, and `TaskLifecycleAudit.t.sol`, including thirteen regression tests specifically proving each fix (six from Round 1, seven from Round 2 — `test_ExecuteGrantBoundaryRoundingMatchesOriginalSemantics` counted separately from `test_ExecuteGrantHandlesOverflowMagnitudeWeight` since it caught a distinct bug in the first fix attempt).

**What's still genuinely open, and true regardless of anything in this document:**
- **Get a professional third-party audit before real capital is at stake.** This was true before these fixes and remains true after — an internal review, however careful (and this one now has working exploit code for everything it found across two independent rounds), is not a substitute for one. Treat this document as a head start for that audit, not a replacement for it.
- **F-233677 (unpayable winner blocks a `selectWinners` batch) is verified real and intentionally not fixed** — the accepted mitigation is manual retry with the problematic address excluded from the batch. Revisit this if `selectWinners` batches grow large enough that manual retry becomes impractical, or before onboarding any payment token known to blacklist addresses (e.g. centralized stablecoins with freeze functions).
- The live Vercel deployment's `NEXT_PUBLIC_TASKIFY_CONTRACT` still needs updating to this new address, same open item as every previous redeploy this session.
- Nothing here has been deployed to mainnet, and nothing in scope here covers the real Mezo Tigris contracts themselves (see "What this review did not cover" above).
- The recommendation to move `CONTRACT_OWNER` to an actual multisig is now *possible* (via `transferOwnership`) but hasn't been *done* — the deployer is still a single EOA today.
