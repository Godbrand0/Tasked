# Taskify

> Trustless bounty escrow, community-governed grants, and both experience-matched and open-to-anyone work — built on Mezo with Solidity.

Taskify is a fully on-chain bounty protocol on **Mezo** (a Bitcoin-secured EVM L2) that connects task creators, contributors, and investors through a single Solidity contract. Every payment is enforced on-chain. No escrow agent, no payment processor, no central party.

Two kinds of task live side by side on one board:

- **Development tasks** — experience-tier gated, one contributor applies and is assigned, paid on approval. GitHub-verified.
- **Community tasks** — open to any registered wallet (memes, bug write-ups, social bounties — no code required). Anyone joins with a proof-of-participation link; the creator picks up to *N* winners and the escrow splits evenly between them in one transaction. X-verified.

**Live Demo:** [taskifybounties.vercel.app](https://taskifybounties.vercel.app/)
**Contract (Mezo Testnet):** [`0x6DBca3d5bC3dE26741c80a5A284483BBb8EDACCb`](https://explorer.test.mezo.org/address/0x6DBca3d5bC3dE26741c80a5A284483BBb8EDACCb) — see [Contract Addresses](#contract-addresses)

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
5. The creator calls `approveAndRelease` — MUSD transfers directly to the contributor's wallet. No intermediary, no delay.

### Community Tasks (Self-Funded, Multi-Winner)

1. A creator posts a task via `createCommunityTask` with a MUSD reward and a max winner count (up to 20) instead of an experience range. MUSD locks in escrow the same way.
2. Any registered wallet — any role, no experience tier required — can `joinCommunityTask` with a link proving participation (a post, a write-up, anything public).
3. The creator reviews submissions off-chain and calls `selectWinners` with up to *N* addresses. The contract validates each one actually joined, splits the net escrow evenly between them (remainder from integer division goes to the last winner), and pays everyone in a single transaction.

### Grant-Funded Tasks (Development only, for now)

1. A creator applies for a grant via `applyForGrant`, specifying the amount and experience range needed.
2. A 3-day on-chain voting window opens. Investors (patrons) vote for or against; weight is proportional to their MUSD deposited plus staked MEZO.
3. If approved, MUSD moves from the patron pool into escrow and the task becomes `OPEN`, following the same lifecycle as a self-funded Development task.

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
├── contract/                         # Legacy Clarinet project (Clarity) — superseded by contracts/
│                                      # Kept for reference; not deployed, not maintained.
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
│   │   ├── investor/page.tsx         # Patron deposit, MEZO stake, grant voting
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
├── Tasked_Contract_Security_Audit.docx  # Audit of the legacy Clarity contract — does NOT
│                                         # cover contracts/Taskify.sol (unaudited, see below)
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
MIN_MEZO_STAKE             = 1e18      (1 MEZO)
MIN_PATRON_DEPOSIT         = 50e18     (50 MUSD)
MUSD_VOTE_DIVISOR          = 1e13      (100 MUSD deposited = 10 vote units)
MEZO_VOTE_DIVISOR          = 1e14      (1,000 MEZO staked = 10 vote units)
GRANT_PASS_THRESHOLD       = 70        (% of cast votes required to pass)
```

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

#### Community Task Module
| Function | Who Can Call | Description |
|---|---|---|
| `createCommunityTask` | Creators | Post a Community bounty (max winners, no experience gate), lock MUSD in escrow |
| `joinCommunityTask` | Any registered user (not the creator) | Join with a proof-of-participation link |
| `selectWinners` | Task creator | Pick up to N joined addresses; splits escrow evenly, pays all in one tx |

#### Shared Task Lifecycle
| Function | Who Can Call | Description |
|---|---|---|
| `cancelTask` | Task creator | Cancel an `OPEN` self-funded task and refund net escrow |
| `markExpired` | Anyone | Trigger expiry after deadline; refunds creator or grant pool |

#### Grant Pool Module
| Function | Who Can Call | Description |
|---|---|---|
| `depositToPool` | Investors | Permanently deposit MUSD into the patron pool |
| `stakeMezo` / `unstakeMezo` | Investors | Stake/unstake MEZO to amplify governance voting weight (no lockup) |
| `applyForGrant` | Creators | Submit a grant-funded Development task proposal |
| `voteOnGrant` | Patrons | Cast a weighted vote for or against a grant |
| `executeGrant` | Anyone | Execute the grant decision after voting closes |

#### Wave Rewards Module
| Function | Who Can Call | Description |
|---|---|---|
| `advanceWave` | Contract owner | Close the current wave and snapshot it |
| `claimWaveReward` | Creators | Claim proportional share of a completed wave pool |

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

### Voting Weight Formula

```
votingWeight = (musdDeposited / 1e13) + (mezoStaked / 1e14)
```

100 MUSD deposited ≈ 10 vote units; 1,000 MEZO staked ≈ 10 vote units.

---

## User Roles & Identity

Task-kind eligibility is decoupled from `Role` — a Contributor who links X can pick up Community tasks on the same wallet without re-registering.

### Creator
Posts Development tasks (locks MUSD, sets an experience range) or Community tasks (locks MUSD, sets a max winner count), or applies for community-funded grants. Receives wave rewards proportional to self-funded tasks posted per epoch.

### Contributor
Finds Development work via the experience-matched task feed, applies on-chain, and earns MUSD when the creator approves. GitHub verification is expected for this path. Can *also* join Community tasks if X-linked — same wallet, no re-registration.

### Investor (Patron)
Deposits MUSD permanently into the grant pool and stakes MEZO to amplify governance weight. Votes on grant proposals. Earns a patron tier based on cumulative deposits. Deposits are non-withdrawable — this is ecosystem patronage, not a loan. MEZO stake has no lockup.

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
MUSD is Mezo's native Bitcoin-backed stablecoin. It is the default unit for all financial operations — task escrow, grant pool deposits, wave rewards, and governance weight. Contributors receive a stable, predictable payout with no price exposure.

### MEZO (Governance Amplifier)
MEZO is Mezo's governance token. Patrons stake MEZO to amplify their grant voting weight. Staked MEZO is always withdrawable with no lockup or slashing.

### Multi-Token Tasks
The `token` field on each task stores an ERC-20 contract address. Tasks can escrow MEZO or any other ERC-20 without a contract upgrade. For non-MUSD tasks, wave pool tracking is disabled.

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

Already deployed to Mezo testnet at `0x6DBca3d5bC3dE26741c80a5A284483BBb8EDACCb` (see [Contract Addresses](#contract-addresses)) — the frontend points at this address by default via `NEXT_PUBLIC_TASKIFY_CONTRACT`. To redeploy your own instance:

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
# GitHub OAuth (registration identity)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
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
NEXT_PUBLIC_TASKIFY_CONTRACT=0x6DBca3d5bC3dE26741c80a5A284483BBb8EDACCb
```

---

## Contract Addresses

### Mezo Testnet (chain id `31611`)

| Contract | Address |
|---|---|
| Taskify | `0x6DBca3d5bC3dE26741c80a5A284483BBb8EDACCb` |
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

- **Reentrancy guard** — state-changing escrow functions (`createTask`, `createCommunityTask`, `approveAndRelease`, `cancelTask`, `markExpired`, `selectWinners`, `claimWaveReward`) are wrapped in OpenZeppelin's `ReentrancyGuard`.
- **SafeERC20** — all token transfers use `safeTransfer`/`safeTransferFrom`, tolerating non-standard ERC-20 return-value behavior.
- **Experience gating is on-chain** — `applyForTask` enforces the range at the contract level for Development tasks; a non-conforming call reverts with `ExperienceMismatch()`. Community tasks intentionally have no such gate.
- **Task-kind isolation** — `applyForTask`/`assignTask` revert `TaskKindMismatch()` on a Community task and vice versa for `joinCommunityTask`/`selectWinners`, so the two lifecycles can't cross-contaminate shared storage.
- **Double-claim / double-vote protection** — `grantVoters` and `waveClaims` mappings prevent double voting and double claiming.
- **Owner-only controls** — `advanceWave` and `setTreasuryAddress` are restricted to `CONTRACT_OWNER` (the deployer). No other privileged operations exist.
- **Deployment requires the optimizer enabled** (`optimizer = true`, `via_ir = true` in `foundry.toml`) — with it off, the contract's runtime bytecode exceeds the EIP-170 24,576-byte limit and cannot be deployed to any EVM chain. Always confirm with `forge build --sizes` before deploying.

**`Tasked_Contract_Security_Audit.docx` covers the legacy Clarity contract in `contract/`, not `contracts/Taskify.sol`.** The current Solidity contract has a Foundry test suite (`forge coverage` to check current numbers) but has not been independently audited — treat accordingly before deploying with real funds.

For the full protocol specification including architecture decision records and ecosystem impact analysis, see [TASKIFY.md](TASKIFY.md).
