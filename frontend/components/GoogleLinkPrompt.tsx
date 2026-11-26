"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@/lib/wallet-context";
import { useLinkGoogleToLogin } from "@/lib/use-link-google";

// One-time nudge for accounts whose Gmail is saved on the profile but isn't
// part of their Privy login (everyone who connected Google before it was
// linked through Privy). Until it's linked, "Sign in with Google" opens a
// different account with a different wallet. See lib/use-link-google.ts.

const DISMISS_KEY = (address: string) => `taskify:google-link-dismissed:${address.toLowerCase()}`;

export function GoogleLinkPrompt() {
  const { session, address, googleEmail } = useWallet();
  const { user } = usePrivy();
  const { loginHasGoogle, link, linking, error } = useLinkGoogleToLogin();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!address) return;
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY(address)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [address]);

  // An email login with the same address already reaches this account.
  const loginEmail = user?.email?.address?.toLowerCase();
  const needed = session === "ok" && Boolean(googleEmail) && !loginHasGoogle && loginEmail !== googleEmail.toLowerCase();
  if (!needed || dismissed || !address) return null;

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY(address!), "1"); } catch { /* private mode */ }
  }

  const button: React.CSSProperties = { fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" };

  return (
    <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 900, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", maxWidth: 720, width: "100%", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "12px 14px", boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}>
        <div style={{ flex: "1 1 280px", fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Keep {googleEmail} with this wallet</strong>
          <br />
          Link Google to your login so signing in with Google or with this wallet always opens this account.
          {error && <div style={{ color: "var(--danger)", marginTop: 4 }}>{error}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button disabled={linking} onClick={link} style={{ ...button, background: "var(--primary)", color: "var(--on-primary)", border: "none", opacity: linking ? 0.6 : 1 }}>
            {linking ? "Linking…" : "Link Google"}
          </button>
          <button onClick={dismiss} style={{ ...button, background: "transparent", color: "var(--text-dim)", border: "none" }}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
