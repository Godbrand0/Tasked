import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Rich task content the contract deliberately doesn't store — Taskify.sol's
// Task struct only has `title`. See supabase/schema.sql: task_content.
// Written once, right after the on-chain createTask/createCommunityTask
// transaction confirms (the real taskId comes from the TaskCreated event —
// see lib/use-taskify.ts's extractTaskId).

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
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [];
  const githubRepoUrl = typeof body?.githubRepoUrl === "string" ? body.githubRepoUrl : null;
  const grantJustification = typeof body?.grantJustification === "string" ? body.grantJustification : null;
  const images = Array.isArray(body?.images) ? body.images.filter((i: unknown) => typeof i === "string") : [];

  if (!taskId || !description) {
    return NextResponse.json({ error: "taskId and description are required" }, { status: 400 });
  }
  if (description.length > 10000) {
    return NextResponse.json({ error: "Description is too long (max 10000 chars)" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_content")
    .upsert(
      { task_id: taskId, description, tags, github_repo_url: githubRepoUrl, grant_justification: grantJustification, images, updated_at: new Date().toISOString() },
      { onConflict: "task_id" }
    )
    .select("task_id, description, tags, github_repo_url, grant_justification, images")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ content: data }, { status: 201 });
}
