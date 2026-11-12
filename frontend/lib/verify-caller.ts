import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { privyServer } from "@/lib/privy-server";

// Server-side proof of who is calling an API route.
//
// Routes write with supabaseAdmin (service_role, bypasses RLS), so they must
// never trust an address taken from the request body. Instead the client sends
// its Privy access token (lib/authed-fetch.ts) and we accept an address only if
// it is one of the wallets linked to that verified Privy user. Same check as
// app/api/identity/me.
//
// Fails closed: if Privy isn't configured, or the token is missing, invalid or
// expired, the caller owns no wallets.

/** Lowercased wallet addresses linked to the caller's verified Privy session, or null if unauthenticated. */
export async function getCallerWallets(req: NextRequest): Promise<Set<string> | null> {
  if (!privyServer) return null;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  let userId: string;
  try {
    userId = (await privyServer.utils().auth().verifyAccessToken(token)).user_id;
  } catch {
    return null;
  }

  try {
    const user = await privyServer.users()._get(userId);
    const wallets = new Set<string>();
    for (const a of user.linked_accounts) {
      if (a.type === "wallet" && "address" in a && typeof a.address === "string") {
        wallets.add(a.address.toLowerCase());
      }
    }
    return wallets;
  } catch (err) {
    console.error("[verify-caller] privy user lookup failed:", err);
    return null;
  }
}

/** True when the request comes from a Privy session that owns `address`. */
export async function callerOwns(req: NextRequest, address: string | null | undefined): Promise<boolean> {
  if (!address) return false;
  const wallets = await getCallerWallets(req);
  return wallets?.has(address.toLowerCase()) ?? false;
}

/**
 * Guard for write routes: returns an error response to send back, or null when
 * the caller is proven to own `address`.
 *
 *   const denied = await requireCaller(req, address);
 *   if (denied) return denied;
 */
export async function requireCaller(req: NextRequest, address: string | null | undefined): Promise<NextResponse | null> {
  if (!privyServer) {
    return NextResponse.json({ error: "Sign-in isn't configured on the server." }, { status: 503 });
  }
  const wallets = await getCallerWallets(req);
  if (!wallets) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (!address || !wallets.has(address.toLowerCase())) {
    return NextResponse.json({ error: "That wallet isn't linked to your login." }, { status: 403 });
  }
  return null;
}
