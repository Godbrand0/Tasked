"use client";

import { useState } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import PageShell, { Container } from "@/components/ui/PageShell";
import EmptyState from "@/components/ui/EmptyState";
import { IconWaves, IconTrophy } from "@/components/icons";
import { formatMUSD, MUSD_DECIMALS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";
import { useCurrentWave, useWaveEpochDuration, useWaveHistory, useWaveCreatorTasks, useWaveClaimed, useTaskifyTx } from "@/lib/use-taskify";
import { formatContractError } from "@/lib/errors";

function daysBetween(seconds: number) {
  return Math.max(0, Math.floor(seconds / 86400));
}

export default function WavePage() {
  const { connected, isRegistered, role, address } = useWallet();
  const { send } = useTaskifyTx();
  const { wave, isLoading: waveLoading } = useCurrentWave();
  const epochDuration = useWaveEpochDuration();
  const { count: myCurrentTasks } = useWaveCreatorTasks(wave.waveId, address);
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useWaveHistory(wave.waveId, address);

  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimError, setClaimError] = useState("");

  const isCreator = connected && isRegistered && role === "creator";
  const poolAmountHuman = Number(formatUnits(wave.poolAmount, MUSD_DECIMALS));
  const myShareHuman = wave.totalTasks > 0 ? (poolAmountHuman * myCurrentTasks) / wave.totalTasks : 0;

  const elapsed = wave.startTime > 0 ? Math.floor(Date.now() / 1000) - wave.startTime : 0;
  const epochDays = daysBetween(epochDuration);
  const readyToAdvance = wave.startTime > 0 && elapsed >= epochDuration;

  async function handleClaim(waveId: number) {
    setClaimingId(waveId);
    setClaimError("");
    try {
      await send("claimWaveReward", [BigInt(waveId)]);
      await refetchHistory();
    } catch (err) {
      setClaimError(formatContractError(err, "Claim failed"));
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <PageShell>
      <Container maxWidth={900} style={{ padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
            <IconWaves size={14} /> Wave Rewards
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>Wave Rewards</h1>
          <p style={{ fontSize: 15, color: "var(--text-dim)", textAlign: "justify", lineHeight: 1.7, margin: 0, maxWidth: 640 }}>
            Every self-funded task you post pays into that wave&apos;s shared pool. When the epoch ends, the pool splits proportionally across owners by tasks posted; grant-funded tasks don&apos;t count. Anyone can advance a finished wave; there&apos;s no admin switch.
          </p>
        </div>

        {/* Current wave */}
        <div style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--bg-alt) 100%)", border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)", borderRadius: 20, padding: 32, marginBottom: 40, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, background: "radial-gradient(ellipse, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
              Wave #{wave.waveId} · Current
            </div>
            {waveLoading ? (
              <div style={{ fontSize: 14, color: "var(--text-dim)" }}>Loading wave…</div>
            ) : (
              <>
                <div className="figure" style={{ fontSize: 42, fontWeight: 800, color: "var(--primary)", marginBottom: 4 }}>
                  {formatMUSD(poolAmountHuman)} <span style={{ fontSize: 18, fontWeight: 600, color: "var(--text-muted)" }}>MUSD pool</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 24 }}>
                  {wave.startTime > 0 ? `Started ${daysBetween(elapsed)} day${daysBetween(elapsed) !== 1 ? "s" : ""} ago` : "Not started yet"} · epoch length ~{epochDays} days
                  {readyToAdvance && <span style={{ color: "var(--success)", fontWeight: 600 }}> · ready to advance</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 14 }}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
                    <div className="figure" style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{wave.totalTasks}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Self-funded tasks this wave</div>
                  </div>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
                    <div className="figure" style={{ fontSize: 20, fontWeight: 800, color: isCreator ? "var(--success)" : "var(--text-dim)", marginBottom: 4 }}>{isCreator ? myCurrentTasks : "N/A"}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Your tasks this wave</div>
                  </div>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
                    <div className="figure" style={{ fontSize: 20, fontWeight: 800, color: isCreator ? "var(--primary)" : "var(--text-dim)", marginBottom: 4 }}>{isCreator ? `${formatMUSD(myShareHuman)} MUSD` : "N/A"}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Your estimated share</div>
                  </div>
                </div>

                {!connected && (
                  <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "justify", marginTop: 16 }}>
                    <Link href="/register" style={{ color: "var(--primary)" }}>Register as an owner</Link> to earn a share of future waves by self-funding tasks.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* History */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 16px" }}>Past Waves</h2>

          {claimError && (
            <div style={{ fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
              {claimError}
            </div>
          )}

          {historyLoading ? (
            <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "32px 0" }}>Loading wave history…</div>
          ) : !history || history.length === 0 ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
              <EmptyState size="lg" icon={IconTrophy} title="No finished waves yet" description="This is the first wave; check back once it advances" />
            </div>
          ) : (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 140px", gap: 0, padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 600 }}>
                  <span>Wave</span>
                  <span>Pool</span>
                  <span>Tasks</span>
                  <span>Your Tasks</span>
                  <span></span>
                </div>
                {history.map((h, i) => {
                  const poolHuman = Number(formatUnits(h.poolAmount, MUSD_DECIMALS));
                  const myShare = h.totalTasks > 0 ? (poolHuman * h.myTasks) / h.totalTasks : 0;
                  const canClaim = isCreator && h.myTasks > 0 && !h.claimed;
                  return (
                    <div key={h.waveId} className="table-row" style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 140px", gap: 0, padding: "14px 20px", borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", transition: "background var(--duration-fast) ease", minWidth: 600 }}>
                      <span className="figure" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>#{h.waveId}</span>
                      <span className="figure" style={{ fontSize: 13, color: "var(--text-muted)" }}>{formatMUSD(poolHuman)} MUSD</span>
                      <span className="figure" style={{ fontSize: 13, color: "var(--text-muted)" }}>{h.totalTasks}</span>
                      <span className="figure" style={{ fontSize: 13, color: h.myTasks > 0 ? "var(--success)" : "var(--text-dim)" }}>
                        {isCreator ? (h.myTasks > 0 ? `${h.myTasks} (${formatMUSD(myShare)} MUSD)` : "N/A") : "N/A"}
                      </span>
                      <span style={{ textAlign: "right" }}>
                        {canClaim ? (
                          <button disabled={claimingId === h.waveId} onClick={() => handleClaim(h.waveId)} className="btn-motion"
                            style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 700, fontSize: 12, padding: "6px 12px", borderRadius: 6, cursor: claimingId === h.waveId ? "not-allowed" : "pointer", opacity: claimingId === h.waveId ? 0.7 : 1 }}>
                            {claimingId === h.waveId ? "Confirming…" : "Claim →"}
                          </button>
                        ) : isCreator && h.myTasks > 0 && h.claimed ? (
                          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Claimed</span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Container>
    </PageShell>
  );
}
