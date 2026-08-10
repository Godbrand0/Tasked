import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications";

// Development-task applications. applyForTask() on-chain only records
// (taskId, applicant, timestamp) — the motivation text has nowhere on-chain
// to live, so it's stored here (see supabase/schema.sql: task_applications).

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_applications")
    .select("id, task_id, applicant_address, motivation, applied_at, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ applications: data });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  const motivation = typeof body?.motivation === "string" ? body.motivation.trim() : "";
  const creatorAddress = typeof body?.creatorAddress === "string" ? body.creatorAddress.toLowerCase() : null;
  const taskTitle = typeof body?.taskTitle === "string" ? body.taskTitle : undefined;

  if (!taskId || !address || !motivation) {
    return NextResponse.json({ error: "taskId, address, and motivation are required" }, { status: 400 });
  }
  if (motivation.length > 2000) {
    return NextResponse.json({ error: "Motivation is too long (max 2000 chars)" }, { status: 400 });
  }

  // task_applications.applicant_address has a foreign key into profiles(address).
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ address }, { onConflict: "address", ignoreDuplicates: true });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_applications")
    .insert({ task_id: taskId, applicant_address: address, motivation })
    .select("id, task_id, applicant_address, motivation, applied_at, created_at")
    .single();

  if (error) {
    // unique(task_id, applicant_address) — already applied
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.code === "23505" ? "You've already applied to this task." : error.message }, { status });
  }

  if (creatorAddress && creatorAddress !== address) {
    await notify(creatorAddress, "task_applied", taskId, { taskTitle, actorAddress: address });
  }

  return NextResponse.json({ application: data }, { status: 201 });
}
