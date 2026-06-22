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

export interface Task {
  id: number;
  creator: string;
  creatorUsername: string;
  title: string;
  description: string;
  amount: number;
  token: string;
  experienceMin: number;
  experienceMax: number;
  status: string;
  fundingType: "self" | "grant";
  assignee?: string;
  deadline: number;
  createdAt: number;
  applicantCount?: number;
  tags?: string[];
}

export interface GrantVote {
  taskId: number;
  votesFor: number;
  votesAgainst: number;
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

// Mock current user — in production this comes from the connected wallet
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
    description: "React frontend connecting to the Stacks API to display protocol TVL, volume, and token stats. Must support wallet connection via Stacks Connect and real-time data via the Hiro API.",
    amount: 500_000000,
    token: "USDX",
    experienceMin: 2,
    experienceMax: 3,
    status: "OPEN",
    fundingType: "self",
    deadline: 160000,
    createdAt: 150100,
    applicantCount: 4,
    tags: ["React", "TypeScript", "Stacks API"],
  },
  {
    id: 2,
    creator: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    creatorUsername: "nakamoto.stx",
    title: "Clarity Smart Contract Audit — Lending Protocol",
    description: "Formal review of a lending protocol's Clarity contracts. Focus on reentrancy, post-condition coverage, and arithmetic edge cases.",
    amount: 1200_000000,
    token: "USDX",
    experienceMin: 3,
    experienceMax: 4,
    status: "OPEN",
    fundingType: "self",
    deadline: 161000,
    createdAt: 150200,
    applicantCount: 2,
    tags: ["Clarity", "Security", "Audit"],
  },
  {
    id: 3,
    creator: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7D3N5",
    creatorUsername: "alex.defi",
    title: "Implement SIP-010 Token Bridge UI",
    description: "Build the frontend for a cross-chain token bridge. Must handle wallet signing, post-conditions, and error states from Clarity.",
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
    tags: ["Bridge", "Frontend", "Stacks.js"],
  },
  {
    id: 4,
    creator: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    creatorUsername: "nakamoto.stx",
    title: "Grant: Open-Source NFT Marketplace on Stacks",
    description: "Build an open-source NFT marketplace using Clarity contracts and a Next.js frontend. All code must be MIT licensed and published to GitHub.",
    amount: 2000_000000,
    token: "USDX",
    experienceMin: 2,
    experienceMax: 4,
    status: "GRANT_PENDING",
    fundingType: "grant",
    deadline: 151000,
    createdAt: 150050,
    applicantCount: 0,
    tags: ["NFT", "Clarity", "Next.js"],
  },
  {
    id: 5,
    creator: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    creatorUsername: "satoshi.btc",
    title: "Write Clarinet Unit Tests for Stacking Contract",
    description: "Full test coverage for a stacking contract using Clarinet and Vitest. Must include edge cases for cooldown periods and reward distribution.",
    amount: 150_000000,
    token: "USDX",
    experienceMin: 0,
    experienceMax: 1,
    status: "OPEN",
    fundingType: "self",
    deadline: 162000,
    createdAt: 150300,
    applicantCount: 1,
    tags: ["Clarinet", "Testing", "Vitest"],
  },
  {
    id: 6,
    creator: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7D3N5",
    creatorUsername: "alex.defi",
    title: "Migrate ALEX DEX Frontend to Stacks.js v7",
    description: "Update all wallet connection logic and post-condition builders from Stacks.js v6 to v7. Must pass all existing Playwright tests.",
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
    tags: ["Stacks.js", "Migration", "Frontend"],
  },
];

export const MOCK_GRANT_VOTES: Record<number, GrantVote> = {
  4: { taskId: 4, votesFor: 12500_000000, votesAgainst: 3200_000000, deadline: 151000, executed: false },
};

export const MOCK_PATRONS: PatronProfile[] = [
  { address: "ST5XY1JNQ2V8K3ZNQJ9FRQPK2YMHQD6XJNB3T4", username: "whale.btc",    totalDeposited: 5000_000000, stxStaked: 2000_000000, tier: 3, votingWeight: 25000_000000 },
  { address: "ST6ZA2KOP3W9L4AOQJ0GSQRL3NIHRE7YKOC4U5", username: "builder.stx",  totalDeposited: 1200_000000, stxStaked: 500_000000,  tier: 2, votingWeight: 6200_000000  },
  { address: "ST7BB3LPQ4X0M5BPRK1HTSR L4OJIS8ZLPD5V6", username: "invest.btc",  totalDeposited: 600_000000,  stxStaked: 0,           tier: 1, votingWeight: 600_000000   },
];

export const MOCK_WAVE: WaveInfo = {
  waveId: 3,
  startBlock: 149000,
  poolAmount: 840_000000,
  totalTasks: 28,
};

export const MOCK_LEADERBOARD: UserProfile[] = [
  { address: "ST4QM6GXNQ9V4K7XNQJ8FRQPK1YMHQD5XJNB2T3", username: "0xbuilder.btc", role: "contributor", experienceLevel: 3, tasksCompleted: 24, totalEarned: 8400_000000,  githubVerified: true, registeredAt: 140000, githubHandle: "0xbuilder" },
  { address: "ST8CC4MRQ5Y1N6BQSL2IUTR M5PKJT9ZMPF6W7", username: "clarity.dev",   role: "contributor", experienceLevel: 4, tasksCompleted: 19, totalEarned: 6200_000000,  githubVerified: true, registeredAt: 141000, githubHandle: "clarity-dev" },
  { address: "ST9DD5NSR6Z2O7CRTM3JVUS N6QLJUA0ANQG7X8", username: "stacks.pro",   role: "contributor", experienceLevel: 3, tasksCompleted: 15, totalEarned: 4800_000000,  githubVerified: true, registeredAt: 142000, githubHandle: "stacks-pro" },
  { address: "STAE6OTS S7P3P8DSUN4KWVO O7RKMVB1BORH9Y", username: "newdev.btc",   role: "contributor", experienceLevel: 1, tasksCompleted: 8,  totalEarned: 1200_000000,  githubVerified: true, registeredAt: 145000, githubHandle: "newdev-btc" },
  { address: "STBF7PUTt8Q4Q9ETVN5LXWP P8SLNWC2COSI0Z", username: "hacker.stx",   role: "contributor", experienceLevel: 2, tasksCompleted: 6,  totalEarned: 900_000000,   githubVerified: false, registeredAt: 146000 },
];
