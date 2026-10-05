"use client";

import { useWallet } from "@/lib/wallet-context";

// Full-screen block shown when a Privy login's Gmail/email is already linked
// to a different wallet. One Google/email identity per wallet — the person
// should sign in with the wallet that already holds the account instead of
// opening a second one from a fresh embedded wallet.
export function IdentityConflictGate() {
  const { identityConflict, disconnect } = useWallet();
  if (!identityConflict) return null;

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="identity-conflict-title"
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 24px", maxWidth: 420, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
        <h2 id="identity-conflict-title" style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 10px" }}>
          This account already exists
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 12px" }}>
          The Google account or email you signed in with is already linked to the wallet{" "}
          <span style={{ fontFamily: "var(--font-geist-mono)", color: "var(--text)" }}>{identityConflict}</span>.
          Each person can only have one Taskify account.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 20px" }}>
          Sign out and connect that wallet to continue.
        </p>
        <button onClick={disconnect} className="btn-motion"
          style={{ width: "100%", background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer" }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
