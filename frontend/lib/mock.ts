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
  xVerified?: boolean;
  xHandle?: string;
}

export interface TaskComment {
  id: number;
  author: string;
  avatarColor: string;
  body: string;
  createdAt: number;
  isCreator?: boolean;
  replyTo?: number; // id of the comment this one replies to, if any
}

export interface TaskSubmission {
  id: number;
  author: string;
  avatarColor: string;
  proofUrl: string;
  createdAt: number;
}

export interface Task {
  id: number;
  creator: string;
  creatorUsername: string;
  title: string;
  description: string;
  amount: number;
  token: "MUSD" | "MEZO";
  experienceMin: number;
  experienceMax: number;
  status: string;
  fundingType: "self" | "grant";
  kind: "development" | "community";
  maxWinners?: number; // community only
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
  submissionCount?: number; // community only — total participants, from a batched count fetch (list pages)
  submissions?: TaskSubmission[]; // community only — proof-of-participation links (task detail page, full rows)
  winners?: string[]; // community only — addresses paid once selectWinners runs
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
  mezoStaked: number;
  tier: number;
  votingWeight: number;
}

export interface WaveInfo {
  waveId: number;
  startTime: number;
  poolAmount: number;
  totalTasks: number;
}

export interface CreatorLeaderboardEntry {
  address: string;
  username: string;
  selfFundedTasksPosted: number;
  githubVerified: boolean;
}

export const MOCK_WALLET: UserProfile = {
  address: "0x1a2B3c4D5e6F7089aBcDef0123456789aBcDef0",
  username: "satoshi.btc",
  role: "creator",
  experienceLevel: 3,
  tasksCompleted: 12,
  totalEarned: 4200,
  githubVerified: true,
  registeredAt: 1750000000,
  githubHandle: "satoshi-btc",
};

