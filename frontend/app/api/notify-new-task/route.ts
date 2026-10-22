import { NextRequest, NextResponse, after } from "next/server";
import { createPublicClient, fallback, formatUnits, http } from "viem";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications";
import { MEZO_RPC_URLS } from "@/lib/rpc";
import { MEZO_ADDRESS, MUSD_ADDRESS, TASKIFY_ABI, TASKIFY_ADDRESS } from "@/lib/taskify";
import { decideBroadcast, type ChainTask } from "@/lib/task-broadcast";

// Fired once when a self-funded task confirms on-chain: everyone who opted in to
// that kind of new-task alert (Settings → Notifications) gets an in-app
// notification, and an email if their address is verified.
//
// The caller is an anonymous browser, and this fans out to many people, so it
// believes nothing from the request except the task id. Title, amount, kind and
// creator come from the contract, the task must be open and freshly created, and
// task_broadcasts allows exactly one broadcast per task.

const BATCH_SIZE = 10;

// Output order of Taskify.tasks(), looked up by name so a reordered ABI can't silently shift fields.
const TASK_FIELDS = (TASKIFY_ABI as { name?: string; outputs?: { name: string }[] }[])
  .find((f) => f.name === "tasks")?.outputs?.map((o) => o.name) ?? [];

async function readTask(taskId: bigint): Promise<ChainTask | null> {
  if (!TASKIFY_ADDRESS) return null;
  const client = createPublicClient({ transport: fallback(MEZO_RPC_URLS.map((url) => http(url))) });
  const row = (await client.readContract({
    address: TASKIFY_ADDRESS,
    abi: TASKIFY_ABI,
    functionName: "tasks",
    args: [taskId],
  })) as readonly unknown[];
  const f = (name: string) => row[TASK_FIELDS.indexOf(name)];
  return {
    creator: f("creator") as string,
    title: f("title") as string,
    amount: f("amount") as bigint,
    token: f("token") as string,
    status: Number(f("status")),
    fundingType: Number(f("fundingType")),
    kind: Number(f("kind")),
    createdAt: f("createdAt") as bigint,
  };
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const taskId = typeof body?.taskId === "number" && Number.isInteger(body.taskId) && body.taskId > 0 ? body.taskId : null;
  if (taskId === null) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  let task: ChainTask | null;
  try {
    task = await readTask(BigInt(taskId));
  } catch {
    return NextResponse.json({ error: "Couldn't read the task from the chain" }, { status: 502 });
  }

  const decision = decideBroadcast(task, Date.now());
  if (!decision.ok || !task) return NextResponse.json({ notified: 0, skipped: decision.ok ? "not_found" : decision.reason });

  // Claim the broadcast. A second call for the same task conflicts here and sends nothing.
  const { error: claimError } = await supabaseAdmin.from("task_broadcasts").insert({ task_id: taskId });
  if (claimError) {
    if (claimError.code === "23505") return NextResponse.json({ notified: 0, skipped: "already_sent" });
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  const creator = task.creator.toLowerCase();
  const { data: subscribers, error: subsError } = await supabaseAdmin
    .from("profiles")
    .select("address")
    .eq(`notification_prefs->>${decision.type}`, "true")
    .neq("address", creator);
  if (subsError) {
    // Release the claim so a retry can still announce this task.
    await supabaseAdmin.from("task_broadcasts").delete().eq("task_id", taskId);
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  const recipients = (subscribers ?? []).map((r) => r.address as string);
  const token = task.token.toLowerCase();
  const symbol = token === MEZO_ADDRESS?.toLowerCase() ? "MEZO" : token === MUSD_ADDRESS?.toLowerCase() ? "MUSD" : "";
  const meta = { taskTitle: task.title, amount: `${formatUnits(task.amount, 18)} ${symbol}`.trim(), actorAddress: creator };

  // Send in the background so the creator's page isn't held up by SMTP, and in
  // small batches so a long list doesn't open hundreds of connections at once.
  after(async () => {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      await Promise.all(recipients.slice(i, i + BATCH_SIZE).map((r) => notify(r, decision.type, taskId, meta)));
    }
  });

  return NextResponse.json({ notified: recipients.length });
}
