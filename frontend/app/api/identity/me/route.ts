import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { privyServer } from "@/lib/privy-server";
import { mintGasGrant } from "@/lib/gas-grant";

// The identity Privy has verified for this login, for /register to use instead
// of a second, unrelated Google sign-in. Without this, someone could log in
// through Privy as Gmail A and then register as Gmail B — the stored identity
// would never be the one Privy verified, so the one-Gmail-per-wallet checks
// would only ever see B.
//
// Everything comes from the verified Privy session; the only client input is
// the wallet address, which must be one of the user's own linked wallets.
//
// Gas drip: a Google login gets a grant token minted from its Google `subject`
// — the same stable id the standalone Google OAuth path uses — so one Google
// account dedupes to one drip however it signed in. Email-only logins get NO
// grant: a throwaway email is free to create, so dripping on it would break
// the farm-resistance the drip is sized around (see GAS_DRIP.md).
//
// Returns { identity: null } for wallet-only logins (MetaMask/Rabby with no
// email linked) — /register then falls back to its own Google step.

export async function POST(req: NextRequest) {
  if (!privyServer) return NextResponse.json({ identity: null, gasGrant: null });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Missing access token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rawAddress = typeof body?.address === "string" ? body.address : "";
  if (!isAddress(rawAddress)) return NextResponse.json({ error: "A valid address is required" }, { status: 400 });
  const address = getAddress(rawAddress).toLowerCase();

  let userId: string;
  try {
    userId = (await privyServer.utils().auth().verifyAccessToken(token)).user_id;
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  let user;
  try {
    user = await privyServer.users()._get(userId);
  } catch (err) {
    console.error("[identity-me] privy user lookup failed:", err);
    return NextResponse.json({ error: "Couldn't verify your login right now — try again." }, { status: 502 });
  }

  const ownsWallet = user.linked_accounts.some(
    (a) => a.type === "wallet" && "address" in a && a.address?.toLowerCase() === address,
  );
  if (!ownsWallet) return NextResponse.json({ error: "That wallet isn't linked to this login." }, { status: 403 });

  const google = user.linked_accounts.find((a) => a.type === "google_oauth");
  if (google && google.type === "google_oauth") {
    return NextResponse.json({
      identity: { email: google.email, name: google.name ?? google.email.split("@")[0], source: "google" },
      gasGrant: mintGasGrant(google.subject),
    });
  }

  const email = user.linked_accounts.find((a) => a.type === "email");
  if (email && email.type === "email") {
    return NextResponse.json({
      identity: { email: email.address, name: email.address.split("@")[0], source: "email" },
      gasGrant: null,
    });
  }

  return NextResponse.json({ identity: null, gasGrant: null });
}
