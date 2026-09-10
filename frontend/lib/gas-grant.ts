import "server-only";
import crypto from "crypto";

// A short-lived, HMAC-signed token proving "this browser just completed
// Google OAuth as `sub`". The OAuth callback mints one and hands it to the
// client in the redirect; /api/gas-drip verifies it and dedupes drips on
// `sub` (Google's stable per-user id — never the email, which can be
// reassigned). Stateless, no cookie, no new dependency.
//
// Only active when GAS_DRIP_SECRET is set — otherwise gas sponsorship is
// off and the callback skips minting the grant entirely.

const SECRET = process.env.GAS_DRIP_SECRET;
const TTL_SECONDS = 1800; // 30 minutes — enough to pick a role and finish registering

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payloadB64: string): string {
  return b64url(crypto.createHmac("sha256", SECRET as string).update(payloadB64).digest());
}

/** Returns a grant token, or null when gas sponsorship is disabled. */
export function mintGasGrant(sub: string): string | null {
  if (!SECRET || !sub) return null;
  const payload = b64url(Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })));
  return `${payload}.${sign(payload)}`;
}

/** Verifies a grant token; returns the Google `sub` or null. */
export function verifyGasGrant(token: string | null | undefined): string | null {
  if (!SECRET || !token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  // constant-time compare
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64").toString());
    if (typeof sub !== "string" || typeof exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) > exp) return null;
    return sub;
  } catch {
    return null;
  }
}
