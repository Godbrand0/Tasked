import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCaller } from "@/lib/verify-caller";
import { getTaskInfo } from "@/lib/task-onchain";
import { isAdmin } from "@/lib/moderation";
import { notify } from "@/lib/notifications";

// Admin moderation queue and actions, for the wallets in lib/moderation.ts's
// ADMIN_WALLETS. The caller proves wallet ownership with their Privy token
// (requireCaller), then the wallet must be an admin.
//
//   GET  /api/admin/moderation?address=0x…   -> tasks, reports, standings, keywords
//   POST /api/admin/moderation { address, action, ... }
//     approve        { taskId }                  put a held or hidden task (back) on Taskify
//     hide           { taskId, note? }           remove a task from Taskify
//     resolve_report { reportId, status }        status: "resolved" | "dismissed" | "open"
//     set_standing   { target, status, note? }   status: "warned" | "blocked" | null (clear)
//     add_keyword    { term }
//     remove_keyword { term }

async function guard(req: NextRequest, address: unknown): Promise<NextResponse | null> {
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const addr = typeof address === "string" ? address : null;
  const denied = await requireCaller(req, addr);
  if (denied) return denied;
  if (!isAdmin(addr)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  return null;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const denied = await guard(req, address);
  if (denied) return denied;
  const db = supabaseAdmin!;

  const [tasks, reports, standings, keywords] = await Promise.all([
    db.from("task_moderation").select("*").order("updated_at", { ascending: false }).limit(300),
    db.from("moderation_reports").select("*").order("created_at", { ascending: false }).limit(300),
    db.from("creator_standing").select("*").order("updated_at", { ascending: false }),
    db.from("moderation_keywords").select("term").order("term"),
  ]);
  const failed = [tasks, reports, standings, keywords].find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  return NextResponse.json({
    tasks: tasks.data,
    reports: reports.data,
    standings: standings.data,
    keywords: (keywords.data ?? []).map((k) => k.term),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const denied = await guard(req, body?.address);
  if (denied) return denied;
  const db = supabaseAdmin!;
  const admin = String(body.address).toLowerCase();
  const now = new Date().toISOString();
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  switch (body?.action) {
    case "approve":
    case "hide": {
      const taskId = Number(body.taskId);
      if (!Number.isInteger(taskId) || taskId < 1) return NextResponse.json({ error: "taskId is required" }, { status: 400 });
      const { data: existing } = await db.from("task_moderation").select("status, flagged_terms").eq("task_id", taskId).maybeSingle();
      const approve = body.action === "approve";
      const { error } = await db.from("task_moderation").upsert({
        task_id: taskId,
        status: approve ? "approved" : "hidden",
        // Approving accepts the terms the admin saw, so re-saving the same text doesn't re-flag it.
        ...(approve ? { approved_terms: existing?.flagged_terms ?? [] } : {}),
        note: approve ? null : note,
        reviewed_by: admin,
        reviewed_at: now,
        updated_at: now,
      }, { onConflict: "task_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Tell the creator, but only when something changed for them.
      const wasVisible = !existing || existing.status === "approved";
      if (approve ? !wasVisible : existing?.status !== "hidden") {
        const info = await getTaskInfo(taskId);
        if (info) await notify(info.creator, approve ? "task_approved" : "task_removed", taskId, { taskTitle: info.title, actorAddress: admin });
      }
      return NextResponse.json({ ok: true });
    }

    case "resolve_report": {
      const status = body.status;
      if (typeof body.reportId !== "string" || !["resolved", "dismissed", "open"].includes(status)) {
        return NextResponse.json({ error: "reportId and status are required" }, { status: 400 });
      }
      const { error } = await db.from("moderation_reports").update({
        status,
        resolved_by: status === "open" ? null : admin,
        resolved_at: status === "open" ? null : now,
      }).eq("id", body.reportId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "set_standing": {
      const target = typeof body.target === "string" ? body.target.toLowerCase() : "";
      if (!/^0x[0-9a-f]{40}$/.test(target)) return NextResponse.json({ error: "A valid wallet address is required" }, { status: 400 });
      if (body.status === null) {
        const { error } = await db.from("creator_standing").delete().eq("address", target);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }
      if (!["warned", "blocked"].includes(body.status)) return NextResponse.json({ error: "status must be warned, blocked or null" }, { status: 400 });
      const { error } = await db.from("creator_standing").upsert(
        { address: target, status: body.status, note, updated_by: admin, updated_at: now },
        { onConflict: "address" },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "add_keyword":
    case "remove_keyword": {
      const term = typeof body.term === "string" ? body.term.trim().toLowerCase().replace(/\s+/g, " ") : "";
      if (!term || term.length > 60) return NextResponse.json({ error: "Enter a word or phrase (up to 60 characters)" }, { status: 400 });
      const { error } = body.action === "add_keyword"
        ? await db.from("moderation_keywords").upsert({ term }, { onConflict: "term", ignoreDuplicates: true })
        : await db.from("moderation_keywords").delete().eq("term", term);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
