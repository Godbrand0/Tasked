import "server-only";
import { createPublicClient, fallback, formatUnits, http, parseAbi } from "viem";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MEZO_RPC_URLS } from "@/lib/rpc";
import { MEZO_ADDRESS, MUSD_ADDRESS, STATUS_NAME, TASKIFY_ABI, TASKIFY_ADDRESS } from "@/lib/taskify";
import { MUSD_DECIMALS } from "@/lib/constants";
import { plainSnippet } from "@/lib/task-preview-text";

// Public, read-only task feed for third-party integrations (e.g. the Mezo
// Discord bot's quest board). Everything here is already public: on-chain task
// data, the task description, and display names. Every field is listed
// explicitly. Never add private profile columns (email etc.) to this feed.

export interface PublicTask {
  id: number;
  title: string;
  kind: "development" | "community";
  status: string;          // OPEN, ASSIGNED, IN_PROGRESS, SUBMITTED, FUNDS_RELEASED, CANCELLED, EXPIRED, GRANT_PENDING, GRANT_REJECTED
  reward: string;          // full escrowed reward, e.g. "50" or "12.5"
  token: "MUSD" | "MEZO" | null;
  winners: number | null;  // community tasks: how many people get paid
  deadline: number | null; // unix seconds, null when not set yet
  createdAt: number;       // unix seconds
  creator: string;         // display name, on-chain username, or short address
  snippet: string;         // plain-text start of the description
  url: string;
  // Filled in once status is FUNDS_RELEASED:
  paidTo: string[] | null; // display names (or short addresses) of whoever was paid
  paidEach: string | null; // amount each recipient got, after the protocol fee
  payoutTx: string | null; // explorer link to the payout transaction, when recorded
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" ? "https://www.taskifybounties.com" : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");
const EXPLORER_TX = "https://explorer.mezo.org/tx/";
const ZERO = "0x0000000000000000000000000000000000000000";

// Output order of Taskify.tasks(), looked up by name so a reordered ABI can't shift fields.
const FIELDS = (TASKIFY_ABI as { name?: string; outputs?: { name: string }[] }[])
  .find((f) => f.name === "tasks")?.outputs?.map((o) => o.name) ?? [];
const FEE_ABI = parseAbi([
  "function SELF_FUNDED_FEE_BPS() view returns (uint256)",
  "function GRANT_FUNDED_FEE_BPS() view returns (uint256)",
]);

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const CACHE_MS = 60_000;
let cache: { at: number; tasks: PublicTask[] } | null = null;
let inflight: Promise<PublicTask[]> | null = null;

/** All tasks, newest first. Cached in memory for a minute so polling bots don't hammer the RPC. */
export async function getPublicTasks(): Promise<PublicTask[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.tasks;
  if (!inflight) {
    inflight = buildPublicTasks()
      .then((tasks) => {
        cache = { at: Date.now(), tasks };
        return tasks;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (err) {
    // Serve the last good list rather than failing outright on an RPC blip.
    if (cache) return cache.tasks;
    throw err;
  }
}

async function buildPublicTasks(): Promise<PublicTask[]> {
  if (!TASKIFY_ADDRESS) return [];
  const address = TASKIFY_ADDRESS;
  const client = createPublicClient({
    transport: fallback(MEZO_RPC_URLS.map((url) => http(url, { batch: true }))),
  });

  const [nextTaskId, selfFeeBps, grantFeeBps] = await Promise.all([
    client.readContract({ address, abi: TASKIFY_ABI, functionName: "nextTaskId" }) as Promise<bigint>,
    client.readContract({ address, abi: FEE_ABI, functionName: "SELF_FUNDED_FEE_BPS" }),
    client.readContract({ address, abi: FEE_ABI, functionName: "GRANT_FUNDED_FEE_BPS" }),
  ]);
  const count = Number(nextTaskId) - 1;
  if (count <= 0) return [];

  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const rows = (await Promise.all(
    ids.map((id) => client.readContract({ address, abi: TASKIFY_ABI, functionName: "tasks", args: [BigInt(id)] })),
  )) as readonly unknown[][];

  const raw = rows.map((row, i) => {
    const f = (name: string) => row[FIELDS.indexOf(name)];
    return {
      id: ids[i],
      creator: String(f("creator")).toLowerCase(),
      title: String(f("title")),
      amount: f("amount") as bigint,
      token: String(f("token")).toLowerCase(),
      status: STATUS_NAME[Number(f("status"))] ?? "NONE",
      grantFunded: Number(f("fundingType")) === 1,
      assignee: String(f("assignee")).toLowerCase(),
      deadline: Number(f("deadline")),
      createdAt: Number(f("createdAt")),
      community: Number(f("kind")) === 1,
      maxWinners: Number(f("maxWinners")),
    };
  }).filter((t) => t.creator !== ZERO);

  // Off-chain extras: descriptions, payout records, display names.
  const descriptions = new Map<number, string>();
  const devPayoutTx = new Map<number, string>();
  const winnersByTask = new Map<number, { addresses: string[]; tx: string | null }>();
  if (supabaseAdmin) {
    const paidIds = raw.filter((t) => t.status === "FUNDS_RELEASED").map((t) => t.id);
    const [content, devSubs, winners] = await Promise.all([
      supabaseAdmin.from("task_content").select("task_id, description"),
      paidIds.length
        ? supabaseAdmin.from("task_submissions").select("task_id, payout_tx_hash").in("task_id", paidIds)
        : Promise.resolve({ data: [] as { task_id: number; payout_tx_hash: string | null }[] }),
      paidIds.length
        ? supabaseAdmin.from("community_submissions").select("task_id, participant_address, payout_tx_hash").eq("is_winner", true).in("task_id", paidIds)
        : Promise.resolve({ data: [] as { task_id: number; participant_address: string; payout_tx_hash: string | null }[] }),
    ]);
    for (const c of content.data ?? []) descriptions.set(Number(c.task_id), c.description ?? "");
    for (const s of devSubs.data ?? []) if (s.payout_tx_hash) devPayoutTx.set(Number(s.task_id), s.payout_tx_hash);
    for (const w of winners.data ?? []) {
      const entry = winnersByTask.get(Number(w.task_id)) ?? { addresses: [], tx: null };
      entry.addresses.push(w.participant_address.toLowerCase());
      entry.tx = entry.tx ?? w.payout_tx_hash;
      winnersByTask.set(Number(w.task_id), entry);
    }
  }

  const people = new Set<string>();
  for (const t of raw) {
    people.add(t.creator);
    if (t.status === "FUNDS_RELEASED") {
      if (t.community) winnersByTask.get(t.id)?.addresses.forEach((a) => people.add(a));
      else if (t.assignee !== ZERO) people.add(t.assignee);
    }
  }
  const names = await resolveNames(client, [...people]);
  const nameOf = (a: string) => names.get(a) || short(a);

  return raw
    .map((t): PublicTask => {
      const decimals = MUSD_DECIMALS; // MUSD and MEZO are both 18 decimals
      const net = t.amount - (t.amount * (t.grantFunded ? grantFeeBps : selfFeeBps)) / BigInt(10000);

      let paidTo: string[] | null = null;
      let paidEach: string | null = null;
      let payoutTx: string | null = null;
      if (t.status === "FUNDS_RELEASED") {
        if (t.community) {
          const w = winnersByTask.get(t.id);
          if (w && w.addresses.length > 0) {
            paidTo = w.addresses.map(nameOf);
            paidEach = formatUnits(net / BigInt(w.addresses.length), decimals);
            payoutTx = w.tx;
          }
        } else if (t.assignee !== ZERO) {
          paidTo = [nameOf(t.assignee)];
          paidEach = formatUnits(net, decimals);
          payoutTx = devPayoutTx.get(t.id) ?? null;
        }
      }

      return {
        id: t.id,
        title: t.title,
        kind: t.community ? "community" : "development",
        status: t.status,
        reward: formatUnits(t.amount, decimals),
        token: t.token === MUSD_ADDRESS.toLowerCase() ? "MUSD" : t.token === MEZO_ADDRESS?.toLowerCase() ? "MEZO" : null,
        winners: t.community ? t.maxWinners : null,
        deadline: t.deadline > 0 ? t.deadline : null,
        createdAt: t.createdAt,
        creator: nameOf(t.creator),
        snippet: plainSnippet(descriptions.get(t.id), 200),
        url: `${SITE_URL}/tasks/${t.id}`,
        paidTo,
        paidEach,
        payoutTx: payoutTx && /^0x[0-9a-fA-F]{64}$/.test(payoutTx) ? `${EXPLORER_TX}${payoutTx}` : null,
      };
    })
    .sort((a, b) => b.id - a.id);
}

/** address -> display name, falling back to the on-chain username. */
async function resolveNames(client: ReturnType<typeof createPublicClient>, addresses: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (addresses.length === 0 || !TASKIFY_ADDRESS) return names;
  const address = TASKIFY_ADDRESS;

  const onchain = await Promise.all(
    addresses.map((a) =>
      client
        .readContract({ address, abi: TASKIFY_ABI, functionName: "users", args: [a as `0x${string}`] })
        .then((u) => String((u as readonly unknown[])[0] ?? ""))
        .catch(() => ""),
    ),
  );
  addresses.forEach((a, i) => {
    if (onchain[i]) names.set(a, onchain[i]);
  });

  if (supabaseAdmin) {
    const { data } = await supabaseAdmin.from("profiles").select("address, display_name").in("address", addresses);
    for (const p of data ?? []) if (p.display_name) names.set(p.address, p.display_name);
  }
  return names;
}
