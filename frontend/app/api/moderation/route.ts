import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NOT_VISIBLE } from "@/lib/moderation";

// Public, read-only moderation state (see lib/moderation.ts).
//   GET /api/moderation              -> { hidden: number[] }  task ids Taskify doesn't list
//   GET /api/moderation?taskId=7     -> { status: "live" | "pending_review" | "approved" | "hidden" }
//   GET /api/moderation?address=0x…  -> { standing: "warned" | "blocked" | null }
// Flagged terms, notes and reports stay private to admins.

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ hidden: [], status: "live", standing: null });
  }
  const taskId = req.nextUrl.searchParams.get("taskId");
  const address = req.nextUrl.searchParams.get("address");

  if (taskId) {
    const id = Number(taskId);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
    const { data } = await supabaseAdmin.from("task_moderation").select("status").eq("task_id", id).maybeSingle();
    return NextResponse.json({ status: data?.status ?? "live" });
  }

  if (address) {
    const { data } = await supabaseAdmin.from("creator_standing").select("status").eq("address", address.toLowerCase()).maybeSingle();
    return NextResponse.json({ standing: data?.status ?? null });
  }

  const { data, error } = await supabaseAdmin.from("task_moderation").select("task_id").in("status", NOT_VISIBLE as string[]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hidden: (data ?? []).map((r) => Number(r.task_id)) });
}
