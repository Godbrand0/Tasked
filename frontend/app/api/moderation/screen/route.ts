import { NextRequest, NextResponse } from "next/server";
import { screenTask } from "@/lib/moderation";

// Screens a task's on-chain title (plus any saved description and tags)
// against the flagged keywords. The create page calls this after posting a
// task that has no description; tasks with a description are screened by
// /api/task-content when it's saved. No login needed: it only reads data
// from the chain and our own database.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = Number(body?.taskId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }
  return NextResponse.json({ moderation: await screenTask(id) });
}
