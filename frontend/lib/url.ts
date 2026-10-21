/**
 * Absolute URL for a path.
 *
 * Uses the live origin in the browser, NEXT_PUBLIC_BASE_URL on the server.
 * NEXT_PUBLIC_BASE_URL is already set for the OAuth flows (frontend/app/api/auth/*),
 * so the server path is covered.
 *
 * The canonical production origin is a last-resort fallback: without it the
 * server-rendered markup would carry a RELATIVE url (e.g. "/tasks/7"), and the share
 * button would then copy a relative path instead of the absolute canonical link the
 * behaviour spec requires. The client always prefers window.location.origin, so a
 * preview/staging deployment still shares its own origin.
 */
const FALLBACK_ORIGIN = "https://taskifybounties.com";

export function absoluteUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    return `${window.location.origin}${suffix}`;
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  return `${base || FALLBACK_ORIGIN}${suffix}`;
}
