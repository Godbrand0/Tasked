export type UserRole = "creator" | "contributor" | "investor";

export interface UserProfile {
  address: string;
  username: string;
  role: UserRole;
  experienceLevel: number;
  tasksCompleted: number;
  totalEarned: number;
  githubVerified: boolean;
  registeredAt: number;
  githubHandle?: string;
}

export interface TaskComment {
  id: number;
  author: string;
  avatarColor: string;
  body: string;
  createdAt: number;
  isCreator?: boolean;
}

export interface Task {
  id: number;
  creator: string;
  creatorUsername: string;
  title: string;
  description: string;
  amount: number;
  token: "USDX" | "STX";
  experienceMin: number;
  experienceMax: number;
  status: string;
  fundingType: "self" | "grant";
  assignee?: string;
  deadline: number;
  createdAt: number;
  applicantCount?: number;
  maxApplicants?: number;
  tags?: string[];
  githubRepo?: string;
  images?: string[];
  grantJustification?: string;
  comments?: TaskComment[];
}

export interface GrantVote {
  taskId: number;
  votesFor: number;
  votesAgainst: number;
  threshold: number;
  deadline: number;
  executed: boolean;
}

export interface PatronProfile {
  address: string;
  username: string;
  totalDeposited: number;
  stxStaked: number;
  tier: number;
  votingWeight: number;
}

export interface WaveInfo {
  waveId: number;
  startBlock: number;
  poolAmount: number;
  totalTasks: number;
}

export const MOCK_WALLET: UserProfile = {
  address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  username: "satoshi.btc",
  role: "creator",
  experienceLevel: 3,
  tasksCompleted: 12,
  totalEarned: 4200_000000,
  githubVerified: true,
  registeredAt: 150000,
  githubHandle: "satoshi-btc",
};

