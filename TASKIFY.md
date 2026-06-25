# Taskify — The On-Chain Bounty Board for the Stacks Ecosystem

> Trustless task escrow, community-governed grant funding, and experience-matched bounties — built on Stacks with Clarity.

**Live Demo:** _coming soon_
**Contract (Stacks Testnet):** _TBD_

---

## Table of Contents

1. [Overview](#overview)
2. [What Changes from the EVM Version](#what-changes-from-the-evm-version)
3. [Experience Matching System](#experience-matching-system)
4. [Project Architecture](#project-architecture)
5. [Smart Contract](#smart-contract)
6. [User Flows](#user-flows)
   - [Creator](#creator-flow)
   - [Contributor](#contributor-flow)
   - [Investor / Patron](#investor--patron-flow)
7. [Financial Model](#financial-model)
8. [Token Roles](#token-roles)
   - [USDX](#the-role-of-usdx)
   - [STX](#the-role-of-stx)
9. [Ecosystem Importance](#ecosystem-importance)
10. [Tech Stack](#tech-stack)
11. [Local Development](#local-development)
12. [Environment Variables](#environment-variables)
13. [Contract Addresses](#contract-addresses)

---

## Overview

Taskify is a fully on-chain bounty protocol built on **Stacks** — a Bitcoin-secured smart contract layer — that connects task creators, contributors, and investors through trustless escrow, community-governed grant funding, and an **experience-based task matching system**.

When a creator posts a task they specify the experience range required (e.g. 0–1 years, 2–3 years). When contributors register, they declare their own experience level. The protocol surfaces only the tasks that fit each contributor's declared experience — reducing noise, improving match quality, and building a more professional marketplace.

Every payment is enforced by a Clarity smart contract. Every contributor is GitHub-verified. Every grant is decided by the community.

The core difference from traditional bounty platforms: **no trust is required**. USDX locks in the contract the moment a task is created. Funds do not move until the creator approves work on-chain. No escrow agent, no payment processor, no central party.

---

## What Changes from the EVM Version

| Dimension | EVM / Mezo version | Taskify / Stacks version |
|---|---|---|
| Chain | Mezo (EVM-compatible Bitcoin L2) | Stacks (Bitcoin-secured L1.5) |
| Smart contract language | Solidity ^0.8.24 | Clarity (decidable, no re-entrancy) |
| Payment token | MUSD | USDX (primary), STX (secondary / governance boost) |
| Governance token | MEZO | STX |
| Token standard | ERC-20 | SIP-010 fungible token |
| Wallet / web3 layer | wagmi v2 + RainbowKit | Stacks.js + Connect |
| Experience matching | None | Creators set required range; contributors set level; protocol filters |
| Contract security model | Reentrancy guards (OZ) | Structural — Clarity post-conditions prevent token draining by design |
| Deployment tooling | Foundry | Clarinet |

---

## Experience Matching System

Experience levels are represented as discrete integer tiers on-chain. This keeps contract storage cheap and comparisons simple.

### Tiers

| Tier ID | Label | Approximate Years |
|---|---|---|
| `0` | Newcomer | 0 – 1 year |
| `1` | Junior | 1 – 2 years |
| `2` | Mid-level | 2 – 3 years |
| `3` | Senior | 3 – 5 years |
| `4` | Staff / Expert | 5+ years |

### How it works

**Creator side — task creation:**
- When posting a task the creator selects a minimum tier and a maximum tier (e.g. min = 1 Junior, max = 2 Mid-level).
- Both values are stored in the task map on-chain: `experience-min` and `experience-max`.
- The UI enforces `experience-min <= experience-max`.

**Contributor side — registration:**
- During the on-chain registration step the contributor selects their experience tier (one value from the table above).
- This is stored permanently on their on-chain profile as `experience-level`.
- It can be updated via `update-experience` at any time, but an update resets a short cooldown to prevent gaming.

**Matching — task browsing:**
- The frontend filters the task list to only show tasks where `contributor.experience-level >= task.experience-min AND contributor.experience-level <= task.experience-max`.
- Contributors can opt into "show all tasks" mode if they want to browse outside their matched range, but out-of-range tasks are visually dimmed.
- When a contributor calls `apply-for-task`, the contract verifies the experience gate on-chain and rejects applications outside the allowed range.

This creates a two-sided signal: creators get applicants who genuinely fit the scope; contributors get a curated feed of relevant work.

---

## Project Architecture

```
taskify/
├── frontend/                         # Next.js 15 full-stack app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                        # Landing page
│   │   │   ├── register/page.tsx               # On-chain user registration (role + experience)
│   │   │   ├── tasks/page.tsx                  # Browse bounties (experience-filtered)
│   │   │   ├── tasks/[id]/page.tsx             # Task detail + full lifecycle actions
│   │   │   ├── creator/page.tsx                # Creator dashboard
│   │   │   ├── create/page.tsx                 # Post new task / apply for grant
│   │   │   ├── investor/page.tsx               # Patron deposit, STX stake, grant voting
│   │   │   ├── leaderboard/page.tsx            # Top contributors by USDX earned
│   │   │   ├── profile/[address]/page.tsx      # Public contributor profile
│   │   │   └── api/                            # Next.js serverless API routes
│   │   │       ├── auth/github/                # GitHub OAuth initiation
│   │   │       ├── auth/github/callback/       # OAuth callback + JWT issuance
│   │   │       ├── users/                      # User profile CRUD (Supabase)
│   │   │       ├── tasks/                      # Task metadata sync
│   │   │       ├── leaderboard/                # Leaderboard aggregation
│   │   │       └── sync/                       # On-chain → Supabase sync (daily cron)
│   │   ├── components/
│   │   │   ├── layout/Navbar.tsx
│   │   │   └── ui/
│   │   │       ├── RegistrationModal.tsx        # Role + experience tier selection gate
│   │   │       ├── ExperienceSelector.tsx       # Reusable tier picker (contributor)
│   │   │       ├── ExperienceRangePicker.tsx    # Min/max tier picker (creator / task form)
│   │   │       ├── FaucetCard.tsx              # Testnet USDX / STX faucet
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Input.tsx
│   │   │       └── Textarea.tsx
│   │   ├── hooks/
│   │   │   ├── useTaskify.ts                   # All contract read/write hooks (Stacks.js)
│   │   │   ├── useSIP010.ts                    # Token approval and balance hooks
│   │   │   ├── useFaucet.ts                    # Testnet faucet hook
│   │   │   └── useExperienceFilter.ts          # Client-side experience-matching logic
│   │   ├── lib/
│   │   │   ├── abi.ts                          # Clarity contract ABI (function signatures)
│   │   │   ├── constants.ts                    # Addresses, enums, tier labels, experience map
│   │   │   ├── utils.ts                        # Formatting helpers
│   │   │   ├── stacks.ts                       # Stacks.js + Connect config
│   │   │   └── server/
│   │   │       ├── supabase.ts                 # Supabase client (service role)
│   │   │       ├── sync.ts                     # Chain → DB sync logic
│   │   │       ├── scoring.ts                  # Leaderboard scoring engine
│   │   │       ├── models.ts                   # DB type definitions
│   │   │       └── stacksClient.ts             # Read-only Stacks API client
│   │   └── providers/
│   │       └── StacksProvider.tsx              # Stacks Connect context provider
│   ├── vercel.json                             # Cron job config (daily sync)
│   └── package.json
├── contracts/                        # Clarinet project
│   ├── contracts/
│   │   └── taskify.clar                        # Core protocol contract
│   ├── tests/
│   │   └── taskify_test.ts                     # Clarinet unit tests (Vitest)
│   ├── settings/
│   │   └── Devnet.toml                         # Local devnet config
│   └── Clarinet.toml
├── pnpm-workspace.yaml
└── TASKIFY.md
```

### Architecture Decisions

**Why Clarity over Solidity?**
Clarity is a decidable language — you can know exactly what a contract will do before running it. There is no re-entrancy by construction and no compiler upgrade surface. Stacks post-conditions let callers (and wallets) assert what tokens will leave their account, preventing a class of drain attacks that require explicit guards in Solidity.

**Why USDX as the primary payment token?**
USDX is a Bitcoin-backed stablecoin native to the Stacks ecosystem. Using it as the escrow and grant currency means contributors know precisely what they will earn (no price volatility) and the capital stays within the Stacks/Bitcoin economy. STX is reserved for governance weight amplification, mirroring MEZO's role in the original protocol.

**Why store experience on-chain instead of in Supabase?**
Experience level is load-bearing protocol logic — it gates `apply-for-task` at the contract level. Storing it in a database would reintroduce a trusted intermediary that could be manipulated. The on-chain record is the single source of truth; Supabase caches it for display performance.

---

## Smart Contract

`contracts/contracts/taskify.clar` is the financial and governance backbone. It handles all USDX movements, grant voting, wave rewards, and experience gating without any off-chain intermediaries.

### Core Data Maps

```clarity
;; User profiles
(define-map users
  { address: principal }
  {
    username: (string-ascii 50),
    role: (string-ascii 12),          ;; "creator" | "contributor" | "investor"
    experience-level: uint,           ;; 0–4, contributors only
    tasks-completed: uint,
    total-earned: uint,
    github-verified: bool,
    registered-at: uint
  }
)

;; Tasks / bounties
(define-map tasks
  { task-id: uint }
  {
    creator: principal,
    title: (string-ascii 200),
    amount: uint,
    token: principal,                 ;; SIP-010 token contract
    experience-min: uint,             ;; minimum experience tier (0–4)
    experience-max: uint,             ;; maximum experience tier (0–4)
    status: (string-ascii 20),
    funding-type: (string-ascii 10),  ;; "self" | "grant"
    assignee: (optional principal),
    deadline: uint,
    created-at: uint
  }
)

;; Patron / investor profiles
(define-map patrons
  { address: principal }
  {
    total-deposited: uint,
    stx-staked: uint,
    tier: uint                        ;; 0=Bronze 1=Silver 2=Gold 3=Diamond
  }
)

;; Grant vote tallies
(define-map grant-votes
  { task-id: uint }
  {
    votes-for: uint,
    votes-against: uint,
    deadline: uint,
    executed: bool
  }
)
```

### Core Modules

| Module | Description |
|---|---|
| User Registration | Principals register with username, role, and (for contributors) experience tier |
| Experience Gating | `apply-for-task` rejects callers whose experience-level is outside the task's min/max range |
| Task Escrow | Self-funded tasks transfer USDX into the contract at creation; released only on creator approval |
| Grant Pool | Investors deposit USDX permanently; pool funds approved grant applications |
| Grant Voting | 3-day voting window; weight = USDX deposited + (STX staked × multiplier) |
| Task Lifecycle | 9 on-chain states: `GRANT_PENDING` → `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `SUBMITTED` → `FUNDS_RELEASED` |
| Wave Rewards | Every 7 days, 40% of accumulated fees distribute to active creators by task count |
| STX Staking | STX staked amplifies governance weight and is always withdrawable |
| Multi-token Support | Tasks can escrow USDX, STX, or any SIP-010 token — the `token` field stores the contract principal |

### Protocol Constants

```clarity
(define-constant SELF-FUNDED-FEE-BPS u300)    ;; 3%
(define-constant GRANT-FUNDED-FEE-BPS u500)   ;; 5%
(define-constant TREASURY-SHARE u60)           ;; 60% of fee
(define-constant WAVE-POOL-SHARE u40)          ;; 40% of fee
(define-constant WAVE-EPOCH-BLOCKS u1008)      ;; ~7 days at 10 min/block
(define-constant GRANT-VOTING-BLOCKS u432)     ;; ~3 days
(define-constant MIN-TASK-AMOUNT u1000000)     ;; 1 USDX (6 decimals)
(define-constant MIN-STX-STAKE u1000000)       ;; 1 STX (6 decimals)
(define-constant STX-VOTE-MULTIPLIER u10)
(define-constant EXPERIENCE-UPDATE-COOLDOWN u144) ;; ~1 day
```

### Experience Tier Constants

```clarity
(define-constant TIER-NEWCOMER u0)   ;; 0–1 year
(define-constant TIER-JUNIOR u1)     ;; 1–2 years
(define-constant TIER-MID u2)        ;; 2–3 years
(define-constant TIER-SENIOR u3)     ;; 3–5 years
(define-constant TIER-EXPERT u4)     ;; 5+ years
```

### Patron Tier Thresholds

| Tier | Minimum Cumulative USDX Deposited |
|---|---|
| Bronze | 100 USDX |
| Silver | 500 USDX |
| Gold | 1,000 USDX |
| Diamond | 5,000 USDX |

---

## User Flows

### Creator Flow

#### Registration
1. Visit `/creator` — registration modal appears if wallet is not yet registered.
2. Connect wallet via Stacks Connect.
3. Choose username and role (`creator`).
4. Call `register-user` on-chain. GitHub OAuth links the GitHub identity to the principal.

#### Posting a Self-Funded Task
1. Navigate to `/create` and select **Self-Funded**.
2. Fill in title, description, GitHub link, USDX amount, and deadline.
3. **Select experience range** — choose minimum and maximum tier from the `ExperienceRangePicker` (e.g. min = Junior, max = Mid-level). This defines who can apply.
4. Select token: USDX (default), STX, or another supported SIP-010 token.
5. The wallet prompts for a post-condition asserting the exact token amount leaving the account.
6. Call `create-task` — USDX transfers into escrow, fee deducted at creation (60% treasury / 40% wave pool).
7. Task appears on `/tasks` with status `OPEN`. Contributors whose experience falls in range will see it prominently.

#### Posting a Grant Task
1. Navigate to `/create` and select **Grant-Funded**.
2. Fill in task details including experience range and requested USDX amount.
3. Call `apply-for-grant` — task enters `GRANT_PENDING`, 3-day voting window opens.
4. After window closes, anyone calls `execute-grant` — if approved, USDX moves from patron pool to escrow.

#### Managing a Task
- Call `assign-task(task-id, assignee)` to select from applicants.
- Call `approve-and-release(task-id)` after reviewing submitted work — USDX transfers to contributor.
- Call `cancel-task` to refund escrow (before assignment only).
- After deadline, anyone calls `mark-expired` — funds return to creator (self-funded) or patron pool (grant).

#### Wave Rewards
At every epoch boundary the contract owner calls `advance-wave`:
```
creator-share = (wave-pool × creator-task-count) / wave-total-tasks
```

---

### Contributor Flow

#### Registration
1. Visit `/tasks` — registration modal appears for unregistered wallets.
2. Connect wallet via Stacks Connect.
3. Choose username, role (`contributor`), and **experience tier** from the `ExperienceSelector`.
4. Connect GitHub account — OAuth required for contributors.
5. Call `register-user` on-chain with `experience-level` included.

#### Experience Update
- A contributor can call `update-experience(new-tier)` at any time.
- A cooldown of ~1 day (`EXPERIENCE-UPDATE-COOLDOWN`) applies after each update to prevent gaming application windows.

#### Finding Work
- `/tasks` loads filtered to the contributor's experience tier by default.
- Tasks outside the contributor's range are hidden (toggle available to show all, dimmed).
- Search by title, keyword, or filter by token type.

#### Applying and Working
1. Click **Apply for Task** — calls `apply-for-task(task-id)` on-chain.
   - Contract rejects if `contributor.experience-level < task.experience-min` or `> task.experience-max`.
2. Wait for creator to call `assign-task`.
3. Click **Start Task** — calls `start-task(task-id)`, status → `IN_PROGRESS`.
4. Complete the work off-chain.
5. Click **Submit Work** — calls `submit-task(task-id)`, status → `SUBMITTED`.
6. Creator reviews and calls `approve-and-release` — USDX transfers directly to the contributor's principal. No intermediary, no delay.

#### On-Chain Reputation
- Every completed task increments `tasks-completed` and `total-earned` on the contributor's on-chain profile.
- Public profile at `/profile/[address]` shows stats, linked GitHub handle, and experience tier badge.
- `/leaderboard` ranks contributors by total USDX earned.
- Reputation is portable — it belongs to the principal, not the platform.

---

### Investor / Patron Flow

#### Registration
1. Visit `/investor` — registration modal appears.
2. Connect wallet, register with username and role (`investor`).
3. No GitHub required.

#### Depositing USDX
1. Enter deposit amount (minimum 1 USDX).
2. Wallet prompts post-condition for exact USDX amount.
3. Call `deposit-to-pool(amount)` — USDX transfers permanently to the patron pool.
4. Deposits are **not withdrawable** — this is ecosystem patronage, not a loan.
5. Cumulative deposit total determines tier: Bronze → Silver → Gold → Diamond.

#### Staking STX
1. Enter STX stake amount (minimum 1 STX).
2. Call `stake-stx(amount)` — STX held in contract, immediately amplifies governance weight.
3. Call `unstake-stx(amount)` to withdraw at any time (does not alter past votes).

#### Voting Weight Formula
```
voting-weight = total-usdx-deposited + (stx-staked × STX-VOTE-MULTIPLIER / 1e6)
```
With multiplier of 10: staking 1,000 STX adds 10,000 USDX-equivalent voting units.

#### Voting on Grants
1. Active grant applications appear under **Active Grant Votes**.
2. Review requested amount, experience range, voting deadline, and current tally.
3. Click **For** or **Against** — calls `vote-on-grant(task-id, support)`. Votes are final.
4. After the window: anyone clicks **Execute Decision** — calls `execute-grant`.

---

## Financial Model

### Fee Collection

| Task Type | Fee Rate | Example (10,000 USDX task) |
|---|---|---|
| Self-Funded | 3% | 300 USDX collected |
| Grant-Funded | 5% | 500 USDX collected |

### Fee Distribution

```
60% → Platform Treasury    (protocol revenue)
40% → Wave Creator Pool    (distributed to active creators every ~7 days)
```

### Revenue Projections

| Monthly Tasks | Avg Task Size | Total Fees | Treasury (60%) | Creator Pool (40%) |
|---|---|---|---|---|
| 100 | 500 USDX | 1,500 USDX | 900 USDX | 600 USDX |
| 500 | 500 USDX | 7,500 USDX | 4,500 USDX | 3,000 USDX |
| 1,000 | 1,000 USDX | 30,000 USDX | 18,000 USDX | 12,000 USDX |

### The Creator Wave Pool Flywheel

1. Creators post tasks → fees accumulate in the wave pool
2. At epoch end, active creators share the pool proportionally
3. Creators who earned from the wave pool have capital to post more tasks
4. More tasks → more fees → larger wave pool → stronger incentive

---

## Token Roles

### The Role of USDX

USDX is the native Bitcoin-backed stablecoin of the Stacks ecosystem. It is the primary unit of account for all financial operations in Taskify.

- **Task escrow:** Every task locks USDX at creation. A contributor accepting a 500 USDX bounty knows the exact amount with zero price exposure.
- **Patron pool:** Investor deposits are permanent USDX locks. Growing platform activity means continuously increasing amounts of USDX locked in productive protocol use.
- **Wave rewards:** Fees are collected in USDX and recycled to creators every epoch. Earnings stay inside the Stacks ecosystem.
- **Governance unit:** Patron tier and voting weight are USDX-denominated. Capital commitment maps directly to decision-making power.
- **Multi-token tasks:** While USDX is the default, the `token` field in each task stores a SIP-010 contract principal. Future tasks can escrow STX or any other SIP-010 token without a contract upgrade.

### The Role of STX

STX is the native token of the Stacks chain. Taskify gives STX holders a direct, productive role in the builder economy.

- **Governance staking:** STX staked amplifies voting weight on grant applications. A STX holder with no USDX deposits can still become a meaningful patron by staking.
- **Always liquid:** Staked STX is withdrawable at any time — no lockup risk, no slashing.
- **Calibrated multiplier:** The `STX-VOTE-MULTIPLIER` constant is adjustable by the contract owner to stay calibrated with real STX/USDX market dynamics.
- **Demand loop:** As the grant pool grows and more capital flows through governance, the marginal value of voting influence increases — creating organic demand to stake STX for amplified weight.

---

## Ecosystem Importance

### Transaction Volume

A single task from creation to completion drives 7–8 on-chain transactions:

| Action | Contract Call |
|---|---|
| User onboarding | `register-user` |
| Experience update (optional) | `update-experience` |
| Task creation | `create-task` or `apply-for-grant` |
| Contributor application | `apply-for-task` |
| Creator assigns | `assign-task` |
| Work begins | `start-task` |
| Work submitted | `submit-task` |
| Payment released | `approve-and-release` |

At 1,000 monthly tasks this drives 7,000–8,000 transactions and an equivalent number of Stacks block anchors to Bitcoin.

### Developer Retention

Developers who earn USDX on Taskify have a direct financial incentive to stay in the Stacks ecosystem. On-chain earnings create transaction history and economic identity that compounds with each completed task.

### Experience-Matched Quality

By gating applications on-chain by experience range, Taskify shifts the bounty market from "first to apply" to "best fit applies." Creators receive applications from developers with declared relevant experience; contributors spend time on work within their level rather than competing against specialists. Over time the experience distribution of completions acts as a real signal for skill development on the platform.

### Developer Identity Layer

GitHub-verified principals with declared experience tiers and completed task histories create a portable, on-chain reputation primitive. A contributor's Taskify history — their tier, USDX earned, and task count — is publicly queryable and can be used by other Stacks projects for hiring, access control, or on-chain credit scoring.

### Network Effects
8
Each new creator attracts new contributors. Each new investor deepens the grant pool. Each completed task grows the reputation graph. The experience-matching layer adds another dimension: as the contributor pool grows and diversifies, creator confidence in applicant quality increases — accelerating the flywheel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stacks (Bitcoin-secured L1.5) |
| Smart Contract | Clarity, Clarinet |
| Token Standard | SIP-010 fungible token |
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4 |
| Wallet | Stacks.js, @stacks/connect |
| Database | Supabase (PostgreSQL) |
| Auth | GitHub OAuth 2.0, JWT (httpOnly cookie) |
| Package Manager | pnpm workspaces |
| Deployment | Vercel (frontend + API routes) |
| Contract Testing | Clarinet + Vitest |

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Clarinet](https://github.com/hirosystems/clarinet) — `brew install clarinet` or download from Hiro

### Setup

```bash
git clone https://github.com/<your-org>/taskify.git
cd taskify
pnpm install
```

### Run the Frontend Dev Server

```bash
cp frontend/.env.example frontend/.env.local
# fill in values — see Environment Variables below
pnpm --filter frontend dev
```

App available at `http://localhost:3000`.

### Run Contract Tests

```bash
cd contracts
clarinet test
```

### Check Contract

```bash
cd contracts
clarinet check
```

### Local Devnet (full stack)

```bash
cd contracts
clarinet integrate
```

This spins up a local Stacks node, Bitcoin node, and Stacks API — full end-to-end environment.

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

# Contract addresses (Stacks testnet — hardcoded as fallbacks in constants.ts)
NEXT_PUBLIC_TASKIFY_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.taskify
NEXT_PUBLIC_USDX_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdx-token

# App base URL (used by GitHub OAuth callback)
FRONTEND_URL=http://localhost:3000
```

---

## Contract Addresses

### Stacks Testnet

| Contract | Address | Explorer |
|---|---|---|
| Taskify | _TBD_ | View |
| USDX | _TBD_ | View |

---

## Key Design Differences Summary

1. **Experience matching is on-chain** — not a UI filter. The contract enforces the gate at `apply-for-task`. This makes it a trust-minimized signal, not a soft suggestion.
2. **Contributor experience is mutable but throttled** — a 1-day cooldown after `update-experience` prevents contributors from gaming active application windows by temporarily bumping their tier.
3. **Tasks show experience badge in the UI** — every task card displays the required tier range (e.g. "Junior – Mid-level") so contributors know at a glance without opening the detail page.
4. **STX replaces MEZO as the governance amplifier** — the role is identical (stake to boost voting weight on grants) but it is now the native Stacks chain token rather than a separate L2 token.
5. **Post-conditions replace allowance patterns** — Clarity post-conditions let the wallet assert token flows at signing time, removing the ERC-20 `approve` + `transferFrom` two-step and its associated approval griefing vectors.
