import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// X (Twitter) API v2 OAuth 2.0 with PKCE — same pattern as
// app/api/auth/github, but X requires a code_verifier/code_challenge pair
// since it only supports the PKCE authorization code flow for user context.
// Register an app at https://developer.x.com/en/portal/dashboard, add
// `${NEXT_PUBLIC_BASE_URL}/api/auth/x/callback` as a callback URL, and set
// X_CLIENT_ID / X_CLIENT_SECRET below.

function base64url(input: Buffer) {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function GET(req: NextRequest) {
  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) {
    return new Response("X_CLIENT_ID is not set", { status: 500 });
  }

  // Accepts any same-origin relative path so the callback can return the
  // user to wherever they started (register, settings, or a specific task).
  const requested = req.nextUrl.searchParams.get("return_to") ?? "";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/register";

  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/x/callback`,
    scope: "users.read tweet.read",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const res = NextResponse.redirect(`https://x.com/i/oauth2/authorize?${params}`);

  const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/" };
  res.cookies.set("x_oauth_verifier", verifier, cookieOpts);
  res.cookies.set("x_oauth_state", state, cookieOpts);
  res.cookies.set("x_oauth_return_to", returnTo, cookieOpts);

  return res;
}