export const MOCK_TASKS: Task[] = [
  {
    id: 1,
    creator: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    creatorUsername: "satoshi.btc",
    title: "Build Stacks DeFi Analytics Dashboard",
    description: `React frontend connecting to the Stacks API to display protocol TVL, volume, and token stats.\n\n**Requirements:**\n- Wallet connection via Stacks Connect\n- Real-time data via the Hiro API (WebSocket or polling)\n- Charts for TVL trend, 24h volume, top tokens by market cap\n- Responsive layout, dark mode\n- Deployed to Vercel or similar\n\n**Deliverables:** GitHub repo + live URL. Must pass the provided Playwright E2E suite.`,
    amount: 500_000000,
    token: "USDX",
    experienceMin: 2,
    experienceMax: 3,
    status: "OPEN",
    fundingType: "self",
    deadline: 160000,
    createdAt: 150100,
    applicantCount: 4,
    maxApplicants: 8,
    githubRepo: "https://github.com/satoshi-btc/stacks-defi-dashboard",
    tags: ["React", "TypeScript", "Stacks API"],
    comments: [
      { id: 1, author: "0xbuilder.btc", avatarColor: "#5546FF", body: "Very interested in this task! I've built two similar dashboards using the Hiro API. Would the creator consider expanding the experience gate to Senior-level contributors?", createdAt: 150110 },
      { id: 2, author: "satoshi.btc", avatarColor: "#F7931A", body: "Yes, Senior is fine. Please include portfolio links in your application — particularly any Stacks-related projects.", createdAt: 150115, isCreator: true },
      { id: 3, author: "clarity.dev", avatarColor: "#00D395", body: "Working on a proposal now. Quick question: will API keys be provided or should I plan around public Hiro API rate limits?", createdAt: 150120 },
      { id: 4, author: "satoshi.btc", avatarColor: "#F7931A", body: "You'll need to use the public Hiro API. The rate limits are generous enough for a read-only dashboard — around 500 req/min on the free tier.", createdAt: 150122, isCreator: true },
    ],
  },
  {
    id: 2,
    creator: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    creatorUsername: "nakamoto.stx",
    title: "Clarity Smart Contract Audit — Lending Protocol",
    description: `Formal security review of a lending protocol's Clarity contracts.\n\n**Scope:**\n- Reentrancy analysis across all public functions\n- Post-condition coverage verification\n- Arithmetic edge cases (overflow, underflow, division by zero)\n- Access control review\n- Liquidation path correctness\n\n**Deliverables:** Written audit report (Markdown), annotated contract with inline findings, severity ratings (Critical / High / Medium / Low / Info).`,
    amount: 1200_000000,
    token: "USDX",
    experienceMin: 3,
    experienceMax: 4,
    status: "OPEN",
    fundingType: "self",
    deadline: 161000,
    createdAt: 150200,
    applicantCount: 2,
    maxApplicants: 5,
    tags: ["Clarity", "Security", "Audit"],
    githubRepo: "https://github.com/nakamoto-stx/lending-protocol",
    comments: [
      { id: 1, author: "stacks.pro", avatarColor: "#8B80FF", body: "Interested. What's the codebase size? Knowing the line count helps estimate scope.", createdAt: 150210 },
      { id: 2, author: "nakamoto.stx", avatarColor: "#60A5FA", body: "~1,200 lines across 4 contracts. Core logic is in lending-pool.clar (~700 LOC) and price-oracle.clar (~300 LOC).", createdAt: 150212, isCreator: true },
    ],
  },
  {
    id: 3,
    creator: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7D3N5",
    creatorUsername: "alex.defi",
    title: "Implement SIP-010 Token Bridge UI",
    description: `Build the frontend for a cross-chain token bridge between Stacks and Ethereum.\n\n**Tech stack:** Next.js 14, Stacks Connect, ethers.js\n\n**Features:**\n- Wallet connection for both chains simultaneously\n- Token selection + amount input with live exchange rate\n- Post-condition builders for Clarity-side transfers\n- Error state handling for failed/timed-out bridge transactions\n- Transaction history view`,
    amount: 300_000000,
    token: "USDX",
    experienceMin: 1,
    experienceMax: 2,
    status: "IN_PROGRESS",
    fundingType: "self",
    assignee: "ST4QM6GXNQ9V4K7XNQJ8FRQPK1YMHQD5XJNB2T3",
    deadline: 158000,
    createdAt: 149000,
    applicantCount: 7,
    maxApplicants: 10,
    tags: ["Bridge", "Frontend", "Stacks.js"],
    comments: [
      { id: 1, author: "newdev.btc", avatarColor: "#60A5FA", body: "Assigned to me now — started with the wallet connection layer. Will push first PR by block 155,000.", createdAt: 149500 },
    ],
  },
  {
    id: 4,
    creator: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    creatorUsername: "nakamoto.stx",
    title: "Grant: Open-Source NFT Marketplace on Stacks",
    description: `Build a fully open-source NFT marketplace using Clarity contracts and a Next.js frontend. All code MIT licensed and published to GitHub on completion.\n\n**Deliverables:**\n- Clarity contracts: list, buy, make-offer, accept-offer, cancel\n- Next.js frontend with wallet connect, listing page, detail page, user profile\n- Clarinet test suite with ≥90% coverage\n- Deployment guide for community forks\n\n**Timeline:** 6 weeks from grant approval.`,
    amount: 2000_000000,
    token: "USDX",
    experienceMin: 2,
    experienceMax: 4,
    status: "GRANT_PENDING",
    fundingType: "grant",
    deadline: 151000,
    createdAt: 150050,
    applicantCount: 0,
    maxApplicants: 5,
    tags: ["NFT", "Clarity", "Next.js"],
    githubRepo: "https://github.com/nakamoto-stx/stacks-nft-marketplace",
    grantJustification: "An open-source NFT marketplace will serve as the canonical reference implementation for NFT trading on Stacks. We estimate 100+ derivative projects in the first year. The team has shipped two prior Stacks production apps (Stacks DEX v2, SimpleSwap). All code will be MIT licensed with a full deployment guide so any developer can fork and run their own instance.",
    comments: [
      { id: 1, author: "whale.btc", avatarColor: "#FFD700", body: "Strong +1 on this. Open-source NFT infrastructure is exactly what the Stacks ecosystem needs right now. The lack of a reference marketplace has been a real barrier for new devs.", createdAt: 150055 },
      { id: 2, author: "stacks.pro", avatarColor: "#8B80FF", body: "Do you have a GitHub repo with previous work we can review? Would help the community make a more informed vote.", createdAt: 150060 },
      { id: 3, author: "nakamoto.stx", avatarColor: "#60A5FA", body: "Good point — see github.com/nakamoto-stx/stacks-dex-v2 for our DEX work. ~4k GitHub stars, actively maintained.", createdAt: 150062, isCreator: true },
    ],
  },
  {
    id: 5,
    creator: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    creatorUsername: "satoshi.btc",
    title: "Write Clarinet Unit Tests for Stacking Contract",
    description: `Full test coverage for a stacking contract using Clarinet and Vitest.\n\n**Must cover:**\n- Happy path stacking and unstacking\n- Cooldown period edge cases\n- Reward distribution with multiple stakers\n- Slashing conditions (if applicable)\n- Block height boundary conditions\n\n**Deliverables:** PR to the repo with ≥95% coverage reported by Clarinet.`,
    amount: 150_000000,
    token: "USDX",
    experienceMin: 0,
    experienceMax: 1,
    status: "OPEN",
    fundingType: "self",
    deadline: 162000,
    createdAt: 150300,
    applicantCount: 1,
    maxApplicants: 5,
    tags: ["Clarinet", "Testing", "Vitest"],
    comments: [],
  },
  {
    id: 6,
    creator: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7D3N5",
    creatorUsername: "alex.defi",
    title: "Migrate ALEX DEX Frontend to Stacks.js v7",
    description: `Update all wallet connection logic and post-condition builders from Stacks.js v6 to v7. Must pass all existing Playwright tests.\n\n**Scope:** ~2,400 LOC across 18 files. Breaking changes are documented in the Stacks.js v7 migration guide.`,
    amount: 400_000000,
    token: "USDX",
    experienceMin: 2,
    experienceMax: 3,
    status: "SUBMITTED",
    fundingType: "self",
    assignee: "ST4QM6GXNQ9V4K7XNQJ8FRQPK1YMHQD5XJNB2T3",
    deadline: 159000,
    createdAt: 148500,
    applicantCount: 3,
    maxApplicants: 5,
    tags: ["Stacks.js", "Migration", "Frontend"],
    comments: [
      { id: 1, author: "0xbuilder.btc", avatarColor: "#5546FF", body: "Work submitted — PR is at github.com/alex-defi/frontend/pull/142. All 87 Playwright tests passing. Happy to walk through any part of the migration.", createdAt: 159010 },
    ],
  },
  {
    id: 7,
    creator: "ST9DD5NSR6Z2O7CRTM3JVUSN6QLJUA0ANQG7X8",
    creatorUsername: "stacks.pro",
    title: "Grant: Real-Time Stacks Indexer with WebSocket API",
    description: `Build and deploy a public Stacks indexer with WebSocket subscriptions for real-time block and transaction updates.\n\n**Features:**\n- Blocks, transactions, events, and contract calls\n- WebSocket subscription by address, contract, or event type\n- REST fallback with cursor-based pagination\n- Free tier for all Stacks developers\n- Open-source under MIT\n\n**Estimated to serve 50+ dApps from day one.**`,
    amount: 3000_000000,
    token: "USDX",
    experienceMin: 3,
    experienceMax: 4,
    status: "GRANT_PENDING",
    fundingType: "grant",
    deadline: 151500,
    createdAt: 150400,
    applicantCount: 0,
    maxApplicants: 3,
    tags: ["Infrastructure", "WebSockets", "Indexer"],
    grantJustification: "Every Stacks dApp currently runs its own node or depends on Hiro's paid API with strict rate limits. A free, real-time indexer eliminates this bottleneck for the entire ecosystem. The one-time build cost is a public good investment — estimated to save 50+ teams $500–$2,000/month in infrastructure costs.",
    comments: [
      { id: 1, author: "whale.btc", avatarColor: "#FFD700", body: "The infra need is real. We spend $800/month on Hiro API credits. A free alternative would be a game-changer.", createdAt: 150410 },
      { id: 2, author: "0xbuilder.btc", avatarColor: "#5546FF", body: "What's the hosting plan? Self-hosting with community donations, or looking for a specific sponsor?", createdAt: 150415 },
      { id: 3, author: "stacks.pro", avatarColor: "#8B80FF", body: "Plan is to host on Fly.io initially (cost ~$120/mo) with the grant funding 24 months of operation. After that, STX validators can run replicas for redundancy.", createdAt: 150418, isCreator: true },
    ],
  },
];

