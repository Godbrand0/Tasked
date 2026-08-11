import { NextRequest, NextResponse } from "next/server";

function getReturnTo(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  return state.startsWith("/") && !state.startsWith("//") ? state : "/register";
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const returnTo = getReturnTo(req);

  if (!code) {
    return NextResponse.redirect(new URL(`${returnTo}?google_error=no_code`, req.url));
  }

  // Exchange code for an access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(new URL(`${returnTo}?google_error=token_exchange`, req.url));
  }

  // Fetch the authenticated user's profile
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL(`${returnTo}?google_error=profile_fetch`, req.url));
  }

  const user = await userRes.json();

  if (!user.email) {
    return NextResponse.redirect(new URL(`${returnTo}?google_error=no_email`, req.url));
  }

  const params = new URLSearchParams({
    google_email: user.email,
    google_name: user.name ?? user.email.split("@")[0],
    google_avatar: user.picture ?? "",
  });

  return NextResponse.redirect(new URL(`${returnTo}?${params}`, req.url));
}
