import { NextRequest, NextResponse } from "next/server";
import { notify, type NotificationType } from "@/lib/notifications";

// Generic notification-creation endpoint for events triggered by a
// confirmed on-chain transaction (assign, submit, approve/release) where
// there's no dedicated API route to hang this off of — the client calls
// this right after the transaction confirms. Low-stakes by design: worst
// case a malicious client fires a spurious notification, same off-chain
// trust model as every other write path in this app pending real auth.
const ALLOWED_TYPES: NotificationType[] = ["task_assigned", "work_submitted", "funds_released", "submission_rejected"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const recipient = typeof body?.recipient === "string" ? body.recipient : null;
  const type = typeof body?.type === "string" ? (body.type as NotificationType) : null;
  const taskId = typeof body?.taskId === "number" ? body.taskId : undefined;
  const taskTitle = typeof body?.taskTitle === "string" ? body.taskTitle : undefined;
  const amount = typeof body?.amount === "string" ? body.amount : undefined;
  const actorAddress = typeof body?.actorAddress === "string" ? body.actorAddress : undefined;

  if (!recipient || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "recipient and a valid type are required" }, { status: 400 });
  }

  await notify(recipient, type, taskId, { taskTitle, amount, actorAddress });
  return NextResponse.json({ ok: true });
}
