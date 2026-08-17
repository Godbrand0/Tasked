# Taskify Voting System Redesign — veBTC/veMEZO Integration

## Implementation status

**Sections 5 and 7 are implemented and tested**, against the mock `IMezoVotingEscrow` interface (real DevRel-confirmed addresses are still needed before anything touches mainnet — see Section 9).

- `contracts/src/Taskify.sol` — `IMezoVotingEscrow`, `veBTCEscrow`/`veMEZOEscrow` + setters, `_votingWeight`/`getVotingWeight` (`Taskify.sol:233-251`), `GrantVote.snapshotTimestamp` wired through `applyForGrant`/`voteOnGrant`, `stakeMezo` removed (`unstakeMezo` kept for migration), dead divisor constants removed.
- `contracts/src/MockVotingEscrow.sol` — checkpoint-aware test double.
- `contracts/test/Taskify.t.sol` — 7 passing tests, including snapshot-vs-live-weight and the NFT cap.
- `contracts/script/Deploy.s.sol` — optional `VEBTC_ESCROW_ADDRESS`/`VEMEZO_ESCROW_ADDRESS` env vars, since both are also owner-settable post-deploy.
- `frontend/lib/taskify.ts`, `frontend/lib/use-taskify.ts`, `frontend/app/investor/page.tsx` — old divisor-based `votingWeight()` removed, `getVotingWeight(address, snapshotTimestamp)` read live per-proposal (`vote.myWeight`) and as a non-binding current-time preview; Stake MEZO UI replaced with a migration-only legacy-withdrawal panel; Mezo Earn CTA added.

## Summary

Replace Taskify's own patron staking pool with a live read of a patron's **existing** veBTC/veMEZO position on Mezo's own Tigris contracts. Grant-pool funding (MUSD deposits) stays fully decoupled from voting weight. This removes a competing lock pool, shrinks Taskify's custody surface, and turns "become a Taskify patron" into literal top-of-funnel copy for Mezo Earn.

---

## 1. Background / current state

Taskify's patron-voting weight is currently computed in `voteOnGrant()` as:

```
totalDeposited / MUSD_VOTE_DIVISOR + mezoStaked / MEZO_VOTE_DIVISOR
```

where `mezoStaked` comes from Taskify's own `stakeMezo()` pool (`Taskify.sol:403-421`) and `totalDeposited` from `depositToPool()` (`Taskify.sol:380-391`). This competes with Mezo's own vote-escrow product and requires Taskify to custody funds purely for governance-weight purposes.

**Decision:** grant funding and voting weight are now fully decoupled. MUSD deposits still fund the grant pool and drive Patron Tier badges — they no longer grant votes. Voting weight comes entirely from an external read of the patron's Mezo Earn position.

---

## 2. How veBTC/veMEZO actually work (confirmed via Mezo's Tigris source + blog docs)

- **veBTC** — lock BTC, mint a veBTC NFT. Base voting unit, works standalone at 1x weight, no veMEZO required. Directs MEZO emissions via weekly gauge votes, earns real BTC yield from chain fees.
- **veMEZO** — lock MEZO, mint a veMEZO position. Cannot vote independently — it only *boosts* a paired veBTC position's weight, up to 5x. Pairing happens via a Matching Market (Matchbox), and can change between epochs.
- **Rebase mechanic** — Mezo computes `R_liquid = (S_total − S_ve) / S_total` (share of MEZO still unlocked) and rewards heavier/earlier lockers disproportionately to pull MEZO into veMEZO faster. This means every new veBTC/veMEZO lock directly serves Mezo's own protocol incentive — a genuinely aligned pitch for DevRel.

---

## 3. Real, verified contracts (mezo-org/tigris — public repo)

Found via the org's full repository list (not visible in the "popular repos" preview), cloned directly, deployment artifacts inspected.

| Contract | Mainnet | Testnet |
|---|---|---|
| **VeBTC** | `0x7D807e9CE1ef73048FEe9A4214e75e894ea25914` | `0xB63fcCd03521Cf21907627bd7fA465C129479231` |
| VeBTCVoter | `0x3A4a6919F70e5b0aA32401747C471eCfe2322C1b` | `0x72F8dd7F44fFa19E45955aa20A5486E8EB255738` |
| Escrow (shared logic) | `0x083A517463457F115fC81306c4886798e2dbe249` | `0x742C32c22Bb30D8660269461aA1883495EF3E077` |