export const MOCK_TASKS: Task[] = [
  {
    id: 1,
    creator: "0x1a2B3c4D5e6F7089aBcDef0123456789aBcDef0",
    creatorUsername: "satoshi.btc",
    title: "Build Mezo DeFi Analytics Dashboard",
    description: `React frontend connecting to the Mezo RPC and a block explorer API to display protocol TVL, volume, and token stats.\n\n**Requirements:**\n- Wallet connection via RainbowKit + wagmi\n- Real-time data via viem watchers or polling\n- Charts for TVL trend, 24h volume, top tokens by market cap\n- Responsive layout, dark mode\n- Deployed to Vercel or similar\n\n**Deliverables:** GitHub repo + live URL. Must pass the provided Playwright E2E suite.`,
    amount: 500,
    token: "MUSD",
    experienceMin: 2,
    experienceMax: 3,
    status: "OPEN",
    fundingType: "self",
    kind: "development",
    deadline: 1751600000,
    createdAt: 1750100000,
    applicantCount: 4,
    maxApplicants: 8,
    githubRepo: "https://github.com/satoshi-btc/mezo-defi-dashboard",
    tags: ["React", "TypeScript", "wagmi"],
    comments: [
      { id: 1, author: "0xbuilder.btc", avatarColor: "#5546FF", body: "Very interested in this task! I've built two similar dashboards using viem + wagmi. Would the creator consider expanding the experience gate to Senior-level contributors?", createdAt: 1750110000 },
      { id: 2, author: "satoshi.btc", avatarColor: "#F7931A", body: "Yes, Senior is fine. Please include portfolio links in your application — particularly any Mezo-related projects.", createdAt: 1750115000, isCreator: true, replyTo: 1 },
      { id: 3, author: "solidity.dev", avatarColor: "#00D395", body: "Working on a proposal now. Quick question: will an RPC API key be provided or should I plan around the public Mezo endpoint's rate limits?", createdAt: 1750120000 },
      { id: 4, author: "satoshi.btc", avatarColor: "#F7931A", body: "You'll need to use the public Mezo RPC endpoint. The rate limits are generous enough for a read-only dashboard — around 500 req/min on the free tier.", createdAt: 1750122000, isCreator: true, replyTo: 3 },
    ],
  },
  {
    id: 2,
    creator: "0x2B3c4D5e6F7089aBcDef0123456789aBcDef012a",
    creatorUsername: "nakamoto.mezo",
    title: "Solidity Smart Contract Audit — Lending Protocol",
    description: `Formal security review of a lending protocol's Solidity contracts.\n\n**Scope:**\n- Reentrancy analysis across all public functions\n- SafeERC20 / allowance-flow coverage verification\n- Arithmetic edge cases (overflow, underflow, division by zero)\n- Access control review\n- Liquidation path correctness\n\n**Deliverables:** Written audit report (Markdown), annotated contract with inline findings, severity ratings (Critical / High / Medium / Low / Info).`,
    amount: 1200,
    token: "MUSD",
    experienceMin: 3,
    experienceMax: 4,
    status: "OPEN",
    fundingType: "self",
    kind: "development",
    deadline: 1751700000,
    createdAt: 1750200000,
    applicantCount: 2,
    maxApplicants: 5,
    tags: ["Solidity", "Security", "Audit"],
    githubRepo: "https://github.com/nakamoto-mezo/lending-protocol",
    comments: [
      { id: 1, author: "mezo.pro", avatarColor: "#8B80FF", body: "Interested. What's the codebase size? Knowing the line count helps estimate scope.", createdAt: 1750210000 },
      { id: 2, author: "nakamoto.mezo", avatarColor: "#60A5FA", body: "~1,200 lines across 4 contracts. Core logic is in LendingPool.sol (~700 LOC) and PriceOracle.sol (~300 LOC).", createdAt: 1750212000, isCreator: true },
    ],
  },
  {
    id: 3,
    creator: "0x3c4D5e6F7089aBcDef0123456789aBcDef012a3B",
    creatorUsername: "alex.defi",
    title: "Implement ERC-20 Token Bridge UI",
    description: `Build the frontend for a cross-chain token bridge between Mezo and Ethereum mainnet.\n\n**Tech stack:** Next.js 14, wagmi, viem\n\n**Features:**\n- Wallet connection for both chains simultaneously\n- Token selection + amount input with live exchange rate\n- Approve / transfer flow builders for ERC-20 transfers\n- Error state handling for failed/timed-out bridge transactions\n- Transaction history view`,
    amount: 300,
    token: "MUSD",
    experienceMin: 1,
    experienceMax: 2,
    status: "IN_PROGRESS",
    fundingType: "self",
    kind: "development",
    assignee: "0x4D5e6F7089aBcDef0123456789aBcDef012a3B4C",
    deadline: 1751200000,
    createdAt: 1749000000,
    applicantCount: 7,
    maxApplicants: 10,
    tags: ["Bridge", "Frontend", "wagmi"],
    comments: [
      { id: 1, author: "newdev.btc", avatarColor: "#60A5FA", body: "Assigned to me now — started with the wallet connection layer. Will push first PR by end of week.", createdAt: 1749500000 },
    ],
  },
  {
    id: 4,
    creator: "0x2B3c4D5e6F7089aBcDef0123456789aBcDef012a",
    creatorUsername: "nakamoto.mezo",
    title: "Grant: Open-Source NFT Marketplace on Mezo",
    description: `Build a fully open-source NFT marketplace using Solidity contracts and a Next.js frontend. All code MIT licensed and published to GitHub on completion.\n\n**Deliverables:**\n- Solidity contracts: list, buy, makeOffer, acceptOffer, cancel\n- Next.js frontend with wallet connect, listing page, detail page, user profile\n- Foundry test suite with ≥90% coverage\n- Deployment guide for community forks\n\n**Timeline:** 6 weeks from grant approval.`,
    amount: 2000,
    token: "MUSD",
    experienceMin: 2,
    experienceMax: 4,
    status: "GRANT_PENDING",
    fundingType: "grant",
    kind: "development",
    deadline: 1750500000,
    createdAt: 1750050000,
    applicantCount: 0,
    maxApplicants: 5,
    tags: ["NFT", "Solidity", "Next.js"],
    githubRepo: "https://github.com/nakamoto-mezo/mezo-nft-marketplace",
    grantJustification: "An open-source NFT marketplace will serve as the canonical reference implementation for NFT trading on Mezo. We estimate 100+ derivative projects in the first year. The team has shipped two prior Mezo production apps (Mezo DEX v2, SimpleSwap). All code will be MIT licensed with a full deployment guide so any developer can fork and run their own instance.",
    comments: [
      { id: 1, author: "whale.btc", avatarColor: "#FFD700", body: "Strong +1 on this. Open-source NFT infrastructure is exactly what the Mezo ecosystem needs right now. The lack of a reference marketplace has been a real barrier for new devs.", createdAt: 1750055000 },
      { id: 2, author: "mezo.pro", avatarColor: "#8B80FF", body: "Do you have a GitHub repo with previous work we can review? Would help the community make a more informed vote.", createdAt: 1750060000 },
      { id: 3, author: "nakamoto.mezo", avatarColor: "#60A5FA", body: "Good point — see github.com/nakamoto-mezo/mezo-dex-v2 for our DEX work. ~4k GitHub stars, actively maintained.", createdAt: 1750062000, isCreator: true },
    ],
  },
  {
    id: 5,
    creator: "0x1a2B3c4D5e6F7089aBcDef0123456789aBcDef0",
    creatorUsername: "satoshi.btc",
    title: "Write Foundry Unit Tests for Staking Contract",
    description: `Full test coverage for a staking contract using Foundry.\n\n**Must cover:**\n- Happy path staking and unstaking\n- Cooldown period edge cases\n- Reward distribution with multiple stakers\n- Slashing conditions (if applicable)\n- Timestamp boundary conditions\n\n**Deliverables:** PR to the repo with ≥95% coverage reported by \`forge coverage\`.`,
    amount: 150,
    token: "MUSD",
    experienceMin: 0,
    experienceMax: 1,
    status: "OPEN",
    fundingType: "self",
    kind: "development",
    deadline: 1752200000,
    createdAt: 1750300000,
    applicantCount: 1,
    maxApplicants: 5,
    tags: ["Foundry", "Testing", "Solidity"],
    comments: [],
  },
  {
    id: 6,
    creator: "0x3c4D5e6F7089aBcDef0123456789aBcDef012a3B",
    creatorUsername: "alex.defi",
    title: "Migrate ALEX DEX Frontend to wagmi v3",
    description: `Update all wallet connection logic and transaction builders from wagmi v2 to v3. Must pass all existing Playwright tests.\n\n**Scope:** ~2,400 LOC across 18 files. Breaking changes are documented in the wagmi v3 migration guide.`,
    amount: 400,
    token: "MUSD",
    experienceMin: 2,
    experienceMax: 3,
    status: "SUBMITTED",
    fundingType: "self",
    kind: "development",
    assignee: "0x4D5e6F7089aBcDef0123456789aBcDef012a3B4C",
    deadline: 1751900000,
    createdAt: 1748500000,
    applicantCount: 3,
    maxApplicants: 5,
    tags: ["wagmi", "Migration", "Frontend"],
    comments: [
      { id: 1, author: "0xbuilder.btc", avatarColor: "#5546FF", body: "Work submitted — PR is at github.com/alex-defi/frontend/pull/142. All 87 Playwright tests passing. Happy to walk through any part of the migration.", createdAt: 1751900100 },
    ],
  },
  {
    id: 7,
    creator: "0x9DD5e6F7089aBcDef0123456789aBcDef012a3B4",
    creatorUsername: "mezo.pro",
    title: "Grant: Real-Time Mezo Indexer with WebSocket API",
    description: `Build and deploy a public Mezo indexer with WebSocket subscriptions for real-time block and transaction updates.\n\n**Features:**\n- Blocks, transactions, events, and contract calls\n- WebSocket subscription by address, contract, or event type\n- REST fallback with cursor-based pagination\n- Free tier for all Mezo developers\n- Open-source under MIT\n\n**Estimated to serve 50+ dApps from day one.**`,
    amount: 3000,
    token: "MUSD",
    experienceMin: 3,
    experienceMax: 4,
    status: "GRANT_PENDING",
    fundingType: "grant",
    kind: "development",
    deadline: 1750650000,
    createdAt: 1750400000,
    applicantCount: 0,
    maxApplicants: 3,
    tags: ["Infrastructure", "WebSockets", "Indexer"],
    grantJustification: "Every Mezo dApp currently runs its own node or depends on a paid RPC provider with strict rate limits. A free, real-time indexer eliminates this bottleneck for the entire ecosystem. The one-time build cost is a public good investment — estimated to save 50+ teams $500–$2,000/month in infrastructure costs.",
    comments: [
      { id: 1, author: "whale.btc", avatarColor: "#FFD700", body: "The infra need is real. We spend $800/month on RPC provider credits. A free alternative would be a game-changer.", createdAt: 1750410000 },
      { id: 2, author: "0xbuilder.btc", avatarColor: "#5546FF", body: "What's the hosting plan? Self-hosting with community donations, or looking for a specific sponsor?", createdAt: 1750415000 },
      { id: 3, author: "mezo.pro", avatarColor: "#8B80FF", body: "Plan is to host on Fly.io initially (cost ~$120/mo) with the grant funding 24 months of operation. After that, MEZO validators can run replicas for redundancy.", createdAt: 1750418000, isCreator: true },
    ],
  },
  {
    id: 8,
    creator: "0x2B3c4D5e6F7089aBcDef0123456789aBcDef012a",
    creatorUsername: "nakamoto.mezo",
    title: "Top 5 Best Mainnet Launch Memes on X",
    description: `We're launching on Mezo mainnet next month and want the timeline flooded with good memes.\n\n**How it works:**\n- Post a meme about the Mezo mainnet launch on X\n- Join this task with a link to your post\n- Top 5 posts (by creativity, not just engagement) get paid — picked by us, split evenly\n\nNo code required. Just needs to be original and on-topic.`,
    amount: 250,
    token: "MUSD",
    experienceMin: 0,
    experienceMax: 0,
    status: "OPEN",
    fundingType: "self",
    kind: "community",
    maxWinners: 5,
    deadline: 1752400000,
    createdAt: 1750500000,
    tags: ["Social", "Marketing", "X"],
    comments: [],
    submissions: [
      { id: 1, author: "cryptomemer.btc", avatarColor: "#F7931A", proofUrl: "https://x.com/cryptomemer/status/1001", createdAt: 1750510000 },
      { id: 2, author: "0xdegenerate", avatarColor: "#5546FF", proofUrl: "https://x.com/0xdegenerate/status/1002", createdAt: 1750520000 },
      { id: 3, author: "satstacker.mezo", avatarColor: "#00D395", proofUrl: "https://x.com/satstacker/status/1003", createdAt: 1750530000 },
    ],
  },
  {
    id: 9,
    creator: "0x9DD5e6F7089aBcDef0123456789aBcDef012a3B4",
    creatorUsername: "mezo.pro",
    title: "Top 3 Highest-Quality Bug Reports From Testnet",
    description: `We want detailed, reproducible bug reports from real testnet usage — not code fixes, just clear write-ups.\n\n**What counts:**\n- Steps to reproduce\n- Expected vs actual behavior\n- Screenshots or a short screen recording\n\nJoin with a link to your write-up (a GitHub issue, a Notion doc, a tweet thread — anything public and readable). Top 3 most useful reports get paid.`,
    amount: 180,
    token: "MUSD",
    experienceMin: 0,
    experienceMax: 0,
    status: "OPEN",
    fundingType: "self",
    kind: "community",
    maxWinners: 3,
    deadline: 1752600000,
    createdAt: 1750600000,
    tags: ["Testing", "Community", "QA"],
    comments: [],
    submissions: [
      { id: 1, author: "bugsniper.btc", avatarColor: "#8B80FF", proofUrl: "https://x.com/bugsniper/status/2001", createdAt: 1750610000 },
    ],
  },
];

