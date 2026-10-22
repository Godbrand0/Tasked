import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { readVerifyToken, verifySecret } from "@/lib/email-verify";
import { sendVerificationEmail } from "@/lib/verify-email-send";

// GET  ?token=…  — the link in the confirmation email; marks the profile's email verified.
// POST {address} — resend the confirmation (rate-limited per inbox in lib/verify-email-send.ts).

function back(req: NextRequest, result: "verified" | "invalid") {
  const url = req.nextUrl.clone();
  url.pathname = "/settings";
  url.search = `?email=${result}`;
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const secret = verifySecret();
  const token = req.nextUrl.searchParams.get("token");
  if (!supabaseAdmin || !secret || !token) return back(req, "invalid");

  const claim = readVerifyToken(secret, token);
  if (!claim) return back(req, "invalid");

  // The link only counts for the address it was sent to: if the email has been
  // changed since, an old link must not verify the new one.
  const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("address", claim.address).maybeSingle();
  if (!profile?.email || profile.email.trim().toLowerCase() !== claim.email) return back(req, "invalid");

  const { error } = await supabaseAdmin.from("profiles").update({ email_verified: true }).eq("address", claim.address);
  return back(req, error ? "invalid" : "verified");
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  if (!address) return NextResponse.json({ error: "address is required" }, { status: 400 });

  const { data: profile } = await supabaseAdmin.from("profiles").select("email, email_verified").eq("address", address).maybeSingle();
  if (!profile?.email) return NextResponse.json({ error: "Add an email address first." }, { status: 400 });
  if (profile.email_verified) return NextResponse.json({ status: "already_verified" });

  const result = await sendVerificationEmail(address, profile.email);
  if (result === "cooldown") return NextResponse.json({ status: "cooldown", error: "A confirmation email was sent recently. Check your inbox (and spam), or try again in an hour." }, { status: 429 });
  if (result === "unavailable") return NextResponse.json({ status: "unavailable", error: "Email confirmation isn't available right now." }, { status: 503 });
  return NextResponse.json({ status: "sent" });
}
