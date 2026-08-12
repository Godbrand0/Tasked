"use client";

import { useQuery } from "@tanstack/react-query";
import { useConfig, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import type { TransactionReceipt } from "viem";
import { ERC20_ABI, MUSD_ADDRESS, TASKIFY_ABI, TASKIFY_ADDRESS, statusToString } from "@/lib/taskify";
import { MUSD_DECIMALS } from "@/lib/constants";
import type { Task } from "@/lib/mock";

// ─── Writes ─────────────────────────────────────────────────────────────────

// Shared submit-and-confirm helper: every mutating action in the app routes
// through this so a write only ever resolves once it's actually mined, not
// just accepted into the mempool — pages can await it and immediately trust
// the result.
export function useTaskifyTx() {
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();

  async function send(
    functionName: string,
    args: readonly unknown[] = [],
    overrides?: { address?: `0x${string}`; abi?: readonly unknown[] }
  ) {
    const address = overrides?.address ?? TASKIFY_ADDRESS;
    if (!address) throw new Error("Contract address not configured");
    const hash = await writeContractAsync({
      address,
      abi: (overrides?.abi ?? TASKIFY_ABI) as never,
      functionName,
      args,
    } as never);
    // Mezo's public testnet RPC occasionally lags behind the chain tip, so
    // the default retryCount (6, viem's default) for "receipt not found yet"
    // can exhaust before the RPC actually catches up — throwing even though
    // the transaction genuinely succeeded (confirmed separately by the
    // wallet's own toast). Raised retryCount/retryDelay give it more room.
    const receipt = await waitForTransactionReceipt(config, { hash, retryCount: 15, retryDelay: 2000 });
    return receipt;
  }

  return { send };
}

// Pulls the on-chain taskId out of a create/apply receipt by decoding the
// relevant event (TaskCreated for createTask/createCommunityTask,
// GrantApplied for applyForGrant) — the only reliable way to know the id,
// since nextTaskId can't be trusted after the fact (other creators may have
// posted tasks in between).
export function extractTaskId(receipt: TransactionReceipt, eventName: "TaskCreated" | "GrantApplied" = "TaskCreated"): number | undefined {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== TASKIFY_ADDRESS?.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: TASKIFY_ABI as never, data: log.data, topics: log.topics });
      if (decoded.eventName === eventName) {
        return Number((decoded.args as unknown as { taskId: bigint }).taskId);
      }
    } catch {
      // not a matching log (or not decodable with this ABI) — skip
    }
  }
  return undefined;
}

// Approves `spender` for `amountHuman` of `token` if the current allowance is
// insufficient. No-ops (skips the extra transaction) when already approved.
export function useApproveIfNeeded() {
  const { send } = useTaskifyTx();
  const publicClient = usePublicClient();

  async function ensureApproval(token: `0x${string}`, owner: `0x${string}`, spender: `0x${string}`, amountRaw: bigint) {
    if (!publicClient) throw new Error("No RPC client available");
    const allowance = (await publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, spender],
    })) as bigint;
    if (allowance >= amountRaw) return;
    await send("approve", [spender, amountRaw], { address: token, abi: ERC20_ABI });
  }

  return { ensureApproval };
}

export function toRawMUSD(amountHuman: number): bigint {
  return parseUnits(amountHuman.toString(), MUSD_DECIMALS);
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export interface OnChainUser {
  username: string;
  role: number;
  experienceLevel: number;
  tasksCompleted: number;
  totalEarned: bigint;
  githubVerified: boolean;
  registeredAt: number;
  lastExperienceUpdate: number;
  xVerified: boolean;
}

const EMPTY_USER: OnChainUser = {
  username: "",
  role: 0,
  experienceLevel: 0,
  tasksCompleted: 0,
  totalEarned: BigInt(0),
  githubVerified: false,
  registeredAt: 0,
  lastExperienceUpdate: 0,
  xVerified: false,
};

export function useTaskifyUser(address: string | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "users",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: Boolean(address && TASKIFY_ADDRESS) },
  });

  const t = data as readonly [string, number, number, bigint, bigint, boolean, bigint, bigint, boolean] | undefined;
  const user: OnChainUser = t
    ? {
        username: t[0],
        role: t[1],
        experienceLevel: t[2],
        tasksCompleted: Number(t[3]),
        totalEarned: t[4],
        githubVerified: t[5],
        registeredAt: Number(t[6]),
        lastExperienceUpdate: Number(t[7]),
        xVerified: t[8],
      }
    : EMPTY_USER;

  return { user, isLoading, refetch };
}

