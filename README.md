# Taskify

> Trustless bounty escrow, community-governed grants, and both experience-matched and open-to-anyone work — built on Mezo with Solidity.

Taskify is a fully on-chain bounty protocol on **Mezo** (a Bitcoin-secured EVM L2) that connects task creators and contributors through a single Solidity contract — and lets any registered wallet support the grant pool or vote on grants, independent of role. Every payment is enforced on-chain. No escrow agent, no payment processor, no central party.

Two kinds of task live side by side on one board:

- **Development tasks** — experience-tier gated, one contributor applies and is assigned, paid on approval. GitHub-verified.
- **Community tasks** — open to any registered wallet (memes, bug write-ups, social bounties — no code required). Anyone joins with a proof-of-participation link; the creator picks up to *N* winners and the escrow splits evenly between them in one transaction. X-verified.

**Live Demo:** [taskifybounties.vercel.app](https://taskifybounties.vercel.app/)
**Contract (Mezo Testnet):** [`0x3e72A1E45CD5c499f1fd48C8f102Bf6C28381F69`](https://explorer.test.mezo.org/address/0x3e72A1E45CD5c499f1fd48C8f102Bf6C28381F69) — see [Contract Addresses](#contract-addresses)

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Experience Matching](#experience-matching)
3. [Repository Structure](#repository-structure)
4. [Smart Contract Reference](#smart-contract-reference)
5. [User Roles & Identity](#user-roles--identity)
6. [Financial Model](#financial-model)
7. [Token Roles](#token-roles)
8. [Tech Stack](#tech-stack)
9. [Local Development](#local-development)
10. [Environment Variables](#environment-variables)
11. [Contract Addresses](#contract-addresses)
12. [Security Model](#security-model)

---

## How It Works

### Development Tasks (Self-Funded)

1. A creator registers on-chain, then posts a task with a MUSD reward and an experience range.
2. MUSD transfers into the contract at creation via `createTask` — the funds are locked in escrow immediately.
3. Contributors whose experience level falls within the task's range can `applyForTask` on-chain.
4. The creator `assignTask`s one applicant; the assignee `startTask`s and then `submitTask`s.
5. The creator calls `approveAndRelease` — MUSD transfers directly to the contributor's wallet. No intermediary, no delay. If the submitted work isn't acceptable, the creator can instead call `rejectSubmission` — the task reopens (assignee cleared, status back to `OPEN`) without refunding escrow, so a new contributor can pick it up.

### Community Tasks (Self-Funded, Multi-Winner)

1. A creator posts a task via `createCommunityTask` with a MUSD reward and a max winner count (up to 20) instead of an experience range. MUSD locks in escrow the same way.
2. Any registered wallet — any role, no experience tier required — can `joinCommunityTask` with a link proving participation (a post, a write-up, anything public).
3. The creator reviews submissions off-chain and calls `selectWinners` with up to *N* addresses. The contract validates each one actually joined, splits the net escrow evenly between them (remainder from integer division goes to the last winner), and pays everyone in a single transaction.

### Grant-Funded Tasks (Development only, for now)

1. A creator applies for a grant via `applyForGrant`, specifying the amount, experience range needed, and how long they'll have to complete the work if approved (7/14/30/60/90 days in the UI; enforced on-chain between 1 and 180 days).
2. A 3-day on-chain voting window opens. Any approved voter votes for or against; weight comes live from each voter's veBTC position on Mezo Earn — MUSD deposited into the grant pool funds grants but grants no votes (see [Token Roles](#token-roles) and [`VOTING_SYSTEM_REDESIGN.md`](VOTING_SYSTEM_REDESIGN.md)). Voting is currently limited to a pilot whitelist of approved veBTC holders — approval is independent of role, and independent of having deposited into the pool.
3. If approved, MUSD moves from the patron pool into escrow, the task becomes `OPEN`, and the creator-chosen work duration becomes the task's deadline — following the same lifecycle as a self-funded Development task from there.

### Wave Rewards

Every ~30 days a fee distribution wave closes. 40% of all collected protocol fees from **self-funded** tasks (Development or Community) are distributed proportionally to active creators based on the number of tasks they posted that wave. Grant-funded tasks don't earn wave credit. This creates a flywheel: more tasks → more fees → larger creator reward pool → incentive to post more tasks.

---

## Experience Matching

Experience levels are discrete integer tiers stored on-chain. When a creator posts a **Development** task they set a minimum and maximum tier. When a contributor registers they declare their own tier. The `applyForTask` function enforces the gate at the contract level — applications outside the allowed range revert with `ExperienceMismatch()`, not just filtered in the UI.

| Tier | Label | Approximate Experience |
|---|---|---|
| `0` | Newcomer | 0 – 1 year |
| `1` | Junior | 1 – 2 years |
| `2` | Mid-level | 2 – 3 years |
| `3` | Senior | 3 – 5 years |
| `4` | Expert | 5+ years |

Contributors can update their tier at any time via `updateExperience`, but a 1-day cooldown (`EXPERIENCE_UPDATE_COOLDOWN`) applies after each update to prevent gaming active application windows.

**Community tasks skip this gate entirely** — `experienceMin`/`experienceMax` are always `0` and `joinCommunityTask` doesn't check tier or role at all.

---

## Repository Structure

```
Taskify/
├── contracts/                        # Foundry project (Solidity) — current contract
│   ├── src/
│   │   ├── Taskify.sol               # Core protocol contract
│   │   ├── MockMUSD.sol              # ERC-20 mock for local/testnet deploys
│   │   └── MockMEZO.sol              # ERC-20 mock (MEZO has no testnet deployment)
│   ├── test/
│   │   └── Taskify.t.sol             # Foundry unit tests
│   ├── script/
│   │   └── Deploy.s.sol              # Deploys mocks (if unset) + Taskify
│   ├── foundry.toml
│   └── foundry.lock                  # Pins forge-std; run `forge install` to restore lib/
│
├── frontend/                         # Next.js 16 app
│   ├── app/
│   │   ├── page.tsx                  # Landing page (incl. FAQ)
│   │   ├── register/page.tsx         # On-chain registration + GitHub/X linking
│   │   ├── tasks/page.tsx            # Browse bounties (kind, status, experience filters)
│   │   ├── tasks/[id]/page.tsx       # Task detail + lifecycle actions, per kind
│   │   ├── create/page.tsx           # Post a Development or Community task, or apply for a grant
│   │   ├── creator/page.tsx          # Creator dashboard
│   │   ├── contributor/page.tsx      # Contributor dashboard
│   │   ├── support/page.tsx          # Patron MUSD deposit — open to any registered wallet
│   │   ├── vote/page.tsx             # veBTC voting power display, grant voting
│   │   ├── leaderboard/page.tsx      # Top creators by self-funded tasks posted this wave
│   │   ├── profile/[address]/page.tsx # Public profile
│   │   ├── dashboard/page.tsx        # General dashboard
│   │   ├── settings/page.tsx         # Account settings, GitHub/X connect
│   │   ├── terms/page.tsx            # Terms & Conditions
│   │   └── api/auth/github/          # GitHub OAuth initiate + callback routes
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       └── TaskCard.tsx
│   ├── lib/
│   │   ├── constants.ts              # Contract addresses, tiers, fee helpers
│   │   ├── mock.ts                   # Mock data for UI development
│   │   ├── wallet-context.tsx        # wagmi-backed wallet/profile state
│   │   └── stubs/                    # Build-time stubs (see next.config.ts)
│   ├── app/providers.tsx             # wagmi + RainbowKit + react-query setup
│   ├── next.config.ts
│   ├── package.json
│   └── pnpm-lock.yaml
│
├── supabase/
│   └── schema.sql                    # Off-chain content + on-chain indexed-cache schema
│                                      # (see file header — not wired into the app yet)
│
├── TASKIFY_SECURITY_AUDIT.md          # Internal review of contracts/Taskify.sol (see below)
├── VOTING_SYSTEM_REDESIGN.md          # veBTC/veMEZO voting design + implementation status
├── TASKIFY.md                        # Full protocol specification
└── README.md
```

---

## Smart Contract Reference

All financial logic lives in `contracts/src/Taskify.sol`. There are no upgradeable proxies — the contract is the single source of truth. Built with OpenZeppelin's `SafeERC20` and `ReentrancyGuard`.

### Protocol Constants

```solidity
SELF_FUNDED_FEE_BPS        = 300       (3%)
GRANT_FUNDED_FEE_BPS       = 500       (5%)
TREASURY_SHARE             = 60        (% of each fee)
WAVE_POOL_SHARE            = 40        (% of each fee)
WAVE_EPOCH_DURATION        = 30 days
GRANT_VOTING_DURATION      = 3 days
EXPERIENCE_UPDATE_COOLDOWN = 1 days
MIN_TASK_AMOUNT            = 1e18      (1 MUSD, 18 decimals)
MIN_PATRON_DEPOSIT         = 50e18     (50 MUSD)
GRANT_PASS_THRESHOLD       = 70        (% of cast votes required to pass)
MAX_VE_NFTS_PER_VOTE       = 20        (per-wallet cap on veBTC NFTs aggregated in one vote — gas bound)
```

Voting weight has no divisor/formula of Taskify's own — it's a live, unscaled read of the voter's veBTC position via `getVotingWeight`/`getProposalVotingWeight`. See [Token Roles](#token-roles).

### On-Chain Storage

| Mapping | Key | Purpose |
|---|---|---|
| `users` | `address` | Username, role, experience tier, stats, GitHub/X verification |
| `tasks` | `taskId` | Title, amount, token, kind, experience range/max winners, status, assignee, deadline |
| `taskApplicantAppliedAt` | `taskId + address` | Tracks who applied (Development) or joined (Community), and when |
| `taskSubmissions` | `taskId + address` | Community-task proof-of-participation link |
| `patrons` | `address` | MUSD deposited, MEZO staked, patron tier |
| `grantVotes` / `grantVoters` | `taskId` / `taskId + address` | Running vote tallies, deadline, double-vote prevention |
| `waveSnapshots` / `waveCreatorTasks` / `waveClaims` | `waveId` (+ `address`) | Per-wave pool snapshot, per-creator task count, double-claim prevention |

### Public Functions

#### User Module
| Function | Who Can Call | Description |
|---|---|---|
| `registerUser` | Anyone | Register with username, role, experience tier, GitHub/X verification flags |
| `updateExperience` | Contributors | Update experience tier (subject to cooldown) |
| `setXVerified` | Any registered user | Link/unlink X independently of role or registration — unlocks Community tasks |

#### Development Task Module
| Function | Who Can Call | Description |
|---|---|---|
| `createTask` | Creators | Post a Development bounty and lock MUSD in escrow |
| `applyForTask` | Contributors | Apply (experience gate enforced on-chain) |
| `assignTask` | Task creator | Assign an applicant |
| `startTask` / `submitTask` | Assigned contributor | Move status to `IN_PROGRESS` / `SUBMITTED` |
| `approveAndRelease` | Task creator | Release escrowed funds to the assignee |
| `rejectSubmission` | Task creator | Reject unacceptable submitted work; reopens the task (status back to `OPEN`, assignee cleared) without refunding escrow |

#### Community Task Module
| Function | Who Can Call | Description |
|---|---|---|
| `createCommunityTask` | Creators | Post a Community bounty (max winners, no experience gate), lock MUSD in escrow |
| `joinCommunityTask` | Any registered user (not the creator) | Join with a proof-of-participation link |
| `selectWinners` | Task creator | Pick up to N joined addresses; splits escrow evenly, pays all in one tx |

#### Shared Task Lifecycle
| Function | Who Can Call | Description |
|---|---|---|
| `cancelTask` | Task creator | Cancel an `OPEN` self-funded task and refund net escrow; reverses this wave's creator task credit if the task was created in the still-live wave |
| `markExpired` | Anyone | Trigger expiry after deadline, refunding the creator — only for tasks still at `OPEN`/`ASSIGNED`/`IN_PROGRESS`; a pending grant vote or a contributor's submitted work can never be swept by expiry (see `TASKIFY_SECURITY_AUDIT.md` F-233716/F-233658) |

#### Grant Pool Module
| Function | Who Can Call | Description |
|---|---|---|
| `depositToPool` | Any registered wallet | Permanently deposit MUSD into the patron pool — funds grants and Patron tiers, no longer grants votes |
| `applyForGrant` | Creators | Submit a grant-funded Development task proposal, including the work duration if approved (1–180 days) |
| `voteOnGrant` | Any registered wallet, approved voters only (pilot whitelist), weighted by live veBTC position on Mezo Earn | Cast a vote for or against a grant |
| `executeGrant` | Anyone | Execute the grant decision after voting closes |

#### Wave Rewards Module
| Function | Who Can Call | Description |
|---|---|---|
| `advanceWave` | Anyone, once the epoch has elapsed | Close the current wave and snapshot it |
| `claimWaveReward` | Creators | Claim proportional share of a completed wave pool |
| `claimStrandedWaveFunds` | Anyone | Sweep a closed wave's pool to the treasury, but only if it recorded zero self-funded tasks (i.e. its fees came entirely from approved grants, so no creator has a claim on it) |

### Task Lifecycle

```
Development, grant-funded:   GRANT_PENDING → OPEN → ASSIGNED → IN_PROGRESS → SUBMITTED → FUNDS_RELEASED
Development, self-funded:                    OPEN → ASSIGNED → IN_PROGRESS → SUBMITTED → FUNDS_RELEASED
Community (always self-funded):              OPEN → FUNDS_RELEASED   (skips the assign/start/submit chain)
Dead ends:                                   OPEN → CANCELLED
                                              Any active status → EXPIRED
                                       GRANT_PENDING → GRANT_REJECTED
```

### Patron Tiers

| Tier | Minimum Cumulative MUSD Deposited |
|---|---|
| Bronze | 100 MUSD |
| Silver | 500 MUSD |
| Gold | 1,000 MUSD |
| Diamond | 5,000 MUSD |

### Voting Weight

Not a formula Taskify computes — a live external read. `getProposalVotingWeight(taskId, account)` aggregates every veBTC NFT `account` holds via Mezo's own `IMezoVotingEscrow.getPastVotes`, as of the proposal's locked snapshot timestamp and escrow address (fixed at `applyForGrant` time so neither a later position change nor an escrow-address change can retroactively affect an open vote — see [`TASKIFY_SECURITY_AUDIT.md`](TASKIFY_SECURITY_AUDIT.md) finding H-1). MUSD deposited and Patron tier play no role in voting weight at all.

---

## User Roles & Identity

Task-kind eligibility is decoupled from `Role` — a Contributor who links X can pick up Community tasks on the same wallet without re-registering.

### Creator
Posts Development tasks (locks MUSD, sets an experience range) or Community tasks (locks MUSD, sets a max winner count), or applies for community-funded grants. Receives wave rewards proportional to self-funded tasks posted per epoch.

### Contributor
Finds Development work via the experience-matched task feed, applies on-chain, and earns MUSD when the creator approves. GitHub verification is expected for this path. Can *also* join Community tasks if X-linked — same wallet, no re-registration.

### Support & Voting — capabilities, not a role
Any registered wallet, Creator or Contributor, can support the grant pool and/or vote on grants; neither requires the other. Depositing MUSD permanently into the grant pool (see `/support`) is ecosystem patronage, not a loan, and earns a patron tier based on cumulative deposits, but grants no voting power on its own. Voting on grant proposals (see `/vote`) uses the veBTC position already held on Mezo Earn, read live and never custodied by Taskify, and currently requires being on the pilot approved-voter whitelist in addition to holding real veBTC weight — independent of role and of having deposited anything.

### GitHub vs. X verification
Both are self-declared booleans on `User` (`githubVerified`, `xVerified`) — the contract trusts whatever the frontend passes at registration (or later, for X, via `setXVerified`). GitHub verification is backed by real OAuth today (see `frontend/app/api/auth/github`); X verification is currently self-declared, a placeholder for real OAuth later.

---

## Financial Model

### Fee Collection

| Task Type | Fee Rate | Example (10,000 MUSD task) |
|---|---|---|
| Self-Funded (Development or Community) | 3% | 300 MUSD collected at creation |
| Grant-Funded (Development only) | 5% | 500 MUSD collected at `executeGrant` |

### Fee Distribution

```
60% → Platform Treasury     (protocol revenue)
40% → Wave Creator Pool     (returned to active self-funded creators every ~30 days)
```

For non-MUSD token tasks, 100% of the fee goes to the treasury (wave pool only accumulates MUSD).

---

## Token Roles

### MUSD (Primary)
MUSD is Mezo's native Bitcoin-backed stablecoin. It is the default unit for task escrow, grant pool deposits, and wave rewards. Contributors receive a stable, predictable payout with no price exposure.

### MEZO (Payment Only)
MEZO is Mezo's native token. Tasks can be posted and paid in MEZO the same way they can in MUSD — it has no governance role of its own on Taskify. Pairing a veMEZO lock with a veBTC position via Mezo's Matching Market can boost that veBTC position's voting weight (see below), but plain MEZO holdings contribute nothing.

### veBTC (Governance — read live, not custodied)
Grant voting weight comes entirely from a patron's veBTC position on Mezo Earn — Mezo's own vote-escrow product, external to Taskify. Lock BTC there to mint veBTC; Taskify reads that weight live via `getVotingWeight`/`getProposalVotingWeight`, never custodying it. Deposits into Taskify's own grant pool (MUSD) are fully decoupled from voting weight — funding and governance are separate systems. Voting is currently limited to a pilot whitelist of approved veBTC holders (`approvedVoters`/`setApprovedVoters`) while the platform bootstraps. See [`VOTING_SYSTEM_REDESIGN.md`](VOTING_SYSTEM_REDESIGN.md) for the full design.

### Task Tokens
The `token` field on each task stores an ERC-20 contract address, restricted to MUSD or MEZO (`InvalidToken()` otherwise — see [`TASKIFY_SECURITY_AUDIT.md`](TASKIFY_SECURITY_AUDIT.md) finding M-1). For non-MUSD tasks, wave pool tracking is disabled.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Mezo (Bitcoin-secured EVM L2) |
| Smart Contract Language | Solidity ^0.8.24 |
| Token Standard | ERC-20 (OpenZeppelin `SafeERC20`) |
| Contract Tooling | Foundry (forge, via-ir + optimizer enabled — see [Security Model](#security-model)) |
| Contract Testing | Forge (Solidity tests) |
| Frontend | Next.js 16, TypeScript |
| Wallet Integration | wagmi, viem, RainbowKit |
| Off-chain data (planned) | Supabase / Postgres — see `supabase/schema.sql` |
| Package Manager | pnpm (frontend), Foundry (contracts) |

---

## Local Development

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Foundry** — install via `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### 1. Clone and Install

```bash
git clone https://github.com/Godbrand0/Tasked.git
cd Tasked
cd frontend && pnpm install
```

### 2. Configure Environment

```bash
cp frontend/.env.local.example frontend/.env.local   # or create it — see below
```

### 3. Run the Frontend Dev Server

```bash
cd frontend
pnpm dev
```

App available at `http://localhost:3000`.

### 4. Contracts — Install Dependencies, Build, Test

```bash
cd contracts
forge install         # restores lib/forge-std, lib/openzeppelin-contracts (gitignored, pinned via foundry.lock)
forge build --sizes   # optimizer must stay on — see Security Model
forge test
forge fmt --check
```

### 5. Deploy Contracts

Already deployed to Mezo testnet at `0x3e72A1E45CD5c499f1fd48C8f102Bf6C28381F69` (see [Contract Addresses](#contract-addresses)) — the frontend points at this address by default via `NEXT_PUBLIC_TASKIFY_CONTRACT`. To redeploy your own instance:

```bash
cd contracts
cp .env.example .env   # fill in PRIVATE_KEY (funded via https://faucet.test.mezo.org)
forge script script/Deploy.s.sol --rpc-url https://rpc.test.mezo.org --broadcast
```

Both `MUSD_ADDRESS` and `MEZO_ADDRESS` in `contracts/.env` default to the real Mezo testnet tokens — MEZO turned out to have a live deployment on testnet at the same address as mainnet, so no mock is needed on either token. Set them to `MockMUSD`/`MockMEZO` addresses instead if you want unlimited test balances without a faucet.

---

## Environment Variables

Create `frontend/.env.local`:

```bash
# Google OAuth — the required registration identity. Create credentials at
# https://console.cloud.google.com/apis/credentials and add
# `${NEXT_PUBLIC_BASE_URL}/api/auth/google/callback` as an authorized redirect URI.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub / X OAuth — optional, linked later from Settings (not required to register)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
X_CLIENT_ID=
X_CLIENT_SECRET=

NEXT_PUBLIC_BASE_URL=http://localhost:3000

# WalletConnect Cloud project ID — get one at https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# Mezo network (defaults below already match testnet if unset)
NEXT_PUBLIC_MEZO_CHAIN_ID=31611
NEXT_PUBLIC_MEZO_RPC_URL=https://rpc.test.mezo.org
NEXT_PUBLIC_MEZO_EXPLORER_URL=https://explorer.test.mezo.org

# Token contracts — both default to the real Mezo testnet deployments if unset
NEXT_PUBLIC_MUSD_CONTRACT=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
NEXT_PUBLIC_MEZO_CONTRACT=0x7B7c000000000000000000000000000000000001

# Taskify contract (see Contract Addresses) — required for every on-chain
# read/write in the app; leave unset only if you haven't deployed yet.
NEXT_PUBLIC_TASKIFY_CONTRACT=0x3e72A1E45CD5c499f1fd48C8f102Bf6C28381F69
```

---

## Contract Addresses

### Mezo Testnet (chain id `31611`)

| Contract | Address |
|---|---|
| Taskify | `0x3e72A1E45CD5c499f1fd48C8f102Bf6C28381F69` |
| MUSD (official) | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |
| MEZO (official) | `0x7B7c000000000000000000000000000000000001` — same address as mainnet, live on testnet too |

### Mezo Mainnet (chain id `31612`)

| Contract | Address |
|---|---|
| Taskify | _not yet deployed_ |
| MUSD (official) | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` |
| MEZO (official) | `0x7B7c000000000000000000000000000000000001` |

Sourced from [mezo.org/docs/users/resources/contracts-reference](https://mezo.org/docs/users/resources/contracts-reference/); verify before relying on them for anything beyond local development.

---

## Security Model

- **Reentrancy guard** — state-changing escrow functions (`createTask`, `createCommunityTask`, `approveAndRelease`, `rejectSubmission`, `cancelTask`, `markExpired`, `selectWinners`, `claimWaveReward`, `claimStrandedWaveFunds`) are wrapped in OpenZeppelin's `ReentrancyGuard`.
- **SafeERC20** — all token transfers use `safeTransfer`/`safeTransferFrom`, tolerating non-standard ERC-20 return-value behavior.
- **Token allowlist on task creation** — `createTask`/`createCommunityTask` revert `InvalidToken()` for anything other than `musd`/`mezo`, so escrow can't be opened in an arbitrary, potentially malicious ERC-20 — see `TASKIFY_SECURITY_AUDIT.md` finding M-1.
- **Expiry can't touch in-flight work or votes** — `markExpired` only accepts `OPEN`/`ASSIGNED`/`IN_PROGRESS`; a pending grant proposal or a contributor's already-submitted work can never be refunded out from under them by expiry — see `TASKIFY_SECURITY_AUDIT.md` findings F-233716/F-233658.
- **Experience gating is on-chain** — `applyForTask` enforces the range at the contract level for Development tasks; a non-conforming call reverts with `ExperienceMismatch()`. Community tasks intentionally have no such gate.
- **Task-kind isolation** — `applyForTask`/`assignTask` revert `TaskKindMismatch()` on a Community task and vice versa for `joinCommunityTask`/`selectWinners`, so the two lifecycles can't cross-contaminate shared storage.
- **Double-claim / double-vote protection** — `grantVoters` and `waveClaims` mappings prevent double voting and double claiming.
- **Owner-only controls** — `setTreasuryAddress` (also rejects the zero address, see finding F-233721), `setVeBTCEscrow`, `setVeMEZOEscrow`, `setApprovedVoters`, and `transferOwnership` are restricted to `CONTRACT_OWNER`. `CONTRACT_OWNER` is mutable (not `immutable`) specifically so it can be rotated to a multisig or recovered from a compromised key via `transferOwnership` without a redeploy — see `TASKIFY_SECURITY_AUDIT.md` finding L-2. `advanceWave` is intentionally permissionless (pure time-check, no economic decision in it) so wave rewards can never get stuck on an inactive owner.
- **Deployment requires the optimizer enabled** (`optimizer = true`, `via_ir = true` in `foundry.toml`) — with it off, the contract's runtime bytecode exceeds the EIP-170 24,576-byte limit and cannot be deployed to any EVM chain. Always confirm with `forge build --sizes` before deploying.

For the current Solidity contract, see [`TASKIFY_SECURITY_AUDIT.md`](TASKIFY_SECURITY_AUDIT.md) — an internal review (one High, one Medium, two Low findings, all fixed and covered by regression tests in `contracts/test/SecurityAudit.t.sol`). That review is **not a substitute for a professional third-party audit**, which is still needed before deploying with real funds.
