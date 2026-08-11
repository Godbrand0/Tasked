import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Off-chain profile extension (bio, linked-account handles, notification
// prefs) — see supabase/schema.sql: profiles. Registration itself
// (username, role, experience tier, verification flags) is on-chain via
// Taskify.sol's registerUser/setXVerified; this table only ever holds the
// content the contract deliberately doesn't store.

const ALLOWED_FIELDS = ["bio", "github_handle", "github_display_name", "github_avatar_url", "x_handle", "x_display_name", "x_avatar_url", "google_email", "google_name", "google_avatar_url", "email", "notification_prefs"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address) {
    return NextResponse.json({ error: "address query param is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("address", address).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const update: Record<string, unknown> = { address, updated_at: new Date().toISOString() };
  for (const field of ALLOWED_FIELDS) {
    if (field in (body ?? {})) update[field] = body[field];
  }

  if (typeof update.bio === "string" && update.bio.length > 500) {
    return NextResponse.json({ error: "Bio is too long (max 500 chars)" }, { status: 400 });
  }
  if (typeof update.email === "string" && update.email && !EMAIL_RE.test(update.email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (update.email === "") update.email = null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert(update, { onConflict: "address" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