export interface OnChainPatron {
  totalDeposited: bigint;
  mezoStaked: bigint;
  tier: number;
}

export function usePatron(address: string | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "patrons",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: Boolean(address && TASKIFY_ADDRESS) },
  });

  const t = data as readonly [bigint, bigint, number] | undefined;
  const patron: OnChainPatron = t
    ? { totalDeposited: t[0], mezoStaked: t[1], tier: t[2] }
    : { totalDeposited: BigInt(0), mezoStaked: BigInt(0), tier: 99 };

  return { patron, isLoading, refetch };
}

export interface OnChainTask {
  id: number;
  creator: string;
  title: string;
  amount: bigint;
  token: string;
  experienceMin: number;
  experienceMax: number;
  status: number;
  fundingType: number;
  assignee: string;
  deadline: number;
  createdAt: number;
  kind: number;
  maxWinners: number;
}

function parseTaskTuple(id: number, t: readonly unknown[]): OnChainTask {
  return {
    id,
    creator: t[0] as string,
    title: t[1] as string,
    amount: t[2] as bigint,
    token: t[3] as string,
    experienceMin: t[4] as number,
    experienceMax: t[5] as number,
    status: t[6] as number,
    fundingType: t[7] as number,
    assignee: t[8] as string,
    deadline: Number(t[9]),
    createdAt: Number(t[10]),
    kind: t[11] as number,
    maxWinners: t[12] as number,
  };
}

// Converts an on-chain task into the shape TaskCard/lib/mock's Task consumers
// expect. description/tags/images/githubRepo/grantJustification have no
// on-chain home (no task_content table is wired at creation time yet), so
// they're always empty — components that render them already guard for that.
export function mapOnChainTask(t: OnChainTask, creatorUsername: string): Task {
  return {
    id: t.id,
    creator: t.creator,
    creatorUsername: creatorUsername || `${t.creator.slice(0, 6)}…${t.creator.slice(-4)}`,
    title: t.title,
    description: "",
    amount: Number(formatUnits(t.amount, MUSD_DECIMALS)),
    token: t.token.toLowerCase() === MUSD_ADDRESS.toLowerCase() ? "MUSD" : "MEZO",
    experienceMin: t.experienceMin,
    experienceMax: t.experienceMax,
    status: statusToString(t.status),
    fundingType: t.fundingType === 1 ? "grant" : "self",
    kind: t.kind === 1 ? "community" : "development",
    maxWinners: t.maxWinners || undefined,
    assignee: t.assignee !== "0x0000000000000000000000000000000000000000" ? t.assignee : undefined,
    deadline: t.deadline,
    createdAt: t.createdAt,
  };
}

// Batched username lookup for a set of addresses (e.g. every task creator on
// the browse page) — same rationale as useTaskApplicants: hooks can't be
// called in a loop with a dynamic count.
export function useUsersBatch(addresses: string[]) {
  const publicClient = usePublicClient();
  const unique = Array.from(new Set(addresses.map((a) => a.toLowerCase())));

  return useQuery({
    queryKey: ["taskify", "usersBatch", TASKIFY_ADDRESS, unique.join(",")],
    enabled: Boolean(publicClient && TASKIFY_ADDRESS && unique.length > 0),
    queryFn: async () => {
      const contractAddress = TASKIFY_ADDRESS;
      if (!publicClient || !contractAddress) return {} as Record<string, string>;
      const results = await Promise.all(
        unique.map((addr) =>
          publicClient.readContract({
            address: contractAddress,
            abi: TASKIFY_ABI,
            functionName: "users",
            args: [addr as `0x${string}`],
          })
        )
      );
      const map: Record<string, string> = {};
      unique.forEach((addr, i) => {
        map[addr] = (results[i] as readonly [string, ...unknown[]])[0];
      });
      return map;
    },
  });
}

// Same as useUsersBatch but keeps username + githubVerified — used by the
// leaderboard, which needs the verified badge alongside the display name.
export function useUsersBatchFull(addresses: string[]) {
  const publicClient = usePublicClient();
  const unique = Array.from(new Set(addresses.map((a) => a.toLowerCase())));

  return useQuery({
    queryKey: ["taskify", "usersBatchFull", TASKIFY_ADDRESS, unique.join(",")],
    enabled: Boolean(publicClient && TASKIFY_ADDRESS && unique.length > 0),
    queryFn: async () => {
      const contractAddress = TASKIFY_ADDRESS;
      if (!publicClient || !contractAddress) return {} as Record<string, { username: string; githubVerified: boolean }>;
      const results = await Promise.all(
        unique.map((addr) =>
          publicClient.readContract({
            address: contractAddress,
            abi: TASKIFY_ABI,
            functionName: "users",
            args: [addr as `0x${string}`],
          })
        )
      );
      const map: Record<string, { username: string; githubVerified: boolean }> = {};
      unique.forEach((addr, i) => {
        const t = results[i] as readonly [string, number, number, bigint, bigint, boolean, bigint, bigint, boolean];
        map[addr] = { username: t[0], githubVerified: t[5] };
      });
      return map;
    },
  });
}

