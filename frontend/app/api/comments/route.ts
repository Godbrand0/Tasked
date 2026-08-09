import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_comments")
    .select("id, task_id, author_address, body, reply_to, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comments: data });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const replyTo = body?.replyTo ?? null;

  if (!taskId || !address || !text) {
    return NextResponse.json({ error: "taskId, address, and body are required" }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Comment is too long (max 2000 chars)" }, { status: 400 });
  }

  // task_comments.author_address has a foreign key into profiles(address) —
  // make sure a row exists before inserting the comment. No-op if it does.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ address }, { onConflict: "address", ignoreDuplicates: true });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_comments")
    .insert({ task_id: taskId, author_address: address, body: text, reply_to: replyTo })
    .select("id, task_id, author_address, body, reply_to, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comment: data }, { status: 201 });
}
