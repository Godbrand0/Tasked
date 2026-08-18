# Taskify Internal Security Review — `contracts/src/Taskify.sol`

**Date:** 2026-08-18 (findings), fixes applied and redeployed same day
**Scope:** `contracts/src/Taskify.sol` (current `main`, includes the veBTC voting redesign and pilot voter whitelist — see `VOTING_SYSTEM_REDESIGN.md`)
**Reviewer:** Internal review (Claude, working session), not a licensed third-party audit firm
**Methodology:** Full manual line-by-line review of every function, focused on: escrow/custody safety, access control, reentrancy, external-call trust boundaries, approve/transferFrom scoping, integer/rounding correctness, and denial-of-service bounds. Findings are backed by executable Foundry proof-of-concept tests (`contracts/test/SecurityAudit.t.sol`), not just reasoning.

**✅ Status: all four findings (H-1, M-1, L-1, L-2) are fixed, tested, and redeployed to Mezo testnet at `0x0ceC7A61B12d801a37143e6E223Cab907839cE3f`.** Every regression test in `contracts/test/SecurityAudit.t.sol` was rewritten to assert the *fixed* behavior — the tests that used to prove the exploits worked now prove they don't. Run `forge test --match-contract SecurityAuditTest -vv` to reproduce (6/6 passing; 14/14 across the full suite).

**⚠️ This is not a substitute for a professional third-party audit.** It's a rigorous internal pass, useful for catching real issues before they reach a real auditor and for giving you and your DevRel contacts an honest, evidence-based picture of where things stand today. Fixing everything found in an internal pass is a strong signal, not a certification — get the professional audit before real capital is at stake regardless.

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

## What this review did not cover

- No fuzzing or invariant/property-based testing (Foundry supports both; not attempted here).
- No static analysis tooling (Slither, Mythril, etc.) — this was a manual review only.
- No review of `contracts/script/Deploy.s.sol`, `MockMUSD.sol`, `MockMEZO.sol`, or `MockVotingEscrow.sol` beyond their use as test doubles — those aren't production contracts.
- No review of the real Mezo Tigris contracts (`veBTCEscrow` itself) — those are external, independently-deployed contracts outside this project's control; this review only covers how `Taskify.sol` *trusts* that address, not the address's own contents.
- Gas optimization was out of scope.

---

## Post-fix status

All four findings are fixed and redeployed to Mezo testnet: `0x0ceC7A61B12d801a37143e6E223Cab907839cE3f` (`veBTCEscrow` already set to the verified testnet veBTC address; `approvedVoters` is empty — nobody can vote yet until the owner calls `setApprovedVoters` for the pilot holders). 14/14 tests pass across `Taskify.t.sol` and `SecurityAudit.t.sol`, including six regression tests specifically proving each fix holds.

**What's still genuinely open, and true regardless of anything in this document:**
- **Get a professional third-party audit before real capital is at stake.** This was true before these fixes and remains true after — an internal review, however careful (and this one now has working exploit code for everything it found), is not a substitute for one. Treat this document as a head start for that audit, not a replacement for it.
- The live Vercel deployment's `NEXT_PUBLIC_TASKIFY_CONTRACT` still needs updating to this new address, same open item as every previous redeploy this session.
- Nothing here has been deployed to mainnet, and nothing in scope here covers the real Mezo Tigris contracts themselves (see "What this review did not cover" above).
- The recommendation to move `CONTRACT_OWNER` to an actual multisig is now *possible* (via `transferOwnership`) but hasn't been *done* — the deployer is still a single EOA today.