export const MOCK_GRANT_VOTES: Record<number, GrantVote> = {
  4: { taskId: 4, votesFor: 12500_000000, votesAgainst: 3200_000000, threshold: 10000_000000, deadline: 151000, executed: false },
  7: { taskId: 7, votesFor: 4200_000000,  votesAgainst: 8100_000000,  threshold: 10000_000000, deadline: 151500, executed: false },
};

export const MOCK_PATRONS: PatronProfile[] = [
  { address: "ST5XY1JNQ2V8K3ZNQJ9FRQPK2YMHQD6XJNB3T4", username: "whale.btc",   totalDeposited: 5000_000000, stxStaked: 2000_000000, tier: 3, votingWeight: 25000_000000 },
  { address: "ST6ZA2KOP3W9L4AOQJ0GSQRL3NIHRE7YKOC4U5", username: "builder.stx", totalDeposited: 1200_000000, stxStaked: 500_000000,  tier: 2, votingWeight: 6200_000000 },
  { address: "ST7BB3LPQ4X0M5BPRK1HTSRL4OJIS8ZLPD5V6",  username: "invest.btc",  totalDeposited: 600_000000,  stxStaked: 0,           tier: 1, votingWeight: 600_000000 },
];

export const MOCK_WAVE: WaveInfo = {
  waveId: 3,
  startBlock: 149000,
  poolAmount: 840_000000,
  totalTasks: 28,
};

