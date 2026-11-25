import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCaller } from "@/lib/verify-caller";
import { getCommunityJoin, getTaskCreator } from "@/lib/task-onchain";
import { notify } from "@/lib/notifications";

// Community-task join + proof-of-participation link. Mirrors
// joinCommunityTask() on-chain; see supabase/schema.sql: community_submissions.
//
// community_submissions.participant_address has a foreign key into
// users_onchain(address) — the table an indexer would populate from
// Taskify.sol's UserRegistered events. No contract is deployed yet, so
// there's nothing for an indexer to sync. ensureUserOnchainRow() writes a
// minimal placeholder row instead, purely to satisfy that FK, clearly
// marked as such. When the real indexer exists it should overwrite these
// with actual on-chain data (role, experience, verification, etc.) keyed
// on the same address, not treat them as pre-existing real accounts.
async function ensureUserOnchainRow(address: string) {
  if (!supabaseAdmin) return null;
  const now = new Date().toISOString();
  return supabaseAdmin.from("users_onchain").upsert(
    {
      address,
      username: address,
      role: "contributor",
      registered_at: now,
      last_experience_update: now,
      last_synced_block: 0,
    },
    { onConflict: "address", ignoreDuplicates: true }
  );
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const taskId = req.nextUrl.searchParams.get("taskId");
  const address = req.nextUrl.searchParams.get("address");
  if (!taskId && !address) {
    return NextResponse.json({ error: "taskId or address query param is required" }, { status: 400 });
  }

  // task.assignee is never set for community tasks (winners are paid
  // directly, not assigned) — so a person's won community tasks can only
  // be found here, keyed by participant address, not by walking on-chain
  // task data. Used by the profile/contributor pages to fill in completed
  // community tasks that on-chain assignee-based filtering would miss.
  let query = supabaseAdmin
    .from("community_submissions")
    .select("task_id, participant_address, proof_url, joined_at, is_winner, payout_tx_hash")
    .order("joined_at", { ascending: true });
  query = taskId ? query.eq("task_id", taskId) : query.eq("participant_address", address!.toLowerCase()).eq("is_winner", true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ submissions: data });
}

// Records a community-task join. The join itself happens on-chain
// (joinCommunityTask), so this copies it from the contract instead of
// trusting the request: the participant, proof link and join time all come
// from Taskify.sol. Only the wallet can join on-chain, so no login check is
// needed, and anyone may trigger the copy (useful to backfill a join whose
// save failed). Idempotent: an existing row is returned as-is.
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  const taskTitle = typeof body?.taskTitle === "string" ? body.taskTitle : undefined;

  if (!taskId || !address) {
    return NextResponse.json({ error: "taskId and address are required" }, { status: 400 });
  }

  const join = await getCommunityJoin(taskId, address);
  if (!join) {
    return NextResponse.json({ error: "We couldn't find your join on-chain yet. Refresh in a moment." }, { status: 409 });
  }
  const proofUrl = join.proofUrl.slice(0, 500);

  const select = "task_id, participant_address, proof_url, joined_at, is_winner";
  const { data: existing } = await supabaseAdmin
    .from("community_submissions")
    .select(select)
    .eq("task_id", taskId)
    .eq("participant_address", address)
    .maybeSingle();
  if (existing) return NextResponse.json({ submission: existing });

  const { error: userError } = await ensureUserOnchainRow(address) ?? {};
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("community_submissions")
    .upsert(
      { task_id: taskId, participant_address: address, proof_url: proofUrl, joined_at: new Date(join.joinedAt * 1000).toISOString() },
      { onConflict: "task_id,participant_address", ignoreDuplicates: true },
    )
    .select(select)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    // Lost a race with a parallel save of the same join; return that row.
    const { data: row } = await supabaseAdmin.from("community_submissions").select(select).eq("task_id", taskId).eq("participant_address", address).maybeSingle();
    return NextResponse.json({ submission: row });
  }

  const creatorAddress = await getTaskCreator(taskId);
  if (creatorAddress && creatorAddress !== address) {
    await notify(creatorAddress, "community_task_joined", taskId, { taskTitle, actorAddress: address });
  }

  return NextResponse.json({ submission: data }, { status: 201 });
}

// Marks the given addresses as winners for a task (creator selecting up to
// maxWinners after reviewing submissions — mirrors selectWinners() on-chain).
export async function PATCH(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const winners: unknown = body?.winners;
  const txHash = typeof body?.txHash === "string" ? body.txHash : null;

  if (!taskId || !Array.isArray(winners) || winners.length === 0 || !winners.every(w => typeof w === "string")) {
    return NextResponse.json({ error: "taskId and a non-empty winners array of addresses are required" }, { status: 400 });
  }
  // Only the task's on-chain creator may do this.
  const creator = await getTaskCreator(taskId);
  if (!creator) {
    return NextResponse.json({ error: "Couldn't find this task on-chain yet. Try again in a moment." }, { status: 409 });
  }
  const deniedCreator = await requireCaller(req, creator);
  if (deniedCreator) return deniedCreator;

  const lowered = winners.map(w => w.toLowerCase());

  const { data, error } = await supabaseAdmin
    .from("community_submissions")
    .update({ is_winner: true, payout_tx_hash: txHash })
    .eq("task_id", taskId)
    .in("participant_address", lowered)
    .select("task_id, participant_address, proof_url, joined_at, is_winner, payout_tx_hash");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ submissions: data });
}
