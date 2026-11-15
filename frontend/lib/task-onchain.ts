import "server-only";
import { createPublicClient, fallback, http } from "viem";
import { MEZO_RPC_URLS } from "@/lib/rpc";
import { TASKIFY_ABI, TASKIFY_ADDRESS } from "@/lib/taskify";

// Reads a task's creator straight from Taskify.sol, so creator-only API routes
// never have to trust a creator address sent by the client.

// Output order of Taskify.tasks(), looked up by name so a reordered ABI can't shift fields.
const FIELDS = (TASKIFY_ABI as { name?: string; outputs?: { name: string }[] }[])
  .find((f) => f.name === "tasks")?.outputs?.map((o) => o.name) ?? [];
const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * Lowercased on-chain creator of `taskId`, or null if the task doesn't exist or the read failed.
 * Retries briefly: callers often ask right after the create tx confirms, and a
 * fallback RPC node can be a block or two behind.
 */
export async function getTaskCreator(taskId: unknown): Promise<string | null> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const creator = await readCreator(taskId);
    if (creator) return creator;
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

async function readCreator(taskId: unknown): Promise<string | null> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1 || !TASKIFY_ADDRESS) return null;

  const client = createPublicClient({ transport: fallback(MEZO_RPC_URLS.map((url) => http(url))) });
  try {
    const row = (await client.readContract({
      address: TASKIFY_ADDRESS,
      abi: TASKIFY_ABI,
      functionName: "tasks",
      args: [BigInt(id)],
    })) as readonly unknown[];
    const creator = String(row[FIELDS.indexOf("creator")] ?? "").toLowerCase();
    return creator && creator !== ZERO ? creator : null;
  } catch {
    return null;
  }
}

/**
 * A community-task join as recorded by Taskify.sol: when `participant` joined
 * `taskId` and the proof link they submitted. Null if they haven't joined (or
 * the read failed). Only the wallet itself can call joinCommunityTask, so a
 * non-null result proves the join without any login check.
 */
export async function getCommunityJoin(
  taskId: unknown,
  participant: string,
): Promise<{ joinedAt: number; proofUrl: string } | null> {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1 || !TASKIFY_ADDRESS || !/^0x[0-9a-fA-F]{40}$/.test(participant)) return null;
  const client = createPublicClient({ transport: fallback(MEZO_RPC_URLS.map((url) => http(url))) });
  // Retry briefly: the client calls this right after its join tx confirms,
  // and a fallback RPC node can be a block or two behind.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [joinedAt, proofUrl] = await Promise.all([
        client.readContract({ address: TASKIFY_ADDRESS, abi: TASKIFY_ABI, functionName: "taskApplicantAppliedAt", args: [BigInt(id), participant as `0x${string}`] }) as Promise<bigint>,
        client.readContract({ address: TASKIFY_ADDRESS, abi: TASKIFY_ABI, functionName: "taskSubmissions", args: [BigInt(id), participant as `0x${string}`] }) as Promise<string>,
      ]);
      if (joinedAt > BigInt(0)) return { joinedAt: Number(joinedAt), proofUrl };
    } catch {
      // fall through to retry
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}
