import crypto from "crypto";

// Signed, expiring link that proves the owner of an inbox asked for notification
// emails. Stateless: the token carries (wallet address, email, expiry) and an
// HMAC, so there is nothing to store or clean up. Binding the email means a link
// sent to an old address can't verify a newer one.
//
// Domain-separated, so a token minted here can never be accepted by (or confused
// with) the gas-drip token that shares GAS_DRIP_SECRET as a fallback.

const DOMAIN = "taskify:email-verify:v1";
export const VERIFY_TTL_SECONDS = 7 * 24 * 60 * 60;

export function verifySecret(): string | undefined {
  return process.env.EMAIL_VERIFY_SECRET || process.env.GAS_DRIP_SECRET || undefined;
}

const b64url = (b: Buffer) => b.toString("base64url");

function sign(secret: string, payloadB64: string): string {
  return b64url(crypto.createHmac("sha256", secret).update(`${DOMAIN}.${payloadB64}`).digest());
}

export function mintVerifyToken(secret: string, address: string, email: string, nowMs = Date.now()): string {
  const payload = { a: address.toLowerCase(), e: email.trim().toLowerCase(), x: Math.floor(nowMs / 1000) + VERIFY_TTL_SECONDS };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  return `${payloadB64}.${sign(secret, payloadB64)}`;
}

export function readVerifyToken(
  secret: string,
  token: string,
  nowMs = Date.now(),
): { address: string; email: string } | null {
  const [payloadB64, sig, ...rest] = token.split(".");
  if (!payloadB64 || !sig || rest.length > 0) return null;

  const expected = sign(secret, payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const p = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as { a?: unknown; e?: unknown; x?: unknown };
    if (typeof p.a !== "string" || typeof p.e !== "string" || typeof p.x !== "number") return null;
    if (p.x * 1000 < nowMs) return null;
    return { address: p.a, email: p.e };
  } catch {
    return null;
  }
}
