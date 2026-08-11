import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
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

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  const proofUrl = typeof body?.proofUrl === "string" ? body.proofUrl.trim() : "";
  const creatorAddress = typeof body?.creatorAddress === "string" ? body.creatorAddress.toLowerCase() : null;
  const taskTitle = typeof body?.taskTitle === "string" ? body.taskTitle : undefined;

  if (!taskId || !address || !proofUrl) {
    return NextResponse.json({ error: "taskId, address, and proofUrl are required" }, { status: 400 });
  }
  if (proofUrl.length > 500) {
    return NextResponse.json({ error: "Proof URL is too long" }, { status: 400 });
  }

  const { error: userError } = await ensureUserOnchainRow(address) ?? {};
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("community_submissions")
    .insert({ task_id: taskId, participant_address: address, proof_url: proofUrl, joined_at: new Date().toISOString() })
    .select("task_id, participant_address, proof_url, joined_at, is_winner")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.code === "23505" ? "You've already joined this task." : error.message }, { status });
  }

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