export function useTaskifyTask(taskId: number | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "tasks",
    args: taskId !== undefined ? [BigInt(taskId)] : undefined,
    query: { enabled: Boolean(taskId !== undefined && TASKIFY_ADDRESS) },
  });

  const task = data && taskId !== undefined ? parseTaskTuple(taskId, data as readonly unknown[]) : undefined;
  return { task, isLoading, refetch };
}

// Enumerates every task by reading nextTaskId then reading tasks(1..n-1)
// individually — the contract has no list getter, and no indexer runs yet
// (see scripts/indexer.ts), so this is the only source of truth for "all
// tasks" today. Fine at testnet scale; would need the indexer once task
// counts get large.
export function useAllTasks() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["taskify", "allTasks", TASKIFY_ADDRESS],
    enabled: Boolean(publicClient && TASKIFY_ADDRESS),
    refetchInterval: 20000,
    queryFn: async (): Promise<OnChainTask[]> => {
      const contractAddress = TASKIFY_ADDRESS;
      if (!publicClient || !contractAddress) return [];
      const nextTaskId = (await publicClient.readContract({
        address: contractAddress,
        abi: TASKIFY_ABI,
        functionName: "nextTaskId",
      })) as bigint;

      const count = Number(nextTaskId) - 1;
      if (count <= 0) return [];

      const ids = Array.from({ length: count }, (_, i) => i + 1);
      const tuples = await Promise.all(
        ids.map((id) =>
          publicClient.readContract({
            address: contractAddress,
            abi: TASKIFY_ABI,
            functionName: "tasks",
            args: [BigInt(id)],
          })
        )
      );
      return ids.map((id, i) => parseTaskTuple(id, tuples[i] as readonly unknown[]));
    },
  });
}

export interface OnChainGrantVote {
  votesFor: bigint;
  votesAgainst: bigint;
  deadline: number;
  executed: boolean;
}

export function useGrantVote(taskId: number | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "grantVotes",
    args: taskId !== undefined ? [BigInt(taskId)] : undefined,
    query: { enabled: Boolean(taskId !== undefined && TASKIFY_ADDRESS) },
  });

  const t = data as readonly [bigint, bigint, bigint, boolean] | undefined;
  const vote: OnChainGrantVote | undefined = t
    ? { votesFor: t[0], votesAgainst: t[1], deadline: Number(t[2]), executed: t[3] }
    : undefined;

  return { vote, isLoading, refetch };
}

// Batched version of useGrantVote + grantVoters for a set of task ids — used
// by the investor page, which lists every GRANT_PENDING task at once and
// can't call one useReadContract per row (hook count must stay fixed).
export function useGrantVotesBatch(taskIds: number[], voterAddress: string | undefined) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["taskify", "grantVotesBatch", TASKIFY_ADDRESS, taskIds.join(","), voterAddress],
    enabled: Boolean(publicClient && TASKIFY_ADDRESS && taskIds.length > 0),
    refetchInterval: 20000,
    queryFn: async () => {
      const contractAddress = TASKIFY_ADDRESS;
      if (!publicClient || !contractAddress) return {} as Record<number, OnChainGrantVote & { hasVoted: boolean }>;
      const results = await Promise.all(
        taskIds.map(async (id) => {
          const t = (await publicClient.readContract({
            address: contractAddress,
            abi: TASKIFY_ABI,
            functionName: "grantVotes",
            args: [BigInt(id)],
          })) as readonly [bigint, bigint, bigint, boolean];
          const hasVoted = voterAddress
            ? ((await publicClient.readContract({
                address: contractAddress,
                abi: TASKIFY_ABI,
                functionName: "grantVoters",
                args: [BigInt(id), voterAddress as `0x${string}`],
              })) as boolean)
            : false;
          return [id, { votesFor: t[0], votesAgainst: t[1], deadline: Number(t[2]), executed: t[3], hasVoted }] as const;
        })
      );
      return Object.fromEntries(results) as Record<number, OnChainGrantVote & { hasVoted: boolean }>;
    },
  });
}

