import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Notification feed — see supabase/schema.sql: notifications. Rows are meant
// to be created by the event indexer (scripts/indexer.ts) when a relevant
// on-chain event fires for an address, cross-referenced against
// profiles.notification_prefs. No indexer runs yet (no contract deployed —
// see README.md > Contract Addresses), so this feed is real but will be
// empty for every address until one does. Reads go through this route
// rather than the browser client directly for the same reason as every
// other write path in this app: the "own notifications only" RLS policy
// needs a real Sign-In-With-Ethereum JWT, which doesn't exist yet.

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address) {
    return NextResponse.json({ error: "address query param is required" }, { status: 400 });
  }
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

  let query = supabaseAdmin
    .from("notifications")
    .select("id, type, task_id, read, created_at")
    .eq("recipient_address", address)
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) query = query.eq("read", false);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ notifications: data });
}

// Marks one notification (body.id) or all of an address's notifications
// (body.address, no id) as read.
export async function PATCH(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  const id = typeof body?.id === "string" ? body.id : null;

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  let query = supabaseAdmin.from("notifications").update({ read: true }).eq("recipient_address", address);
  if (id) query = query.eq("id", id);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
