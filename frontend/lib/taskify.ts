import TaskifyAbiJson from "@/lib/abi/Taskify.json";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

export const TASKIFY_ABI = TaskifyAbiJson;

export const TASKIFY_ADDRESS = process.env.NEXT_PUBLIC_TASKIFY_CONTRACT as `0x${string}` | undefined;

export const MUSD_ADDRESS = (process.env.NEXT_PUBLIC_MUSD_CONTRACT ?? CONTRACT_ADDRESSES.testnet.musd) as `0x${string}`;
export const MEZO_ADDRESS = (process.env.NEXT_PUBLIC_MEZO_CONTRACT ?? CONTRACT_ADDRESSES.testnet.mezo) as
  | `0x${string}`
  | undefined;

export function tokenAddress(currency: "MUSD" | "MEZO"): `0x${string}` | undefined {
  return currency === "MUSD" ? MUSD_ADDRESS : MEZO_ADDRESS;
}

export const GRANT_PASS_THRESHOLD = 70;

// Voting weight now comes straight from Taskify.sol's getVotingWeight() — a
// live read of the patron's veBTC position on Mezo's own Tigris contracts,
// not something computed client-side. See VOTING_SYSTEM_REDESIGN.md. The
// scale of that number is whatever Mezo's veBTC contracts define, not
// something Taskify controls, so this just formats it with thousands
// separators rather than applying an invented display divisor.
export function formatVotingWeight(raw: bigint): string {
  return raw.toLocaleString();
}

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// Mirrors Taskify.sol's Role enum (0=None, 1=Creator, 2=Contributor).
export const ROLE_ID = { creator: 1, contributor: 2 } as const;
export const ROLE_NAME = ["none", "creator", "contributor"] as const;

// Mirrors Taskify.sol's Status enum — keys match TASK_STATUSES in lib/constants.ts.
export const STATUS_NAME = [
  "NONE",
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "SUBMITTED",
  "FUNDS_RELEASED",
  "CANCELLED",
  "EXPIRED",
  "GRANT_PENDING",
  "GRANT_REJECTED",
] as const;

export function statusToString(status: number): string {
  return STATUS_NAME[status] ?? "NONE";
}

export function roleToString(role: number): "none" | "creator" | "contributor" {
  return ROLE_NAME[role] ?? "none";
}
