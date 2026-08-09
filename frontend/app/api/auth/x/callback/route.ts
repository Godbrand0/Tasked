import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const cookieVerifier = req.cookies.get("x_oauth_verifier")?.value;
  const cookieState = req.cookies.get("x_oauth_state")?.value;
  const storedReturnTo = req.cookies.get("x_oauth_return_to")?.value ?? "";
  const returnTo = storedReturnTo.startsWith("/") && !storedReturnTo.startsWith("//") ? storedReturnTo : "/register";

  function fail(reason: string) {
    const res = NextResponse.redirect(new URL(`${returnTo}?x_error=${reason}`, req.url));
    res.cookies.delete("x_oauth_verifier");
    res.cookies.delete("x_oauth_state");
    res.cookies.delete("x_oauth_return_to");
    return res;
  }

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
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/x/callback`,
      code_verifier: cookieVerifier,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) return fail("token_exchange");

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