export const MOCK_GRANT_VOTES: Record<number, GrantVote> = {
  4: { taskId: 4, votesFor: 12500, votesAgainst: 3200, threshold: 10000, deadline: 1750500000, executed: false },
  7: { taskId: 7, votesFor: 4200,  votesAgainst: 8100,  threshold: 10000, deadline: 1750650000, executed: false },
};

export const MOCK_PATRONS: PatronProfile[] = [
  { address: "0x5XY1J2V8K3znQJ9FrqPk2YmHqD6xJnB3T4C5D6E7", username: "whale.btc",   totalDeposited: 5000, mezoStaked: 2000, tier: 3, votingWeight: 25000 },
  { address: "0x6ZA2K3W9L4aoQj0GsqRl3NihRe7YkOc4U5D6E7F8", username: "builder.mezo", totalDeposited: 1200, mezoStaked: 500,  tier: 2, votingWeight: 6200 },
  { address: "0x7BB3L4X0M5bpRk1HtsRl4OjIs8ZlPd5V6E7F8G9H", username: "invest.btc",  totalDeposited: 600,  mezoStaked: 0,    tier: 1, votingWeight: 600 },
];

export const MOCK_WAVE: WaveInfo = {
  waveId: 3,
  startTime: 1749000000,
  poolAmount: 840,
  totalTasks: 28,
};

