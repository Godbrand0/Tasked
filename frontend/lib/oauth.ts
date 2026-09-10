import "server-only";

// Absolute callback URL for the OAuth providers. A trailing slash on
// NEXT_PUBLIC_BASE_URL (easy to add by accident in the dashboard) would
// otherwise produce `https://host//api/auth/...`, which fails the provider's
// exact redirect_uri match — a subtle, hard-to-spot cause of "connection
// failed". Normalise it here.
export function oauthRedirectUri(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
