"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import Navbar from "@/components/Navbar";
import { PatronTierBadge } from "@/components/ui/Badge";
import { formatMUSD, PATRON_TIERS, MUSD_DECIMALS } from "@/lib/constants";
import { useWallet, formatAddress } from "@/lib/wallet-context";
import { MUSD_ADDRESS, TASKIFY_ADDRESS } from "@/lib/taskify";
import { useApproveIfNeeded, usePatron, useTaskifyTx, useTaskifyUser, toRawMUSD } from "@/lib/use-taskify";
import { formatContractError } from "@/lib/errors";

export default function SupportPage() {
  const { connected, isRegistered, username } = useWallet();
  const { address } = useAccount();
  const { send } = useTaskifyTx();
  const { ensureApproval } = useApproveIfNeeded();

  const { patron, refetch: refetchPatron } = usePatron(address);
  const { user } = useTaskifyUser(address);

  const [depositAmt, setDepositAmt] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [actionError, setActionError] = useState("");

  const currentTier = PATRON_TIERS.find(t => t.id === patron.tier) ?? PATRON_TIERS[0];
  const nextTierIdx = PATRON_TIERS.findIndex(t => t.id === currentTier.id) - 1;
  const nextTier = nextTierIdx >= 0 ? PATRON_TIERS[nextTierIdx] : undefined;

  const numDeposit = parseFloat(depositAmt) || 0;
  const totalDepositedHuman = Number(formatUnits(patron.totalDeposited, MUSD_DECIMALS));

  async function handleDeposit() {
    if (numDeposit < 1 || !address || !MUSD_ADDRESS || !TASKIFY_ADDRESS) return;
    setDepositing(true);
    setActionError("");
    try {
      const raw = toRawMUSD(numDeposit);
      await ensureApproval(MUSD_ADDRESS, address, TASKIFY_ADDRESS, raw);
      await send("depositToPool", [raw]);
      setDepositAmt("");
      await refetchPatron();
    } catch (err) {
      setActionError(formatContractError(err, "Deposit failed"));
    } finally {
      setDepositing(false);
    }
  }

  // Gate: must be a registered wallet — any role can support the pool.
  if (!connected || !isRegistered) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🏛</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Support the grant pool</h1>
          <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 28 }}>
            Connect your wallet and register to deposit MUSD into the grant pool. Any registered wallet — Owner or Contributor — can support.
          </p>
          <Link href="/register" style={{ background: "var(--success)", color: "var(--bg)", fontWeight: 700, fontSize: 15, padding: "14px 32px", borderRadius: 12, textDecoration: "none", display: "inline-block" }}>
            Register →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, var(--success), var(--success-strong))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏛</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>{user.username || username || formatAddress(address ?? "")}</h1>
              <PatronTierBadge tier={currentTier.id} />
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
              Supporting the pool doesn&apos;t grant voting rights on its own — see{" "}
              <Link href="/vote" style={{ color: "var(--primary)" }}>Vote</Link> for how grant voting works.
            </div>
          </div>
        </div>

        {actionError && (
          <div style={{ fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 10, padding: "10px 14px", marginBottom: 24 }}>
            {actionError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Total deposited stat */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>💰</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)", marginBottom: 4 }}>{formatMUSD(totalDepositedHuman)} MUSD</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Total Deposited</div>
          </div>

          {/* Patron tier */}
          <div style={{ background: "var(--surface)", border: `1px solid ${currentTier.id !== 99 ? currentTier.color + "30" : "var(--border)"}`, borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Patron Tier</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {PATRON_TIERS.filter(t => t.id !== 99).map(t => {
                const active = t.id === currentTier.id;
                const reached = totalDepositedHuman >= t.min;
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: active ? t.bg : "transparent", border: `1px solid ${active ? t.color + "40" : "transparent"}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: reached ? t.color : "var(--border-strong)" }} />
                      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? t.color : reached ? "var(--text-muted)" : "color-mix(in srgb, var(--text-faint) 38%, transparent)" }}>{t.label}</span>
                    </div>
                    <span style={{ fontSize: 12, color: active ? t.color : "color-mix(in srgb, var(--text-faint) 38%, transparent)" }}>{t.min.toLocaleString()} MUSD</span>
                  </div>
                );
              })}
            </div>
            {nextTier && (
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 14, lineHeight: 1.5 }}>
                {formatMUSD(nextTier.min - totalDepositedHuman)} MUSD more to reach <strong style={{ color: nextTier.color }}>{nextTier.label}</strong>
              </div>
            )}
          </div>

          {/* Deposit MUSD */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Support the Pool</div>
            <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 14 }}>
              Deposits are <strong style={{ color: "var(--text)" }}>permanent</strong> — this is ecosystem patronage, not a loan. Minimum 50 MUSD. Any registered wallet can support, regardless of role.
            </p>
            <input type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="Amount in MUSD" min="50"
              style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "var(--text)", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
              onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--success) 25%, transparent)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            <button disabled={numDeposit < 50 || depositing} onClick={handleDeposit}
              style={{ width: "100%", background: numDeposit >= 50 ? "color-mix(in srgb, var(--success) 9%, transparent)" : "var(--border)", border: `1px solid ${numDeposit >= 50 ? "color-mix(in srgb, var(--success) 19%, transparent)" : "var(--border)"}`, color: numDeposit >= 50 ? "var(--success)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: numDeposit >= 50 ? "pointer" : "not-allowed" }}>
              {depositing ? "Depositing…" : "Deposit to Pool"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
