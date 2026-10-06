import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { privyServer } from "@/lib/privy-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/email-normalize";

// "Is this login's Gmail/email already tied to a different wallet?"
//
// Privy dedupes its own logins (same Google account → same embedded wallet),
// but knows nothing about wallets registered through MetaMask/Rabby. Without
// this check someone could sign in with the same Gmail via Privy, get a fresh
// embedded wallet, and register a second account.
//
// Everything is derived server-side from the verified Privy token — the emails
// come from Privy's record of the user, never from the request body — so this
// can't be used to probe which emails have accounts. The only client input is
// the wallet address, and it must be one of the Privy user's own linked wallets.
//
// Dormant (200, checked:false) until PRIVY_APP_SECRET is set.

const mask = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export async function POST(req: NextRequest) {
  if (!privyServer || !supabaseAdmin) {
    return NextResponse.json({ checked: false, conflict: false });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Missing access token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rawAddress = typeof body?.address === "string" ? body.address : "";
  if (!isAddress(rawAddress)) return NextResponse.json({ error: "A valid address is required" }, { status: 400 });
  const address = getAddress(rawAddress).toLowerCase();

  let userId: string;
  try {
    const claims = await privyServer.utils().auth().verifyAccessToken(token);
    userId = claims.user_id;
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  let user;
  try {
    user = await privyServer.users()._get(userId);
  } catch (err) {
    console.error("[identity-check] privy user lookup failed:", err);
    return NextResponse.json({ error: "Couldn't verify your login right now — try again." }, { status: 502 });
  }

  const emails = new Set<string>();
  const ownWallets = new Set<string>();
  for (const acct of user.linked_accounts) {
    if (acct.type === "email") emails.add(normalizeEmail(acct.address));
    if (acct.type === "google_oauth") emails.add(normalizeEmail(acct.email));
    if (acct.type === "wallet" && "address" in acct && acct.address) ownWallets.add(acct.address.toLowerCase());
  }

  if (!ownWallets.has(address)) {
    return NextResponse.json({ error: "That wallet isn't linked to this login." }, { status: 403 });
  }
  if (emails.size === 0) return NextResponse.json({ checked: true, conflict: false }); // wallet-only login

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("address")
    .in("google_email_normalized", [...emails]);
  if (error) {
    console.error("[identity-check] lookup failed:", error);
    return NextResponse.json({ error: "Couldn't check your account right now — try again." }, { status: 500 });
  }

  // A match on one of the user's OWN wallets is fine (e.g. embedded + MetaMask
  // linked to the same Privy user) — only a wallet they don't control conflicts.
  const other = (data ?? []).map((r) => r.address as string).find((a) => !ownWallets.has(a));
  if (other) return NextResponse.json({ checked: true, conflict: true, linkedAddress: mask(other) });
  return NextResponse.json({ checked: true, conflict: false });
}
