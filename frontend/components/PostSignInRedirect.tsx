"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AFTER_SIGN_IN_KEY, SIGN_IN_EVENT, useWallet } from "@/lib/wallet-context";

// Finishes a Sign in / Sign up click (wallet-context signIn): once the login
// has a wallet and we know whether it's registered, new accounts go to
// /register and existing ones to where they were heading. Without this, the
// login modal closed and left people on the landing page wondering what next.
export function PostSignInRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { connected, registrationKnown, isRegistered } = useWallet();

  const finish = useCallback(() => {
    if (!connected || !registrationKnown) return;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(AFTER_SIGN_IN_KEY);
      if (stored) sessionStorage.removeItem(AFTER_SIGN_IN_KEY);
    } catch {
      return;
    }
    if (!stored) return;
    // "<timestamp>|<path>". Ignore a stale one left by a closed login modal,
    // so connecting much later doesn't suddenly jump pages.
    const at = Number(stored.split("|")[0]);
    const next = stored.slice(stored.indexOf("|") + 1);
    if (!next.startsWith("/") || Date.now() - at > 10 * 60_000) return;
    const target = isRegistered ? next : "/register";
    if (target !== pathname) router.push(target);
  }, [connected, registrationKnown, isRegistered, pathname, router]);

  // After the login modal: fires when the wallet connects and registration loads.
  useEffect(() => { finish(); }, [finish]);

  // Already signed in when the button was clicked: nothing above changes, so
  // signIn() pings us directly.
  useEffect(() => {
    window.addEventListener(SIGN_IN_EVENT, finish);
    return () => window.removeEventListener(SIGN_IN_EVENT, finish);
  }, [finish]);

  return null;
}
