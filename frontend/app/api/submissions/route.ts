import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
  if (!taskId) {
    return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("community_submissions")
    .select("task_id, participant_address, proof_url, joined_at, is_winner")
    .eq("task_id", taskId)
    .order("joined_at", { ascending: true });

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

  if (!taskId || !Array.isArray(winners) || winners.length === 0 || !winners.every(w => typeof w === "string")) {
    return NextResponse.json({ error: "taskId and a non-empty winners array of addresses are required" }, { status: 400 });
  }

  const lowered = winners.map(w => w.toLowerCase());

  const { data, error } = await supabaseAdmin
    .from("community_submissions")
    .update({ is_winner: true })
    .eq("task_id", taskId)
    .in("participant_address", lowered)
    .select("task_id, participant_address, proof_url, joined_at, is_winner");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ submissions: data });
}
