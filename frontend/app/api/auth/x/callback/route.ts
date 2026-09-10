import { NextRequest, NextResponse } from "next/server";
import { oauthRedirectUri } from "@/lib/oauth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const cookieVerifier = req.cookies.get("x_oauth_verifier")?.value;
  const cookieState = req.cookies.get("x_oauth_state")?.value;
  const storedReturnTo = req.cookies.get("x_oauth_return_to")?.value ?? "";
  const returnTo = storedReturnTo.startsWith("/") && !storedReturnTo.startsWith("//") ? storedReturnTo : "/register";

  function fail(reason: string) {
    console.error("[auth/x] callback failed:", reason);
    const res = NextResponse.redirect(new URL(`${returnTo}?x_error=${reason}`, req.url));
    res.cookies.delete("x_oauth_verifier");
    res.cookies.delete("x_oauth_state");
    res.cookies.delete("x_oauth_return_to");
    return res;
  }

  // X sends the user back with ?error=... when they deny or the app is
  // misconfigured — surface that rather than a vague "no_code".
  const providerError = req.nextUrl.searchParams.get("error");
  if (providerError) return fail(providerError === "access_denied" ? "no_code" : "token_exchange");

  if (!code || !state || !cookieVerifier || !cookieState) return fail("no_code");
  if (state !== cookieState) return fail("state_mismatch");

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("not_configured");

  // Exchange code for an access token — X's confidential-client apps
  // authenticate this request with HTTP Basic auth (client_id:client_secret).
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: oauthRedirectUri("/api/auth/x/callback"),
      code_verifier: cookieVerifier,
    }),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error("[auth/x] token exchange rejected:", tokenRes.status, JSON.stringify(tokenData));
    return fail("token_exchange");
  }

  const userRes = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url,name", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) return fail("profile_fetch");

  const { data: user } = await userRes.json();

  const params = new URLSearchParams({
    x_handle: user.username,
    x_name: user.name ?? user.username,
    x_avatar: user.profile_image_url ?? "",
  });

  const res = NextResponse.redirect(new URL(`${returnTo}?${params}`, req.url));
  res.cookies.delete("x_oauth_verifier");
  res.cookies.delete("x_oauth_state");
  res.cookies.delete("x_oauth_return_to");
  return res;
}
