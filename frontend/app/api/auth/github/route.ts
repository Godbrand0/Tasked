import { NextResponse } from "next/server";
import { oauthRedirectUri } from "@/lib/oauth";

export function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return new Response("GITHUB_CLIENT_ID is not set", { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthRedirectUri("/api/auth/github/callback"),
    scope: "read:user",
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`
  );
}