export const MOCK_LEADERBOARD: UserProfile[] = [
  { address: "ST4QM6GXNQ9V4K7XNQJ8FRQPK1YMHQD5XJNB2T3", username: "0xbuilder.btc", role: "contributor", experienceLevel: 3, tasksCompleted: 24, totalEarned: 8400_000000, githubVerified: true, registeredAt: 140000, githubHandle: "0xbuilder" },
  { address: "ST8CC4MRQ5Y1N6BQSL2IUTRM5PKJT9ZMPF6W7",   username: "clarity.dev",   role: "contributor", experienceLevel: 4, tasksCompleted: 19, totalEarned: 6200_000000, githubVerified: true, registeredAt: 141000, githubHandle: "clarity-dev" },
  { address: "ST9DD5NSR6Z2O7CRTM3JVUSN6QLJUA0ANQG7X8",  username: "stacks.pro",   role: "contributor", experienceLevel: 3, tasksCompleted: 15, totalEarned: 4800_000000, githubVerified: true, registeredAt: 142000, githubHandle: "stacks-pro" },
  { address: "STAE6OTSS7P3P8DSUN4KWVOO7RKMVB1BORH9Y",   username: "newdev.btc",   role: "contributor", experienceLevel: 1, tasksCompleted: 8,  totalEarned: 1200_000000, githubVerified: true, registeredAt: 145000, githubHandle: "newdev-btc" },
  { address: "STBF7PUT8Q4Q9ETVN5LXWPP8SLNWC2COSI0Z",   username: "hacker.stx",   role: "contributor", experienceLevel: 2, tasksCompleted: 6,  totalEarned: 900_000000,  githubVerified: false, registeredAt: 146000 },
];
