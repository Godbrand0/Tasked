import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/email-normalize";

// Pre-registration guard: is this Google email free to attach to this wallet?
// Registration sends registerUser on-chain first and writes the profile after,
// so without checking up front a duplicate Gmail would register on-chain and
// only then fail the profile write. Answers a bare boolean (no address), and
// treats the wallet's own existing profile as available.
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ available: true });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const rawAddress = typeof body?.address === "string" ? body.address : "";
  if (!email || !isAddress(rawAddress)) {
    return NextResponse.json({ error: "email and a valid address are required" }, { status: 400 });
  }
  const address = getAddress(rawAddress).toLowerCase();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("address")
    .eq("google_email_normalized", normalizeEmail(email))
    .neq("address", address)
    .limit(1);
  if (error) return NextResponse.json({ error: "Couldn't check right now — try again." }, { status: 500 });

  return NextResponse.json({ available: !data || data.length === 0 });
}
