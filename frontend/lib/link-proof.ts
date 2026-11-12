import "server-only";
import crypto from "crypto";

// A short-lived, HMAC-signed proof that this browser really completed a
// GitHub / X / Google login as a specific account. The OAuth callbacks (and
// /api/identity/me for Privy logins) mint one; /api/profile only writes linked
// account fields that come from a valid proof, never from the request body.
// Without it, a signed-in user could put anyone's GitHub handle on their profile.
//
// Key: LINK_PROOF_SECRET if set, otherwise derived from PRIVY_APP_SECRET so no
// new env var is required to deploy.

export type LinkProvider = "github" | "x" | "google";

/** Profile columns each provider is allowed to set. */
export const PROVIDER_FIELDS: Record<LinkProvider, readonly string[]> = {
  github: ["github_handle", "github_display_name", "github_avatar_url"],
  x: ["x_handle", "x_display_name", "x_avatar_url"],
  google: ["google_email", "google_name", "google_avatar_url"],
};

const TTL_SECONDS = 7200; // 2 hours: enough to finish registering or linking

const KEY: Buffer | null = process.env.LINK_PROOF_SECRET
  ? Buffer.from(process.env.LINK_PROOF_SECRET)
  : process.env.PRIVY_APP_SECRET
    ? crypto.createHmac("sha256", process.env.PRIVY_APP_SECRET).update("taskify-link-proof").digest()
    : null;

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payloadB64: string): string {
  return b64url(crypto.createHmac("sha256", KEY as Buffer).update(payloadB64).digest());
}

/** Signs the given provider fields. Returns null when no key is configured. */
export function mintLinkProof(provider: LinkProvider, fields: Record<string, string | null>): string | null {
  if (!KEY) return null;
  const allowed: Record<string, string | null> = {};
  for (const f of PROVIDER_FIELDS[provider]) if (f in fields) allowed[f] = fields[f] || null;
  const payload = b64url(Buffer.from(JSON.stringify({ p: provider, f: allowed, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })));
  return `${payload}.${sign(payload)}`;
}

/** Verifies a proof; returns its provider and the fields it may set, or null. */
export function verifyLinkProof(token: unknown): { provider: LinkProvider; fields: Record<string, string | null> } | null {
  if (!KEY || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { p, f, exp } = JSON.parse(Buffer.from(payload, "base64").toString());
    if (!(p in PROVIDER_FIELDS) || typeof f !== "object" || f === null || typeof exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) > exp) return null;
    const provider = p as LinkProvider;
    const fields: Record<string, string | null> = {};
    for (const key of PROVIDER_FIELDS[provider]) {
      if (key in f) fields[key] = typeof f[key] === "string" ? f[key] : null;
    }
    return { provider, fields };
  } catch {
    return null;
  }
}
