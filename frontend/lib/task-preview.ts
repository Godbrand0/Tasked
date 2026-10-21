import "server-only";
import { createPublicClient, fallback, http } from "viem";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MEZO_RPC_URLS } from "@/lib/rpc";
import { MEZO_ADDRESS, MUSD_ADDRESS, STATUS_NAME, TASKIFY_ABI, TASKIFY_ADDRESS } from "@/lib/taskify";
import { formatReward, plainSnippet } from "@/lib/task-preview-text";

// Everything a link card needs to describe a task. Read from the contract and the
// public task_content / profiles rows, so nothing here is client-supplied.

export interface TaskPreview {
  id: number;
  title: string;
  reward: string;        // "400"
  symbol: string;        // "MEZO"
  kind: "Development" | "Community";
  status: string;        // "Open"
  winners: number | null; // community tasks only
  creatorName: string;
  snippet: string;
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  FUNDS_RELEASED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  GRANT_PENDING: "Grant pending",
  GRANT_REJECTED: "Grant rejected",
};

// Output order of Taskify.tasks(), looked up by name so a reordered ABI can't shift fields.
const FIELDS = (TASKIFY_ABI as { name?: string; outputs?: { name: string }[] }[])
  .find((f) => f.name === "tasks")?.outputs?.map((o) => o.name) ?? [];
const ZERO = "0x0000000000000000000000000000000000000000";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** `raw` is the URL segment; anything that isn't a plain positive integer is rejected before touching the chain. */
export async function getTaskPreview(raw: string): Promise<TaskPreview | null> {
  if (!/^\d{1,9}$/.test(raw) || !TASKIFY_ADDRESS) return null;
  const id = Number(raw);
  if (id < 1) return null;

  const client = createPublicClient({ transport: fallback(MEZO_RPC_URLS.map((url) => http(url))) });
  let row: readonly unknown[];
  try {
    row = (await client.readContract({ address: TASKIFY_ADDRESS, abi: TASKIFY_ABI, functionName: "tasks", args: [BigInt(id)] })) as readonly unknown[];
  } catch {
    return null;
  }
  const f = (name: string) => row[FIELDS.indexOf(name)];
  const creator = String(f("creator") ?? "");
  if (!creator || creator.toLowerCase() === ZERO) return null;

  const token = String(f("token")).toLowerCase();
  const symbol = token === MEZO_ADDRESS?.toLowerCase() ? "MEZO" : token === MUSD_ADDRESS?.toLowerCase() ? "MUSD" : "";
  const isCommunity = Number(f("kind")) === 1;

  let snippet = "";
  let creatorName = short(creator);
  if (supabaseAdmin) {
    const [content, profile] = await Promise.all([
      supabaseAdmin.from("task_content").select("description").eq("task_id", id).maybeSingle(),
      supabaseAdmin.from("profiles").select("display_name, google_name").eq("address", creator.toLowerCase()).maybeSingle(),
    ]).catch(() => [null, null] as const);
    snippet = plainSnippet(content?.data?.description);
    creatorName = profile?.data?.display_name || profile?.data?.google_name || creatorName;
  }

  return {
    id,
    title: String(f("title")),
    reward: formatReward(f("amount") as bigint),
    symbol,
    kind: isCommunity ? "Community" : "Development",
    status: STATUS_LABEL[STATUS_NAME[Number(f("status"))] ?? "NONE"] ?? "Open",
    winners: isCommunity ? Number(f("maxWinners")) || null : null,
    creatorName,
    snippet,
  };
}
