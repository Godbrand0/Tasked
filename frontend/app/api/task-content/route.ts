import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/constants";

// Rich task content the contract deliberately doesn't store — Taskify.sol's
// Task struct only has `title`. See supabase/schema.sql: task_content.
// Written once, right after the on-chain createTask/createCommunityTask
// transaction confirms (the real taskId comes from the TaskCreated event —
// see lib/use-taskify.ts's extractTaskId), and again whenever a creator edits
// the description from the task page.
//
// POST is a PATCH, not a replace: it writes only the columns the caller
// actually sent. This matters because callers hold a partial, possibly stale
// view of the row. The description editor in app/tasks/[id] used to resend
// every column from its client-side copy, so a save made while that copy was
// null silently nulled github_repo_url — which is how task 7 lost its GitHub
// issue link. Sending an explicit null still clears a column; omitting the
// key leaves it untouched.

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_content")
    .select("task_id, description, tags, github_repo_url, grant_justification, images")
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ content: data });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!taskId || !description) {
    return NextResponse.json({ error: "taskId and description are required" }, { status: 400 });
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Description is too long (max ${MAX_DESCRIPTION_LENGTH} chars)` },
      { status: 400 }
    );
  }

  const has = (key: string) => body !== null && Object.prototype.hasOwnProperty.call(body, key);

  // description is required, so it is always written. Everything else is
  // written only when the caller actually mentioned it.
  const row: Record<string, unknown> = {
    task_id: taskId,
    description,
    updated_at: new Date().toISOString(),
  };
  if (has("tags")) {
    row.tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [];
  }
  if (has("images")) {
    row.images = Array.isArray(body.images) ? body.images.filter((i: unknown) => typeof i === "string") : [];
  }
  if (has("githubRepoUrl")) {
    row.github_repo_url = typeof body.githubRepoUrl === "string" && body.githubRepoUrl.trim()
      ? body.githubRepoUrl.trim()
      : null;
  }
  if (has("grantJustification")) {
    row.grant_justification = typeof body.grantJustification === "string" && body.grantJustification.trim()
      ? body.grantJustification
      : null;
  }

  const { data, error } = await supabaseAdmin
    .from("task_content")
    .upsert(row, { onConflict: "task_id" })
    .select("task_id, description, tags, github_repo_url, grant_justification, images")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ content: data }, { status: 201 });
}
