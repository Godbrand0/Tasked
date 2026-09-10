import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications";

// Threaded feedback on a single community-task submission. The task owner
// asks a participant for changes; that participant can reply. Mirrors the
// shape of app/api/comments — off-chain only, see
// supabase/schema.sql: submission_feedback.

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
  }
  const participant = req.nextUrl.searchParams.get("participant")?.toLowerCase();

  let query = supabaseAdmin
    .from("submission_feedback")
    .select("id, task_id, participant_address, author_address, body, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (participant) query = query.eq("participant_address", participant);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ feedback: data });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const participantAddress = typeof body?.participantAddress === "string" ? body.participantAddress.toLowerCase() : null;
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  const creatorAddress = typeof body?.creatorAddress === "string" ? body.creatorAddress.toLowerCase() : null;
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const taskTitle = typeof body?.taskTitle === "string" ? body.taskTitle : undefined;

  if (!taskId || !participantAddress || !address || !creatorAddress || !text) {
    return NextResponse.json(
      { error: "taskId, participantAddress, address, creatorAddress, and body are required" },
      { status: 400 }
    );
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Feedback is too long (max 2000 chars)" }, { status: 400 });
  }
  // Only the task owner or the participant whose submission this is can post
  // to the thread. No SIWE yet, so this trusts the client-supplied address
  // like every other route — but at least keeps unrelated wallets out.
  if (address !== creatorAddress && address !== participantAddress) {
    return NextResponse.json({ error: "Only the task owner or the participant can post here" }, { status: 403 });
  }

  // author_address / participant_address FK into profiles(address).
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert([{ address }, { address: participantAddress }], { onConflict: "address", ignoreDuplicates: true });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("submission_feedback")
    .insert({ task_id: taskId, participant_address: participantAddress, author_address: address, body: text })
    .select("id, task_id, participant_address, author_address, body, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify the other party: owner posts -> participant is told; participant
  // replies -> owner is told.
  const recipient = address === creatorAddress ? participantAddress : creatorAddress;
  if (recipient !== address) {
    await notify(recipient, "submission_feedback", taskId, { taskTitle, actorAddress: address });
  }

  return NextResponse.json({ feedback: data }, { status: 201 });
}
