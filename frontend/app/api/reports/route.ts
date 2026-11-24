import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCaller } from "@/lib/verify-caller";
import { getTaskInfo, hasTakenPart } from "@/lib/task-onchain";
import { notifyAdmins } from "@/lib/moderation";
import { TASK_REASONS, CREATOR_REASONS } from "@/lib/moderation-reasons";

// Report a task, or its creator for not paying. Reports don't hide anything;
// they alert the admins, who decide from /admin.
//
// POST { taskId, address, kind: "task" | "creator", reason, details? }

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const taskId = Number(body?.taskId);
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : "";
  const kind = body?.kind === "creator" ? "creator" : body?.kind === "task" ? "task" : null;
  const reason = typeof body?.reason === "string" ? body.reason : "";
  const details = typeof body?.details === "string" ? body.details.trim().slice(0, 1000) : "";

  if (!Number.isInteger(taskId) || taskId < 1 || !kind) {
    return NextResponse.json({ error: "taskId and kind are required" }, { status: 400 });
  }
  const reasons: readonly string[] = Object.keys(kind === "task" ? TASK_REASONS : CREATOR_REASONS);
  if (!reasons.includes(reason)) {
    return NextResponse.json({ error: "Pick a reason for the report" }, { status: 400 });
  }
  if (reason === "other" && !details) {
    return NextResponse.json({ error: "Tell us what's wrong" }, { status: 400 });
  }

  const denied = await requireCaller(req, address);
  if (denied) return denied;

  const info = await getTaskInfo(taskId);
  if (!info) {
    return NextResponse.json({ error: "Couldn't find this task. Try again in a moment." }, { status: 409 });
  }
  if (info.creator === address) {
    return NextResponse.json({ error: "You can't report your own task." }, { status: 400 });
  }
  // Only people who applied to or joined the task can say they weren't paid.
  if (kind === "creator" && !(await hasTakenPart(taskId, address))) {
    return NextResponse.json({ error: "Only people who applied to or joined this task can report its creator." }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from("moderation_reports").insert({
    kind,
    task_id: taskId,
    target_address: info.creator,
    reporter_address: address,
    reason,
    details: details || null,
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You've already reported this. We're looking into it." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await notifyAdmins(kind === "task" ? "task_reported" : "creator_reported", taskId, {
    taskTitle: info.title,
    actorAddress: address,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
