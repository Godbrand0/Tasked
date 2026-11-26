"use client";

import { useState } from "react";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { authedFetch } from "@/lib/authed-fetch";
import { useWallet } from "@/lib/wallet-context";

// Links a Google account into the user's Privy login (not just onto the
// profile), then saves the Privy-verified Gmail to the profile.
//
// Why both: the profile's google_email is what Taskify shows, but Privy's
// linked accounts decide who you are when you sign in. If Google lives only on
// the profile, "Sign in with Google" creates a separate Privy login with its
// own wallet, and every save from the real wallet fails with "isn't linked to
// your login". With Google linked in Privy, signing in with Google or with the
// wallet lands on the same login.

/** Privy error codes from linkGoogle, in words a user can act on. */
function linkErrorMessage(code: string): string {
  if (code === "linked_to_another_user") {
    return "That Google account already has its own Taskify login, so it can't be added to this one. Sign out and use “Sign in with Google” instead, or contact support to merge the two.";
  }
  if (code === "cannot_link_more_of_type") {
    return "This login already has a different Google account linked.";
  }
  return `Couldn't link Google (${code.replace(/_/g, " ")}). Try again.`;
}

export function useLinkGoogleToLogin(opts: { onLinked?: () => void } = {}) {
  const { user } = usePrivy();
  const { address, googleAvatar, linkGoogle: saveGoogleToProfile } = useWallet();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  const { linkGoogle } = useLinkAccount({
    onSuccess: async ({ linkMethod }) => {
      if (linkMethod !== "google") return;
      try {
        // /api/identity/me reads the Google account straight from the verified
        // Privy session and signs a proof /api/profile will accept.
        const res = await authedFetch("/api/identity/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const data: { identity?: { email: string; name: string } | null; linkProof?: string | null; error?: string } = await res.json().catch(() => ({}));
        if (!res.ok || !data.identity || !data.linkProof) throw new Error(data.error ?? "Couldn't read your Google account back.");
        await saveGoogleToProfile(data.identity.email, data.identity.name, googleAvatar || undefined, data.linkProof);
        opts.onLinked?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google was linked, but saving it to your profile failed. Reload and try again.");
      } finally {
        setLinking(false);
      }
    },
    onError: (code) => {
      setLinking(false);
      // Closing the Google window isn't an error worth showing.
      if (String(code) === "oauth_user_denied" || String(code) === "exited_link_flow") return;
      setError(linkErrorMessage(String(code)));
    },
  });

  return {
    /** True once Google is part of the Privy login itself. */
    loginHasGoogle: Boolean(user?.google),
    linking,
    error,
    link: () => {
      setError("");
      setLinking(true);
      linkGoogle();
    },
  };
}
