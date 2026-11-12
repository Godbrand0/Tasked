import { getAccessToken } from "@privy-io/react-auth";

// fetch() that attaches the caller's Privy access token, so API routes can
// verify which wallets the caller actually owns (lib/verify-caller.ts).
// Use it for every write to our API and for reading your own private profile.
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken().catch(() => null);
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
