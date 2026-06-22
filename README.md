# Tasked

> Trustless bounty escrow, community-governed grants, and experience-matched work — built on Stacks with Clarity.

Tasked is a fully on-chain bounty protocol that connects task creators, contributors, and investors through Clarity smart contracts on the Stacks blockchain (Bitcoin-secured). Every payment is enforced on-chain. Every contributor is GitHub-verified. No escrow agent, no payment processor, no central party.

**Live Demo:** _coming soon_
**Contract (Stacks Testnet):** _TBD_

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Experience Matching](#experience-matching)
3. [Repository Structure](#repository-structure)
4. [Smart Contract Reference](#smart-contract-reference)
5. [User Roles](#user-roles)
6. [Financial Model](#financial-model)
7. [Token Roles](#token-roles)
8. [Tech Stack](#tech-stack)
9. [Local Development](#local-development)
10. [Environment Variables](#environment-variables)
11. [Contract Addresses](#contract-addresses)
12. [Security Model](#security-model)

---

## How It Works

### Self-Funded Tasks

1. A creator registers on-chain, then posts a task with a USDX reward and an experience range.
2. USDX transfers into the contract at creation — the funds are locked in escrow immediately.
3. Contributors whose experience level falls within the task's range can apply on-chain.
4. The creator assigns one applicant; the assignee starts and then submits work.
5. The creator calls `approve-and-release` — USDX transfers directly to the contributor's address. No intermediary, no delay.

### Grant-Funded Tasks

1. A creator applies for a grant, specifying the amount and experience range needed.
2. A 3-day on-chain voting window opens. Investors (patrons) vote for or against; weight is proportional to their USDX deposited plus staked STX.
3. If approved, the USDX moves from the patron pool into escrow and the task becomes `OPEN`.
4. From there the task follows the same lifecycle as a self-funded task.

### Wave Rewards

Every ~7 days a fee distribution wave closes. 40% of all collected protocol fees are distributed proportionally to active creators based on the number of tasks they posted that wave. This creates a flywheel: more tasks → more fees → larger creator reward pool → incentive to post more tasks.

---

## Experience Matching

Experience levels are discrete integer tiers stored on-chain. When a creator posts a task they set a minimum and maximum tier. When a contributor registers they declare their own tier. The `apply-for-task` function enforces the gate at the contract level — applications outside the allowed range are rejected by the contract, not just filtered in the UI.

| Tier | Label | Approximate Experience |
|---|---|---|
| `0` | Newcomer | 0 – 1 year |
| `1` | Junior | 1 – 2 years |
| `2` | Mid-level | 2 – 3 years |
| `3` | Senior | 3 – 5 years |
| `4` | Staff / Expert | 5+ years |

Contributors can update their tier at any time via `update-experience`, but a ~1-day on-chain cooldown (`EXPERIENCE-UPDATE-COOLDOWN = 144 blocks`) applies after each update to prevent gaming active application windows.

---

## Repository Structure

```
Tasked/
├── contract/                         # Clarinet project (Clarity smart contracts)
│   ├── contracts/
│   │   ├── tasked.clar               # Core protocol contract
│   │   ├── usdx-token.clar           # SIP-010 USDX token contract
│   │   └── sip-010-trait-ft.clar     # SIP-010 fungible token trait
│   ├── tests/
│   │   └── tasked.test.ts            # Clarinet unit tests (Vitest)
│   ├── deployments/
│   │   └── default.simnet-plan.yaml  # Simnet deployment plan
│   ├── settings/
│   │   └── Devnet.toml               # Local devnet config
│   └── Clarinet.toml
│
├── frontend/                         # Next.js 16 app
│   ├── app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── register/page.tsx         # On-chain user registration
│   │   ├── tasks/page.tsx            # Browse bounties (experience-filtered)
│   │   ├── tasks/[id]/page.tsx       # Task detail + lifecycle actions
│   │   ├── create/page.tsx           # Post a task or apply for a grant
│   │   ├── creator/page.tsx          # Creator dashboard
│   │   ├── contributor/page.tsx      # Contributor dashboard
│   │   ├── investor/page.tsx         # Patron deposit, STX stake, grant voting
│   │   ├── leaderboard/page.tsx      # Top contributors by USDX earned
│   │   ├── profile/[address]/page.tsx # Public contributor profile
│   │   ├── dashboard/page.tsx        # General dashboard
│   │   └── settings/page.tsx         # Account settings
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       └── TaskCard.tsx
│   ├── lib/
│   │   ├── constants.ts              # Contract addresses, enums, tier labels
│   │   └── mock.ts                   # Mock data for UI development
│   ├── public/
│   ├── next.config.ts
│   ├── package.json
│   └── pnpm-lock.yaml
│
├── Tasked_Contract_Security_Audit.docx
├── TASKED.md                         # Full protocol specification
└── README.md
```

---

## Smart Contract Reference

All financial logic lives in `contract/contracts/tasked.clar`. There are no upgradeable proxies — the contract is the single source of truth.

### Protocol Constants

```clarity
SELF-FUNDED-FEE-BPS     = 300    (3%)
GRANT-FUNDED-FEE-BPS    = 500    (5%)
TREASURY-SHARE          = 60%    of each fee
WAVE-POOL-SHARE         = 40%    of each fee
WAVE-EPOCH-BLOCKS       = 1008   (~7 days at 10 min/block)
GRANT-VOTING-BLOCKS     = 432    (~3 days)
MIN-TASK-AMOUNT         = 1 USDX (u1000000, 6 decimals)
MIN-STX-STAKE           = 1 STX  (u1000000, 6 decimals)
STX-VOTE-MULTIPLIER     = 10
EXPERIENCE-UPDATE-COOLDOWN = 144 blocks (~1 day)
```

### On-Chain Data Maps

| Map | Key | Purpose |
|---|---|---|
| `users` | `principal` | Username, role, experience tier, stats, GitHub verification |
| `tasks` | `task-id` | Title, amount, token, experience range, status, assignee, deadline |
| `task-applicants` | `task-id + principal` | Tracks who has applied to a task |
| `patrons` | `principal` | USDX deposited, STX staked, patron tier |
| `grant-votes` | `task-id` | Running vote tallies and deadline |
| `grant-voters` | `task-id + principal` | Prevents double voting |
| `wave-snapshots` | `wave-id` | Immutable snapshot of each completed wave |
| `wave-creator-tasks` | `wave-id + principal` | Per-creator task count per wave |
| `wave-claims` | `wave-id + principal` | Prevents double claiming wave rewards |

### Public Functions

#### User Module
| Function | Who Can Call | Description |
|---|---|---|
| `register-user` | Anyone | Register with a username, role, and experience tier |
| `update-experience` | Contributors | Update experience tier (subject to cooldown) |

#### Task Escrow Module
| Function | Who Can Call | Description |
|---|---|---|
| `create-task` | Creators | Post a bounty and lock USDX in escrow |
| `apply-for-task` | Contributors | Apply (experience gate enforced on-chain) |
| `assign-task` | Task creator | Assign an applicant |
| `start-task` | Assigned contributor | Move status to `IN_PROGRESS` |
| `submit-task` | Assigned contributor | Move status to `SUBMITTED` |
| `approve-and-release` | Task creator | Release escrowed funds to contributor |
| `cancel-task` | Task creator | Cancel an `OPEN` self-funded task and refund net escrow |
| `mark-expired` | Anyone | Trigger expiry after deadline; refunds creator or grant pool |

#### Grant Pool Module
| Function | Who Can Call | Description |
|---|---|---|
| `deposit-to-pool` | Investors | Permanently deposit USDX into the patron pool |
| `stake-stx` | Investors | Stake STX to amplify governance voting weight |
| `unstake-stx` | Investors | Withdraw staked STX at any time |
| `apply-for-grant` | Creators | Submit a grant-funded task proposal |
| `vote-on-grant` | Patrons | Cast a weighted vote for or against a grant |
| `execute-grant` | Anyone | Execute the grant decision after voting closes |

#### Wave Rewards Module
| Function | Who Can Call | Description |
|---|---|---|
| `advance-wave` | Contract owner | Close the current wave and snapshot it |
| `claim-wave-reward` | Creators | Claim proportional share of the completed wave pool |

### Task Lifecycle

```
Grant-funded:   GRANT_PENDING → OPEN → ASSIGNED → IN_PROGRESS → SUBMITTED → FUNDS_RELEASED
Self-funded:                    OPEN → ASSIGNED → IN_PROGRESS → SUBMITTED → FUNDS_RELEASED
Dead ends:                      OPEN → CANCELLED
                                Any active status → EXPIRED
                         GRANT_PENDING → GRANT_REJECTED
```

### Read-Only Functions

`get-user`, `get-task`, `get-patron`, `get-grant-vote`, `get-task-applicant`, `get-grant-voter`, `get-wave-snapshot`, `get-wave-creator-tasks`, `get-wave-claim`, `get-treasury-address`, `get-next-task-id`, `get-current-wave`, `get-grant-pool-balance`

### Patron Tiers

| Tier | Minimum Cumulative USDX Deposited |
|---|---|
| Bronze | 100 USDX |
| Silver | 500 USDX |
| Gold | 1,000 USDX |
| Diamond | 5,000 USDX |

### Voting Weight Formula

```
voting-weight = total-usdx-deposited + (stx-staked × STX-VOTE-MULTIPLIER)
```

With a multiplier of 10, staking 1,000 STX adds 10,000 USDX-equivalent voting units.

---

## User Roles

### Creator
Posts self-funded tasks (locks USDX at creation) or applies for community-funded grants. Receives wave rewards proportional to tasks posted per epoch. No GitHub requirement.

### Contributor
Finds work via the experience-matched task feed, applies on-chain, and earns USDX directly to their wallet when the creator approves. GitHub verification is required. On-chain reputation (tasks completed, total earned, tier) is portable across the ecosystem.

### Investor (Patron)
Deposits USDX permanently into the grant pool and stakes STX to amplify governance weight. Votes on grant proposals. Earns a patron tier based on cumulative deposits. Deposits are non-withdrawable — this is ecosystem patronage, not a loan.

---

## Financial Model

### Fee Collection

| Task Type | Fee Rate | Example (10,000 USDX task) |
|---|---|---|
| Self-Funded | 3% | 300 USDX collected at creation |
| Grant-Funded | 5% | 500 USDX collected at `execute-grant` |

### Fee Distribution

```
60% → Platform Treasury     (protocol revenue)
40% → Wave Creator Pool     (returned to active creators every ~7 days)
```

For non-USDX token tasks, 100% of the fee goes to the treasury (wave pool only accumulates USDX).

### Revenue Projections

| Monthly Tasks | Avg Task Size | Total Fees | Treasury (60%) | Creator Pool (40%) |
|---|---|---|---|---|
| 100 | 500 USDX | 1,500 USDX | 900 USDX | 600 USDX |
| 500 | 500 USDX | 7,500 USDX | 4,500 USDX | 3,000 USDX |
| 1,000 | 1,000 USDX | 30,000 USDX | 18,000 USDX | 12,000 USDX |

---

## Token Roles

### USDX (Primary)
USDX is a Bitcoin-backed stablecoin native to the Stacks ecosystem. It is the default unit for all financial operations — task escrow, grant pool deposits, wave rewards, and governance weight. Contributors receive a stable, predictable payout with no price exposure.

### STX (Governance Amplifier)
STX is the native Stacks chain token. Patrons stake STX to amplify their grant voting weight. Staked STX is always withdrawable with no lockup or slashing.

### Multi-Token Tasks
The `token` field in each task stores a SIP-010 contract principal. Tasks can escrow STX or any other SIP-010 token without a contract upgrade. For non-USDX tasks, wave pool tracking is disabled.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stacks (Bitcoin-secured L1.5) |
| Smart Contract Language | Clarity |
| Token Standard | SIP-010 fungible token |
| Contract Tooling | Clarinet, Clarinet SDK |
| Contract Testing | Vitest + vitest-environment-clarinet |
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| Wallet Integration | @stacks/connect, @stacks/transactions |
| Package Manager | pnpm |
| Deployment | Vercel |

---

## Local Development

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Clarinet** — install via `brew install clarinet` or download from [Hiro](https://github.com/hirosystems/clarinet)

### 1. Clone and Install

```bash
git clone https://github.com/Godbrand0/Tasked.git
cd Tasked
cd frontend && pnpm install
```

### 2. Configure Environment

```bash
cp frontend/.env.example frontend/.env.local
# Fill in values — see Environment Variables section below
```

### 3. Run the Frontend Dev Server

```bash
cd frontend
pnpm dev
```

App available at `http://localhost:3000`.

### 4. Run Contract Tests

```bash
cd contract
npm test
```

### 5. Check Contract Syntax

```bash
cd contract
clarinet check
```

### 6. Local Devnet (Full Stack)

Spins up a local Stacks node, Bitcoin node, and Stacks API:

```bash
cd contract
clarinet integrate
```

### 7. Watch Mode (Contract Tests)

Re-runs tests on every `.clar` or `.ts` change:

```bash
cd contract
npm run test:watch
```

---

## Environment Variables

Create `frontend/.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# JWT signing secret
JWT_SECRET=

# Stacks network ("testnet" | "mainnet")
NEXT_PUBLIC_STACKS_NETWORK=testnet

# Contract addresses
NEXT_PUBLIC_TASKED_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.tasked
NEXT_PUBLIC_USDX_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdx-token

# App base URL (used by GitHub OAuth callback)
FRONTEND_URL=http://localhost:3000
```

---

## Contract Addresses

### Stacks Testnet

| Contract | Address |
|---|---|
| Tasked | _TBD_ |
| USDX Token | _TBD_ |

---

## Security Model

Clarity's decidable execution model provides structural security guarantees that differ from Solidity:

- **No re-entrancy by construction** — Clarity has no dynamic dispatch, so re-entrancy attacks cannot occur.
- **Post-conditions** — Stacks wallets can assert the exact token amounts that will leave the signing account before broadcast. This replaces the ERC-20 `approve` + `transferFrom` pattern and prevents approval griefing.
- **Experience gating is on-chain** — The `apply-for-task` function enforces the experience range at the contract level. It is not a UI suggestion; a non-conforming call is rejected with `ERR-EXPERIENCE-MISMATCH (u1010)`.
- **Double-claim protection** — `grant-voters` and `wave-claims` maps prevent double voting and double claiming respectively.
- **Owner-only controls** — `advance-wave` and `set-treasury-address` are restricted to `CONTRACT-OWNER` (the deployer). No other privileged operations exist.

A security audit is included in `Tasked_Contract_Security_Audit.docx`.

For the full protocol specification including architecture decision records and ecosystem impact analysis, see [TASKED.md](TASKED.md).