export const MOCK_LEADERBOARD: UserProfile[] = [
  { address: "0x4D5e6F7089aBcDef0123456789aBcDef012a3B4C", username: "0xbuilder.btc", role: "contributor", experienceLevel: 3, tasksCompleted: 24, totalEarned: 8400, githubVerified: true, registeredAt: 1740000000, githubHandle: "0xbuilder" },
  { address: "0x8CC4M5Y1n6BqSl2IuTrM5pKjT9zMpF6W7D8E9F0A", username: "solidity.dev", role: "contributor", experienceLevel: 4, tasksCompleted: 19, totalEarned: 6200, githubVerified: true, registeredAt: 1741000000, githubHandle: "solidity-dev" },
  { address: "0x9DD5e6F7089aBcDef0123456789aBcDef012a3B4", username: "mezo.pro",   role: "contributor", experienceLevel: 3, tasksCompleted: 15, totalEarned: 4800, githubVerified: true, registeredAt: 1742000000, githubHandle: "mezo-pro" },
  { address: "0xAE6OTSS7P3p8DsUn4KwVoo7RkMvB1BoRh9Y0A1B2C", username: "newdev.btc",  role: "contributor", experienceLevel: 1, tasksCompleted: 8,  totalEarned: 1200, githubVerified: true, registeredAt: 1745000000, githubHandle: "newdev-btc" },
  { address: "0xBF7PUT8Q4q9EtVn5LxWpP8sLnWc2CoSi0Z1A2B3C4", username: "hacker.mezo", role: "contributor", experienceLevel: 2, tasksCompleted: 6,  totalEarned: 900,  githubVerified: false, registeredAt: 1746000000 },
];

// Creators ranked by self-funded tasks posted in the current wave epoch —
// only self-funded tasks earn leaderboard credit (grant-funded tasks are
// excluded on-chain, see Taskify.sol's wave-reward accounting).
export const MOCK_CREATOR_LEADERBOARD: CreatorLeaderboardEntry[] = [
  { address: "0x1a2B3c4D5e6F7089aBcDef0123456789aBcDef0", username: "satoshi.btc",   selfFundedTasksPosted: 9, githubVerified: true },
  { address: "0x2B3c4D5e6F7089aBcDef0123456789aBcDef012a", username: "nakamoto.mezo", selfFundedTasksPosted: 7, githubVerified: true },
  { address: "0x3c4D5e6F7089aBcDef0123456789aBcDef012a3B", username: "alex.defi",     selfFundedTasksPosted: 6, githubVerified: true },
  { address: "0x9DD5e6F7089aBcDef0123456789aBcDef012a3B4", username: "mezo.pro",      selfFundedTasksPosted: 4, githubVerified: true },
  { address: "0x5XY1J2V8K3znQJ9FrqPk2YmHqD6xJnB3T4C5D6E7", username: "whale.btc",     selfFundedTasksPosted: 2, githubVerified: false },
];
