import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCaller } from "@/lib/verify-caller";
import { getTaskCreator } from "@/lib/task-onchain";

// Development-task work submissions — see supabase/schema.sql:
// task_submissions. Written once, right after the on-chain submitTask()
// transaction confirms.

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_submissions")
    .select("task_id, assignee_address, pr_url, issue_url, payout_tx_hash, submitted_at")
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ submission: data });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  const prUrl = typeof body?.prUrl === "string" ? body.prUrl.trim() : "";
  const issueUrl = typeof body?.issueUrl === "string" ? body.issueUrl.trim() : null;

  if (!taskId || !address || !prUrl) {
    return NextResponse.json({ error: "taskId, address, and prUrl are required" }, { status: 400 });
  }
  const denied = await requireCaller(req, address);
  if (denied) return denied;

  // task_submissions.assignee_address has a foreign key into profiles(address).
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ address }, { onConflict: "address", ignoreDuplicates: true });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_submissions")
    .upsert(
      { task_id: taskId, assignee_address: address, pr_url: prUrl, issue_url: issueUrl || null, submitted_at: new Date().toISOString() },
      { onConflict: "task_id" }
    )
    .select("task_id, assignee_address, pr_url, issue_url, payout_tx_hash, submitted_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ submission: data }, { status: 201 });
}

// Records the approveAndRelease() tx hash once the creator approves —
// called by the creator's browser, not the assignee, so this only ever
// updates the existing row (it never creates one; if submitTask's own
// save never happened there's nothing to attach the hash to).
export async function PATCH(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const payoutTxHash = typeof body?.payoutTxHash === "string" ? body.payoutTxHash : null;

  if (!taskId || !payoutTxHash) {
    return NextResponse.json({ error: "taskId and payoutTxHash are required" }, { status: 400 });
  }
  // Only the task's on-chain creator may do this.
  const creator = await getTaskCreator(taskId);
  if (!creator) {
    return NextResponse.json({ error: "Couldn't find this task on-chain yet. Try again in a moment." }, { status: 409 });
  }
  const deniedCreator = await requireCaller(req, creator);
  if (deniedCreator) return deniedCreator;

  const { data, error } = await supabaseAdmin
    .from("task_submissions")
    .update({ payout_tx_hash: payoutTxHash })
    .eq("task_id", taskId)
    .select("task_id, assignee_address, pr_url, issue_url, payout_tx_hash, submitted_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ submission: data });
}