**Real, confirmed `IVotingEscrow` read functions:**

```solidity
function balanceOf(address owner) external view returns (uint256);
function ownerToNFTokenIdList(address owner, uint256 index) external view returns (uint256);
function balanceOfNFT(uint256 tokenId) external view returns (uint256); // current weight
function getPastVotes(address account, uint256 tokenId, uint256 timestamp) external view returns (uint256); // snapshotted + delegation-checked
```

`getPastVotes` is the function to use for `voteOnGrant()` — it checkpoints at a timestamp, verifies `account` actually owned the NFT at that point, and returns `delegatedBalance`. This is both snapshot-safe (immune to buy-vote-sell gaming) and delegation-aware in one call.

### ⚠️ Important caveat — this snapshot predates veMEZO/boost

The public `tigris` repo's last commit is **September 16, 2025**. Cross-referenced against Mezo's boost/Matching-Market blog posts and the Halborn audit (run Dec 2025–Jan 2026 against a *separate, private* repo, `tigris-token-launch`), this is the **pre-boost** snapshot:
- `VeMEZO.sol` exists in source but has **no deployment file** — not yet deployed when this was last pushed.
- No "boost" logic anywhere in this codebase — the `BoostVoter.pokeBoosts` mechanism from the audit doesn't exist here.

The VeBTC address is very likely still current — it's an OpenZeppelin upgradeable proxy, and proxy addresses typically survive logic upgrades — but this needs confirmation, not assumption. veMEZO has no public address at all yet.

### ✅ Independently verified on-chain — 2026-08-17

