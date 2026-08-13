import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Batched display_name + avatar lookup for list pages (Browse Tasks,
// Leaderboard) that show many other users' identities at once — avoids one
// /api/profile request per row. Single-address lookups still use
// /api/profile directly.

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const addressesParam = req.nextUrl.searchParams.get("addresses");
  if (!addressesParam) {
    return NextResponse.json({ error: "addresses query param is required (comma-separated)" }, { status: 400 });
  }
  const addresses = Array.from(new Set(addressesParam.split(",").map(a => a.trim().toLowerCase()).filter(Boolean)));
  if (addresses.length === 0) {
    return NextResponse.json({ profiles: {} });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("address, display_name, custom_avatar_url, google_avatar_url, github_avatar_url, x_avatar_url")
    .in("address", addresses);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profiles: Record<string, { displayName: string | null; avatarUrl: string | null }> = {};
  for (const row of data) {
    profiles[row.address] = {
      displayName: row.display_name || null,
      avatarUrl: row.custom_avatar_url || row.google_avatar_url || row.github_avatar_url || row.x_avatar_url || null,
    };
  }
  return NextResponse.json({ profiles });
}