export function useHasVoted(taskId: number | undefined, address: string | undefined) {
  const { data, refetch } = useReadContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "grantVoters",
    args: taskId !== undefined && address ? [BigInt(taskId), address as `0x${string}`] : undefined,
    query: { enabled: Boolean(taskId !== undefined && address && TASKIFY_ADDRESS) },
  });
  return { hasVoted: Boolean(data), refetch };
}

export function useTaskApplicantAppliedAt(taskId: number | undefined, address: string | undefined) {
  const { data, refetch } = useReadContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "taskApplicantAppliedAt",
    args: taskId !== undefined && address ? [BigInt(taskId), address as `0x${string}`] : undefined,
    query: { enabled: Boolean(taskId !== undefined && address && TASKIFY_ADDRESS) },
  });
  const appliedAt = data ? Number(data as bigint) : 0;
  return { applied: appliedAt > 0, appliedAt, refetch };
}

// Reads taskApplicantAppliedAt for a batch of addresses (e.g. every
// applicant listed off-chain in Supabase) so the UI can tell which of them
// genuinely applied/joined on-chain vs. just left a comment.
export function useTaskApplicants(taskId: number | undefined, addresses: string[]) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["taskify", "applicants", TASKIFY_ADDRESS, taskId, addresses.join(",")],
    enabled: Boolean(publicClient && TASKIFY_ADDRESS && taskId !== undefined && addresses.length > 0),
    queryFn: async () => {
      const contractAddress = TASKIFY_ADDRESS;
      if (!publicClient || !contractAddress || taskId === undefined) return {} as Record<string, number>;
      const results = await Promise.all(
        addresses.map((addr) =>
          publicClient.readContract({
            address: contractAddress,
            abi: TASKIFY_ABI,
            functionName: "taskApplicantAppliedAt",
            args: [BigInt(taskId), addr as `0x${string}`],
          })
        )
      );
      const map: Record<string, number> = {};
      addresses.forEach((addr, i) => {
        map[addr.toLowerCase()] = Number(results[i] as bigint);
      });
      return map;
    },
  });
}

// Which of a set of task ids a given address has applied to / joined —
// used by the contributor dashboard to show "my applications" without a
// dedicated on-chain enumeration (contract has none; see useAllTasks).
export function useAppliedTaskIds(taskIds: number[], address: string | undefined) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["taskify", "appliedTaskIds", TASKIFY_ADDRESS, taskIds.join(","), address],
    enabled: Boolean(publicClient && TASKIFY_ADDRESS && address && taskIds.length > 0),
    queryFn: async () => {
      const contractAddress = TASKIFY_ADDRESS;
      if (!publicClient || !contractAddress || !address) return [] as number[];
      const results = await Promise.all(
        taskIds.map((id) =>
          publicClient.readContract({
            address: contractAddress,
            abi: TASKIFY_ABI,
            functionName: "taskApplicantAppliedAt",
            args: [BigInt(id), address as `0x${string}`],
          })
        )
      );
      return taskIds.filter((_, i) => (results[i] as bigint) > BigInt(0));
    },
  });
}

export function useWaveCreatorTasks(waveId: number | undefined, address: string | undefined) {
  const { data, refetch } = useReadContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "waveCreatorTasks",
    args: waveId !== undefined && address ? [BigInt(waveId), address as `0x${string}`] : undefined,
    query: { enabled: Boolean(waveId !== undefined && address && TASKIFY_ADDRESS) },
  });
  return { count: data ? Number(data as bigint) : 0, refetch };
}

export function useWaveClaimed(waveId: number | undefined, address: string | undefined) {
  const { data, refetch } = useReadContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "waveClaims",
    args: waveId !== undefined && address ? [BigInt(waveId), address as `0x${string}`] : undefined,
    query: { enabled: Boolean(waveId !== undefined && address && TASKIFY_ADDRESS) },
  });
  return { claimed: Boolean(data), refetch };
}

export function useCurrentWave() {
  const { data, isLoading, refetch } = useReadContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "getCurrentWave",
    query: { enabled: Boolean(TASKIFY_ADDRESS) },
  });

  const t = data as readonly [bigint, bigint, bigint, bigint] | undefined;
  const wave = t
    ? { waveId: Number(t[0]), startTime: Number(t[1]), poolAmount: t[2], totalTasks: Number(t[3]) }
    : { waveId: 0, startTime: 0, poolAmount: BigInt(0), totalTasks: 0 };

  return { wave, isLoading, refetch };
}
