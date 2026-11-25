import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCaller } from "@/lib/verify-caller";
import { isAdmin } from "@/lib/moderation";

// Off-chain numbers for the admin Analytics tab. Task and money figures come
// from the contract on the client (app/admin/page.tsx); this adds what only
// Supabase knows: sign-ups, applications, community joins, comments, gas drips.
//
//   GET /api/admin/analytics?address=0x…   (admin wallets only)

const DAY = 86400_000;

/** Monday 00:00 UTC of the week containing `t`, as YYYY-MM-DD. */
function weekStart(t: number): string {
  const d = new Date(t);
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ((d.getUTCDay() + 6) % 7) * DAY;
  return new Date(monday).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const address = req.nextUrl.searchParams.get("address");
  const denied = await requireCaller(req, address);
  if (denied) return denied;
  if (!isAdmin(address)) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const db = supabaseAdmin;
  const count = (table: string) => db.from(table).select("*", { count: "exact", head: true });

  const [profiles, applications, joins, comments, drips, openReports] = await Promise.all([
    db.from("profiles").select("created_at"),
    db.from("task_applications").select("applicant_address"),
    db.from("community_submissions").select("participant_address, is_winner"),
    count("task_comments"),
    count("gas_drips"),
    db.from("moderation_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const failed = [profiles, applications, joins, comments, drips].find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  const now = Date.now();
  const signupTimes = (profiles.data ?? []).map((p) => new Date(p.created_at as string).getTime());
  const signupsByWeek: Record<string, number> = {};
  for (const t of signupTimes) signupsByWeek[weekStart(t)] = (signupsByWeek[weekStart(t)] ?? 0) + 1;

  const contributors = new Set<string>();
  for (const a of applications.data ?? []) contributors.add(String(a.applicant_address).toLowerCase());
  for (const j of joins.data ?? []) contributors.add(String(j.participant_address).toLowerCase());

  return NextResponse.json({
    users: signupTimes.length,
    usersLast7d: signupTimes.filter((t) => now - t < 7 * DAY).length,
    usersLast30d: signupTimes.filter((t) => now - t < 30 * DAY).length,
    signupsByWeek,
    applications: applications.data?.length ?? 0,
    communityJoins: joins.data?.length ?? 0,
    communityWinners: (joins.data ?? []).filter((j) => j.is_winner).length,
    contributors: contributors.size,
    comments: comments.count ?? 0,
    gasDrips: drips.count ?? 0,
    // Null until migration 0020 has run.
    openReports: openReports.error ? null : openReports.count ?? 0,
  });
}
