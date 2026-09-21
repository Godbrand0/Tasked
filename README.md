# Taskify

> Trustless bounty escrow, community-governed grants, and both experience-matched and open-to-anyone work — built on Mezo with Solidity.

Taskify is a fully on-chain bounty protocol on **Mezo** (a Bitcoin-secured EVM L2) that connects task creators and contributors through a single Solidity contract — and lets any registered wallet support the grant pool or vote on grants, independent of role. Every payment is enforced on-chain. No escrow agent, no payment processor, no central party.

Two kinds of task live side by side on one board:

- **Development tasks** — experience-tier gated, one contributor applies and is assigned, paid on approval. GitHub-verified.
- **Community tasks** — open to any registered wallet (memes, bug write-ups, social bounties — no code required). Anyone joins with a proof-of-participation link; the creator picks up to *N* winners and the escrow splits evenly between them in one transaction. X-verified.

**Live Demo:** [taskifybounties.com](https://taskifybounties.com/)
**Contract (Mezo Mainnet):** [`0x02548E2071b2Fc6Cc2f34E7a8eFD88e0Fd792A8D`](https://explorer.mezo.org/address/0x02548E2071b2Fc6Cc2f34E7a8eFD88e0Fd792A8D) — see [Contract Addresses](#contract-addresses)

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
12. [Governance & Ownership](#governance--ownership)
13. [Security Model](#security-model)

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
│   │   └── MockMEZO.sol              # ERC-20 mock, only needed for local (anvil) deploys — real MEZO is live on both testnet and mainnet
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

All financial logic lives in `contracts/src/Taskify.sol`. It is deployed behind a UUPS upgradeable proxy, so the proxy address is the stable one to integrate against and the implementation behind it can be replaced — upgrade authority belongs to a 2-of-3 Safe multisig, see [Governance & Ownership](#governance--ownership). Built with OpenZeppelin's `SafeERC20` and `ReentrancyGuard`.

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

Already deployed and UUPS-upgradeable on **Mezo mainnet** at `0x02548E2071b2Fc6Cc2f34E7a8eFD88e0Fd792A8D` (the proxy address — see [Contract Addresses](#contract-addresses)) — the frontend points at this address by default via `NEXT_PUBLIC_TASKIFY_CONTRACT`. To deploy your own instance (e.g. to testnet for free experimentation):

```bash
cd contracts
cp .env.example .env   # fill in PRIVATE_KEY

# Testnet (funded via https://faucet.test.mezo.org)
forge script script/Deploy.s.sol --rpc-url https://rpc.test.mezo.org --broadcast

# Mainnet — Mezo has no first-party public RPC; see the "Recommended Mainnet
# RPC Providers" table at mezo.org/docs/developers/getting-started
forge script script/Deploy.s.sol --rpc-url https://mezo.drpc.org --broadcast
```

`MUSD_ADDRESS` and `MEZO_ADDRESS` in `contracts/.env` should be set to the real token addresses for whichever network you're targeting (see [Contract Addresses](#contract-addresses) — MUSD differs between testnet and mainnet, MEZO is the same on both). Leave both unset on testnet only if you want `Deploy.s.sol` to deploy fresh `MockMUSD`/`MockMEZO` instead, for unlimited test balances without a faucet.

An existing deployment upgrades via `contracts/script/Upgrade.s.sol` (`PROXY_ADDRESS=<proxy> forge script script/Upgrade.s.sol --rpc-url <url> --broadcast`) rather than a fresh `Deploy.s.sol` run — that deploys a new implementation and points the existing proxy at it, preserving all on-chain state.

On **mainnet the deployer key cannot upgrade on its own**: the proxy's owner is a 2-of-3 Safe. `Upgrade.s.sol` detects this, deploys only the new implementation, and prints the `upgradeToAndCall` call for you to propose in the Safe's Transaction Builder at [safe.mezo.org](https://safe.mezo.org); two of the three signers must then approve it. Ownership transfers are two-step (`transferOwnership`, then `acceptOwnership` from the new owner). See [Governance & Ownership](#governance--ownership).

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

# Mezo network (defaults below already match mainnet if unset — override
# with the Mezo Testnet values from Contract Addresses to point at testnet
# instead, e.g. for free experimentation)
NEXT_PUBLIC_MEZO_CHAIN_ID=31612
NEXT_PUBLIC_MEZO_RPC_URL=https://mezo.drpc.org
NEXT_PUBLIC_MEZO_EXPLORER_URL=https://explorer.mezo.org

# Token contracts — both default to the real Mezo mainnet deployments if unset
NEXT_PUBLIC_MUSD_CONTRACT=0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186
NEXT_PUBLIC_MEZO_CONTRACT=0x7B7c000000000000000000000000000000000001

# Taskify contract (see Contract Addresses) — required for every on-chain
# read/write in the app; leave unset only if you haven't deployed yet.
NEXT_PUBLIC_TASKIFY_CONTRACT=0x02548E2071b2Fc6Cc2f34E7a8eFD88e0Fd792A8D
```

---

## Contract Addresses

### Mezo Mainnet (chain id `31612`)

| Contract | Address |
|---|---|
| Taskify | [`0x02548E2071b2Fc6Cc2f34E7a8eFD88e0Fd792A8D`](https://explorer.mezo.org/address/0x02548E2071b2Fc6Cc2f34E7a8eFD88e0Fd792A8D) — UUPS-upgradeable, proxy address (implementation: `0x5999e34b74baeF936d039A130D43400258e4D1b9`) |
| Owner multisig | [`0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31`](https://explorer.mezo.org/address/0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31) — 2-of-3 Safe; holds both `CONTRACT_OWNER` and `treasuryAddress`, see [Governance & Ownership](#governance--ownership) |
| MUSD (official) | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` |
| MEZO (official) | `0x7B7c000000000000000000000000000000000001` |

### Mezo Testnet (chain id `31611`)

| Contract | Address |
|---|---|
| Taskify | [`0xe0Aa09a432b03456fBf4f5Ee2b626531A0c6Cc2f`](https://explorer.test.mezo.org/address/0xe0Aa09a432b03456fBf4f5Ee2b626531A0c6Cc2f) — UUPS-upgradeable, proxy address (implementation: `0x53570511D18956B71d1B6Fe28181D689B2e5cB1d`) |
| MUSD (official) | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |
| MEZO (official) | `0x7B7c000000000000000000000000000000000001` — same address as mainnet, live on testnet too |

No veBTC escrow set yet on the mainnet deployment — grant voting won't resolve any weight until `setVeBTCEscrow` is called with a confirmed mainnet address.

Sourced from [mezo.org/docs/users/resources/contracts-reference](https://mezo.org/docs/users/resources/contracts-reference/); verify before relying on them for anything beyond local development.

---

## Governance & Ownership

The mainnet contract is upgradeable, so who may upgrade it matters as much as the code itself. That authority is **not** held by any single key.

`CONTRACT_OWNER` and `treasuryAddress` on the mainnet proxy are both the Safe multisig [`0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31`](https://explorer.mezo.org/address/0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31), operated through [safe.mezo.org](https://safe.mezo.org) with a **threshold of 2 out of 3 signers**:

| Signer | Address |
|---|---|
| Mezo community representative (g6) — independent of the Taskify team | [`0x68Fe50235230e24f17c90f8Fb0Cd4626fbD34972`](https://explorer.mezo.org/address/0x68Fe50235230e24f17c90f8Fb0Cd4626fbD34972) |
| Taskify core team (deployer) | [`0x91487d8BC1B573f0BC6c23dE7BA23d50F49F627B`](https://explorer.mezo.org/address/0x91487d8BC1B573f0BC6c23dE7BA23d50F49F627B) |
| Taskify core team | [`0x4344c919B6b104Cd06b93fa31c9dB7FB659B8E64`](https://explorer.mezo.org/address/0x4344c919B6b104Cd06b93fa31c9dB7FB659B8E64) |

Ownership moved from the deployer EOA to this Safe on 2026-09-16, resolving the most serious finding of the September 2026 security review (a single key held upgrade authority over live funds). The third signer — the independent g6 community member — was added afterwards, taking the Safe from 2-of-2 to 2-of-3.

### What the owner can do

| Function | Effect |
|---|---|
| `upgradeToAndCall` | Replaces the implementation. Can change **any** rule in the contract, including rules governing escrowed funds. The most consequential power here. |
| `setTreasuryAddress` | Changes where the protocol's 60% fee share is sent. Rejects the zero address. |
| `setVeBTCEscrow` / `setVeMEZOEscrow` | Sets which Mezo contracts voting weight is read from. Each live proposal snapshots its source at open, so a change can't retroactively alter an in-flight vote. |
| `setApprovedVoters` | Maintains the invite-only grant-voting allowlist. |
| `transferOwnership` | Nominates a new owner, which must then call `acceptOwnership`. Two-step, so ownership can't be sent to an address that cannot claim it. |

### What the owner cannot do

- **Touch escrowed task funds.** No owner-gated function moves, withdraws or releases a task's escrow. Escrow leaves only via `approveAndRelease`, `cancelTask`, `markExpired` or `selectWinners`, all driven by the task's own participants and deadlines.
- **Spend the grant pool** outside an `executeGrant` call for a proposal that passed the on-chain vote.
- **Cast or alter votes.** Weight is read live from Mezo's escrow contracts; `grantVoters` prevents double voting.
- **Redirect the payment tokens.** `musd` and `mezo` are immutable, fixed at deployment.
- **Stall wave rewards.** `advanceWave` and `claimStrandedWaveFunds` are permissionless.

### Known limitations

Stated plainly rather than glossed over:

- **Two of the three signers are Taskify team members**, so they can meet the threshold between themselves. The independent signer raises the bar and adds outside visibility; it does not yet make unilateral team action impossible. Broadening the signer set further is the intended direction.
- **There is no timelock on upgrades.** Once two signers approve, the upgrade lands immediately — users get no enforced window to exit first. Adding a timelock (or a delay module on the Safe) is on the roadmap and is the next meaningful decentralisation step.

### Verifying this yourself

Nothing above requires trusting this README:

```bash
RPC=https://mezo.drpc.org
PROXY=0x02548E2071b2Fc6Cc2f34E7a8eFD88e0Fd792A8D
SAFE=0xcfeC02DfC63FcA293b5F9c2856bb1370965D2a31

cast call $PROXY "CONTRACT_OWNER()(address)"   --rpc-url $RPC   # -> $SAFE
cast call $PROXY "treasuryAddress()(address)"  --rpc-url $RPC   # -> $SAFE
cast call $SAFE  "getOwners()(address[])"      --rpc-url $RPC   # -> the 3 signers
cast call $SAFE  "getThreshold()(uint256)"     --rpc-url $RPC   # -> 2
```

Every Safe transaction, including every upgrade, is visible on-chain and in the Safe's history at [safe.mezo.org](https://safe.mezo.org).

---

## Security Model

- **Reentrancy guard** — state-changing escrow functions (`createTask`, `createCommunityTask`, `approveAndRelease`, `rejectSubmission`, `cancelTask`, `markExpired`, `selectWinners`, `claimWaveReward`, `claimStrandedWaveFunds`) are wrapped in OpenZeppelin's `ReentrancyGuard`.
- **SafeERC20** — all token transfers use `safeTransfer`/`safeTransferFrom`, tolerating non-standard ERC-20 return-value behavior.
- **Token allowlist on task creation** — `createTask`/`createCommunityTask` revert `InvalidToken()` for anything other than `musd`/`mezo`, so escrow can't be opened in an arbitrary, potentially malicious ERC-20 — see `TASKIFY_SECURITY_AUDIT.md` finding M-1.
- **Expiry can't touch in-flight work or votes** — `markExpired` only accepts `OPEN`/`ASSIGNED`/`IN_PROGRESS`; a pending grant proposal or a contributor's already-submitted work can never be refunded out from under them by expiry — see `TASKIFY_SECURITY_AUDIT.md` findings F-233716/F-233658.
- **Experience gating is on-chain** — `applyForTask` enforces the range at the contract level for Development tasks; a non-conforming call reverts with `ExperienceMismatch()`. Community tasks intentionally have no such gate.
- **Task-kind isolation** — `applyForTask`/`assignTask` revert `TaskKindMismatch()` on a Community task and vice versa for `joinCommunityTask`/`selectWinners`, so the two lifecycles can't cross-contaminate shared storage.
- **Double-claim / double-vote protection** — `grantVoters` and `waveClaims` mappings prevent double voting and double claiming.
- **Owner-only controls, held by a multisig** — `setTreasuryAddress` (also rejects the zero address, see finding F-233721), `setVeBTCEscrow`, `setVeMEZOEscrow`, `setApprovedVoters`, `transferOwnership` and `upgradeToAndCall` are restricted to `CONTRACT_OWNER`, which on mainnet is a 2-of-3 Safe rather than any single key — see [Governance & Ownership](#governance--ownership). `CONTRACT_OWNER` is mutable (not `immutable`) specifically so it could be rotated to that multisig, and can be recovered from a compromised key, without a redeploy — see `TASKIFY_SECURITY_AUDIT.md` finding L-2. No owner function can touch escrowed task funds. `advanceWave` is intentionally permissionless (pure time-check, no economic decision in it) so wave rewards can never get stuck on an inactive owner.
- **Deployment requires the optimizer enabled** (`optimizer = true`, `via_ir = true` in `foundry.toml`) — with it off, the contract's runtime bytecode exceeds the EIP-170 24,576-byte limit and cannot be deployed to any EVM chain. Always confirm with `forge build --sizes` before deploying.

For the current Solidity contract, see [`TASKIFY_SECURITY_AUDIT.md`](TASKIFY_SECURITY_AUDIT.md) — an internal review (one High, one Medium, two Low findings, all fixed and covered by regression tests in `contracts/test/SecurityAudit.t.sol`). That review is **not a substitute for a professional third-party audit**, which is still needed before deploying with real funds.
