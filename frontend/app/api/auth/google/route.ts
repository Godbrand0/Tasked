import { NextRequest, NextResponse } from "next/server";

// Google OAuth 2.0 — same pattern as app/api/auth/github, plain
// authorization-code flow (no PKCE needed for a confidential server-side
// client). Register an app at https://console.cloud.google.com/apis/credentials,
// add `${NEXT_PUBLIC_BASE_URL}/api/auth/google/callback` as an authorized
// redirect URI, and set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET below.
//
// Used from both /register (the required identity) and /settings (legacy
// accounts registered before Google existed, linking it after the fact).
// return_to is round-tripped through the OAuth `state` param — safe here
// since, unlike X's PKCE flow, there's no verifier secret that needs a
// cookie to protect; state is just opaque data Google echoes back as-is.

export function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("GOOGLE_CLIENT_ID is not set", { status: 500 });
  }

  const requested = req.nextUrl.searchParams.get("return_to") ?? "";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/register";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state: returnTo,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
