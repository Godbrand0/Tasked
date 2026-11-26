"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet-context";

// Bottom bar shown when a wallet is connected but saves to our API would fail:
// either there's no Privy session ("Please sign in again") or the wallet isn't
// one of the login's wallets ("That wallet isn't linked to your login").
// Without it the site looks signed in and every save just errors.
export function SessionBanner() {
  const { session, address, signInWithWallet, switchToLinkedWallet, disconnect, identityConflict } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const problem = !identityConflict && (session === "signed_out" || session === "unlinked");

  // Wallet and login state settle at slightly different times after a page
  // load or sign-in; only show the bar once the problem has lasted a moment.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (!problem) return;
    const t = setTimeout(() => setSettled(true), 2000);
    return () => clearTimeout(t);
  }, [problem, session, address]);

  // The wallet reconnected on its own but the login session is gone: ask the
  // wallet for the sign-in signature straight away instead of waiting for a
  // click. Once per wallet per tab, so cancelling it doesn't loop; the bar
  // stays for a manual retry.
  useEffect(() => {
    if (!settled || session !== "signed_out" || !address) return;
    const key = `taskify:auto-signin:${address.toLowerCase()}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return; // no storage: can't guard against loops, leave it to the button
    }
    void run(signInWithWallet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, session, address]);

  if (!problem || !settled) return null;

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "This wallet";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(/already (linked|exists)|linked to another/i.test(msg)
        ? "This wallet already belongs to a different Taskify login. Sign out, then sign in with this wallet."
        : "That didn't work. Try again, or sign out and sign back in.");
    } finally {
      setBusy(false);
    }
  }

  const button: React.CSSProperties = { fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" };

  return (
    <div role="alert" style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 900, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", maxWidth: 720, width: "100%", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--warning) 40%, var(--border))", borderRadius: 12, padding: "12px 14px", boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}>
        <div style={{ flex: "1 1 280px", fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>
            {session === "signed_out" ? "You're not signed in" : `${short} isn't linked to your login`}
          </strong>
          <br />
          {session === "signed_out"
            ? `Your wallet is connected, but your Taskify session has ended, so nothing you do can be saved. Sign in with ${short} to continue.`
            : "Taskify can't save anything for this wallet until it's linked to the account you signed in with."}
          {error && <div style={{ color: "var(--danger)", marginTop: 4 }}>{error}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button disabled={busy} onClick={() => run(signInWithWallet)} style={{ ...button, background: "var(--primary)", color: "var(--on-primary)", border: "none", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Check your wallet…" : session === "signed_out" ? "Sign in" : "Link this wallet"}
          </button>
          {session === "unlinked" && switchToLinkedWallet && (
            <button disabled={busy} onClick={() => run(switchToLinkedWallet)} style={{ ...button, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}>
              Use my linked wallet
            </button>
          )}
          <button disabled={busy} onClick={disconnect} style={{ ...button, background: "transparent", color: "var(--text-dim)", border: "none" }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