All six addresses above were confirmed directly against Blockscout (`explorer.mezo.org` / `explorer.test.mezo.org`, via each network's `api.explorer.*.mezo.org` backend) and, for testnet, live `eth_call`s over RPC (`rpc.test.mezo.org`) — not just re-reading the repo's deployment JSON.

| Address | Network | Verified contract name | Notes |
|---|---|---|---|
| `0x7D807e...25914` (VeBTC) | Mainnet | `TransparentUpgradeableProxy` → implementation `VeBTC` (`0x3106675E...3d42123`) | EIP-1967 proxy, verified source, funded (nonzero balance) |
| `0xB63fcCd...79231` (VeBTC) | Testnet | `TransparentUpgradeableProxy` → implementation `VeBTC` (`0x6BF4894D...92917E`) | EIP-1967 proxy, verified source, 10 real txs |
| `0x3A4a691...322c1b` (VeBTCVoter) | Mainnet | `Voter` | Verified source |
| `0x72F8dd7...255738` (VeBTCVoter) | Testnet | `Voter` | Verified source |
| `0x083A517...2dbe249` (Escrow) | Mainnet | `Escrow` | Verified source, funded |
| `0x742C32c...EF3E077` (Escrow) | Testnet | `Escrow` | Verified source |

On testnet, `balanceOf(address)`, `ownerToNFTokenIdList(address,uint256)`, and `getPastVotes(address,uint256,uint256)` were called directly via `cast call` against the live RPC — all three responded with the expected shapes, no reverts. `getPastVotes` returned `0` for a nonexistent position instead of reverting, which is a direct, on-chain confirmation of the DevRel-ask item 5 below (the Sept-2025 source's no-revert-on-current-timestamp behavior still holds on the deployed contract, not just in the old source).

This closes the "unverified lead" gap for all six addresses — they're real, verified, correctly-shaped contracts on both networks. **What's still genuinely unconfirmed:** whether the VeBTC *proxy* address is the one Mezo intends integrators to keep using long-term (vs. a newer deployment elsewhere), and everything boost/veMEZO-related in Section 4 — verifying an address responds correctly today doesn't confirm Mezo's forward-looking plans for it.

---

## 4. DevRel ask (sharpened, narrow)

1. Confirm the VeBTC addresses above are still the live, current proxy addresses on mainnet and testnet.
2. Provide veMEZO's deployed address (mainnet + testnet) — not publicly available anywhere.
3. Confirm whether `getPastVotes` on the current (possibly upgraded) contract already returns the fully boosted, delegation-resolved weight, or whether boost application requires a separate call (e.g. `pokeBoosts`) before the read is accurate.
4. Confirm whether veMEZO-boost pairings (Matching Market) can change mid-epoch in a way that would make a snapshot stale during an active Taskify vote.
5. Confirm `getPastVotes` still behaves the way the Sept-2025 source does — binary-searches checkpoints and returns 0 rather than reverting for a not-yet-checkpointed timestamp — since the current, possibly-upgraded contract's behavior here hasn't been directly verified. (The pre-boost source doesn't revert on this, but "current version behaves like the old source" is itself an assumption worth confirming.)

This is now a narrow confirmation-and-fill-the-gap ask, not a blind ABI request — we have a verified base contract and interface to show as evidence of real integration work already done.

---

## 5. Contract changes — `contracts/src/Taskify.sol`

### 5.1 New external interface

```solidity
interface IMezoVotingEscrow {
    function balanceOf(address owner) external view returns (uint256);
    function ownerToNFTokenIdList(address owner, uint256 index) external view returns (uint256);
    function getPastVotes(address account, uint256 tokenId, uint256 timestamp) external view returns (uint256);
}
```

### 5.2 New owner-settable addresses

Two new addresses, following the existing `treasuryAddress` / `setTreasuryAddress` pattern (`Taskify.sol:171, 752-755`). The codebase does not use an `onlyOwner` modifier — every owner-gated function uses an inline check against `CONTRACT_OWNER`, e.g. `setTreasuryAddress` at line 752-755. Match that pattern exactly rather than introducing a new modifier:

```solidity
address public veBTCEscrow;
address public veMEZOEscrow;

function setVeBTCEscrow(address _veBTCEscrow) external {
    if (msg.sender != CONTRACT_OWNER) revert NotAuthorized();
    veBTCEscrow = _veBTCEscrow;
}

function setVeMEZOEscrow(address _veMEZOEscrow) external {
    if (msg.sender != CONTRACT_OWNER) revert NotAuthorized();
    veMEZOEscrow = _veMEZOEscrow;
}
```

### 5.3 New internal `_votingWeight(address account, uint256 snapshotTimestamp)`

Aggregate across every veBTC (and, once available, veMEZO-boosted) NFT the account holds — not existence-check one. Two fixes baked in:

1. **Zero-address guard** — if `veBTCEscrow` is unset, return 0 explicitly rather than letting the call revert with a low-level error, so `voteOnGrant()`'s `NoStake()` fires cleanly instead of an opaque call-to-zero-address failure.
2. **Fixed snapshot timestamp, not `block.timestamp`** — `getPastVotes` binary-searches checkpoints for an entry at-or-before the given timestamp (confirmed against the Tigris source; it does not revert on a current timestamp, unlike OZ's `ERC20Votes`). But passing `block.timestamp` at the moment each patron happens to vote always resolves to their *current live* weight, not a pre-committed snapshot — which defeats the anti-gaming purpose of using `getPastVotes` at all. Instead, capture a fixed `snapshotTimestamp` once when a grant proposal opens for voting, and pass that same value into every patron's `getPastVotes` call for that proposal. See 5.4 for exactly where this gets wired in.

```solidity
function _votingWeight(
    address account,
    uint256 snapshotTimestamp
) internal view returns (uint256 weight) {
    if (veBTCEscrow == address(0)) return 0;
    IMezoVotingEscrow ve = IMezoVotingEscrow(veBTCEscrow);
    uint256 count = ve.balanceOf(account);
    // Practical cap — see gas note below
    uint256 iterations = count > MAX_VE_NFTS_PER_VOTE ? MAX_VE_NFTS_PER_VOTE : count;
    for (uint256 i = 0; i < iterations; i++) {
        uint256 tokenId = ve.ownerToNFTokenIdList(account, i);
        weight += ve.getPastVotes(account, tokenId, snapshotTimestamp);
    }
}

function getVotingWeight(address account, uint256 snapshotTimestamp) external view returns (uint256) {
    return _votingWeight(account, snapshotTimestamp);
}
```

**Gas note — decided:** this loop is unbounded per-wallet, and unlike a pure view call, `voteOnGrant()` calls it inside a state-changing transaction — a wallet holding an unusually large number of veBTC NFTs could push gas costs up unpredictably. **`MAX_VE_NFTS_PER_VOTE = 20`.** Each iteration is a cross-contract call plus a checkpoint binary search inside `getPastVotes`, not a cheap storage read, so worst-case gas needs a real bound. Legitimate holders have little reason to fragment a position across many NFTs — splitting adds gas and management overhead with no voting-power benefit — so 20 comfortably covers real holders while keeping worst-case gas predictable. Revisit once real testnet gas numbers are available.

### 5.4 `voteOnGrant()` (`Taskify.sol:465-489`) and `applyForGrant()` (`Taskify.sol:426-462`)

**Confirmed against the real source.** `GrantVote` is created exactly once, in `applyForGrant()`, right after `deadline` is computed:

```solidity
uint256 deadline = block.timestamp + GRANT_VOTING_DURATION;
...
grantVotes[taskId] = GrantVote({votesFor: 0, votesAgainst: 0, deadline: deadline, executed: false});
```

That's precisely where the snapshot needs to be taken. Add a field to the struct (`Taskify.sol:148-153`) and set it alongside `deadline`:

```solidity
struct GrantVote {
    uint256 votesFor;
    uint256 votesAgainst;
    uint256 deadline;
    uint256 snapshotTimestamp; // NEW — fixed at proposal creation, passed to every getPastVotes call
    bool executed;
}
```

```solidity
grantVotes[taskId] = GrantVote({
    votesFor: 0,
    votesAgainst: 0,
    deadline: deadline,
    snapshotTimestamp: block.timestamp, // NEW
    executed: false
});
```

Taking the snapshot at proposal-creation time (not vote-cast time) is the right anti-gaming shape — a patron can't see a proposal go up and then go lock veBTC to swing it, since `getPastVotes` resolves to whatever checkpoint existed at-or-before that fixed moment.

In `voteOnGrant()` itself (`Taskify.sol:465-489`), replace the current computation:

```solidity
// current (line 477):
uint256 votingWeight = (patron.totalDeposited / MUSD_VOTE_DIVISOR) + (patron.mezoStaked / MEZO_VOTE_DIVISOR);

// new:
uint256 votingWeight = _votingWeight(msg.sender, vote.snapshotTimestamp);
```

The `Patron storage patron = patrons[msg.sender];` local declared at line 469 becomes unused once this change lands — delete it, don't leave it as dead code.

Keep the `NoStake()` revert-on-zero-weight gate structurally unchanged (still fires when `votingWeight == 0`).

**Decided:** keep the `Role.Investor` gate at line 470 (`if (users[msg.sender].role != Role.Investor) revert NoStake();`). It's a free `registerUser()` call, not comparable friction to the staking pool being removed, and it keeps this module consistent with every other role in the contract (Creator, Contributor also require registration). It also gives Taskify identity for display purposes (username, tier badge) alongside the externally-sourced weight. No code change needed here beyond the weight computation above.

### 5.5 Dead code cleanup once the weight source changes

- `MUSD_VOTE_DIVISOR` (`Taskify.sol:99`) and `MEZO_VOTE_DIVISOR` (`Taskify.sol:100`), plus the display-scale comment block above them (`Taskify.sol:90-98`) explaining the old divisor math, become vestigial once `voteOnGrant()` no longer reads them — remove from the contract, not just from the frontend (Section 7 covers the frontend side; this is the Solidity-side counterpart).
- `Patron.mezoStaked` stays needed transiently — `unstakeMezo()` still reads/writes it during the migration withdrawal window (Section 5.7 below). It becomes fully dead weight only once that window closes; don't remove the field itself yet, just stop using it for voting weight.
- `MezoStaked` event and the `stakeMezo()` function itself are removed per 5.7; `MezoUnstaked` stays until the withdrawal window closes.

### 5.6 `depositToPool()` (`Taskify.sol:380-391`)

Keep as-is — funding-only now. Keep `patron.totalDeposited` / `patron.tier` tracking too, since it still drives Patron Tier badges (Bronze/Silver/Gold/Diamond), just fully decoupled from vote weight.

### 5.7 `stakeMezo` / `unstakeMezo` (`Taskify.sol:403-421`) — migration

- **Remove `stakeMezo`** (new deposits) immediately in the new build.
- **Keep `unstakeMezo`** working in the final build of the old contract — costs nothing extra, guarantees no one's real MEZO gets stranded behind a redeploy.
- Sequence: ship the new contract with `stakeMezo` removed, `unstakeMezo` kept; announce a withdrawal window to existing stakers; after a reasonable window, treat any remainder as abandoned testnet funds (acceptable — testnet, not a mainnet fund-recovery obligation).

---

## 6. Reward-token flow (creator funds task in BTC/MEZO → contributor gets veBTC/veMEZO)

Separate design track, same system. Recommended as an **optional choice**, not a mandate:

- Contributor completing a task can choose: (a) liquid MUSD payout now, or (b) opt into having the task's BTC/MEZO locked into a veBTC/veMEZO position sent to their wallet — framed as "stake your earnings, earn BTC weekly" rather than forced illiquidity.
- Open technical question for DevRel: does Mezo's lock contract support a `createLockFor(recipient, amount, duration)`-style call so Taskify's escrow can lock and mint the veNFT straight to the contributor, or does Taskify need to lock to its own address and transfer the NFT afterward? Confirm before scoping the escrow contract's exact call pattern.

---

## 7. Frontend changes

`frontend/lib/taskify.ts`
- Remove local `votingWeight()` / `MUSD_VOTE_DIVISOR` / `MEZO_VOTE_DIVISOR` / `VOTE_WEIGHT_DISPLAY_SCALE` computation.
- Call `getVotingWeight(address, snapshotTimestamp)` directly — never duplicate Mezo's aggregation math client-side. The signature takes the proposal's fixed `snapshotTimestamp` (see 5.3/5.4), not just an address: when displaying voting power for a specific open grant proposal, pass that proposal's `snapshotTimestamp`; a general "your current voting power" preview shown outside of an active vote (non-binding, informational only) can pass the current timestamp instead.

`frontend/app/investor/page.tsx`
- Remove the "Stake MEZO" deposit UI entirely.
- Add a read-only "Your Mezo Earn voting power" display (from `getVotingWeight`) plus a CTA linking out to Mezo Earn — the "lock BTC or MEZO on Mezo Earn to become a Taskify patron" onboarding copy.
- Keep the "Deposit MUSD" section; reword copy to make clear it funds the grant pool only and no longer grants voting rights.
- Keep Patron Tier badges, sourced from `totalDeposited` only.

---

## 8. Verification

- Foundry tests against a mock `IMezoVotingEscrow`: multiple veBTC NFTs per wallet (aggregation), zero-position wallet (`NoStake()` still reverts), a snapshot taken before vs. after a simulated NFT transfer (confirms `getPastVotes` ownership-check behavior), and a wallet exceeding `MAX_VE_NFTS_PER_VOTE = 20` (confirms the cap is applied and gas stays bounded).
- Manual, testnet: lock real veBTC on Mezo Earn (once addresses are confirmed on-chain per Section 3) with a test wallet, confirm Taskify's `getVotingWeight` matches Mezo's own UI for that wallet, cast a grant vote, confirm recorded on-chain weight matches.
- `pnpm exec tsc --noEmit` / `pnpm build` in `frontend/` after client changes.
- `forge build` / `forge test` in `contracts/` after Solidity changes.

---

## 9. Open items / blockers

| Item | Status |
|---|---|
| VeMEZO address | Not public — genuine blocker, needs DevRel |
| Boost-resolution in `getPastVotes` | Unconfirmed for current (possibly upgraded) contract — needs DevRel |
| Mid-epoch boost pairing changes affecting snapshots | Needs DevRel |
| Whether the verified VeBTC proxy is the long-term-intended integration address | Verified live and correctly-shaped (Section 3), but Mezo's forward-looking plans for it aren't confirmable from outside — worth a direct DevRel confirmation before mainnet |
| `createLockFor`-style delegatee minting for reward flow | Needs DevRel, only relevant once reward-token flow (Section 6) is scoped |

**Resolved (no longer blockers):**
- `MAX_VE_NFTS_PER_VOTE` — set to 20 (5.3).
- Dual gate (`Role.Investor` + veBTC weight) — keeping both, decided (5.4).
- VeBTC/VeBTCVoter/Escrow addresses (mainnet + testnet) — independently verified on-chain 2026-08-17 (Section 3): real, verified, correctly-named contracts on both networks, with testnet's `IVotingEscrow` functions live-tested over RPC.
- `getPastVotes` no-revert-on-current-timestamp behavior — confirmed directly against the live testnet contract via RPC (Section 3), not just the Sept-2025 source.
- Testnet veBTC address wired into `contracts/.env` as `VEBTC_ESCROW_ADDRESS`, picked up automatically by `Deploy.s.sol` on the next redeploy.

Contract/frontend work for Sections 5 and 7 can proceed now against the mock interface — it does not need to wait on DevRel answers to ship tested, ready-to-deploy code.
