"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Badge, PatronTierBadge } from "@/components/ui/Badge";
import { MOCK_TASKS, MOCK_GRANT_VOTES, MOCK_PATRONS } from "@/lib/mock";
import { formatMUSD, PATRON_TIERS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";

const PATRON = MOCK_PATRONS[0];

export default function InvestorPage() {
  const { connected, isRegistered, role } = useWallet();
  const [depositAmt, setDepositAmt] = useState("");
  const [stakeAmt, setStakeAmt] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [staking, setStaking] = useState(false);
  const [votes, setVotes] = useState<Record<number, "for" | "against" | null>>({});
  const [executed, setExecuted] = useState<Record<number, boolean>>({});

  const grantTasks = MOCK_TASKS.filter(t => t.status === "GRANT_PENDING");
  const votingWeight = PATRON.totalDeposited + PATRON.mezoStaked * 10;
  const currentTier = PATRON_TIERS.find(t => t.id === PATRON.tier) ?? PATRON_TIERS[0];
  const nextTier = PATRON_TIERS.find(t => t.id === PATRON.tier + 1);
  const canVote = PATRON.totalDeposited > 0 || PATRON.mezoStaked > 0;
  const hasStake = PATRON.mezoStaked > 0;

  const numDeposit = parseFloat(depositAmt) || 0;
  const numStake = parseFloat(stakeAmt) || 0;

  // Gate: must be investor role
  if (!connected || !isRegistered) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🏛</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Patron access</h1>
          <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 28 }}>
            Connect your wallet and register as a Patron to deposit into the grant pool and vote on applications.
          </p>
          <Link href="/register" style={{ background: "var(--success)", color: "var(--bg)", fontWeight: 700, fontSize: 15, padding: "14px 32px", borderRadius: 12, textDecoration: "none", display: "inline-block" }}>
            Register as Patron →
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "investor") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🏛</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Patron Dashboard</h1>
          <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 28 }}>
            This dashboard is for Patron accounts. Your current role is <strong style={{ color: "var(--text)" }}>{role}</strong>.
          </p>
          <Link href="/dashboard" style={{ color: "var(--primary)", fontSize: 14, textDecoration: "none" }}>← Back to my dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, var(--success), var(--success-strong))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏛</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>{PATRON.username}</h1>
                <PatronTierBadge tier={PATRON.tier} />
              </div>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                Voting weight: <strong style={{ color: "var(--success)" }}>{formatMUSD(votingWeight)} MUSD-eq</strong>
                {!hasStake && <span style={{ marginLeft: 8, color: "var(--primary)", fontSize: 12 }}>— Stake MEZO to amplify 10×</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Total Deposited",    value: `${formatMUSD(PATRON.totalDeposited)} MUSD`, color: "var(--success)", icon: "💰" },
            { label: "MEZO Staked",         value: `${formatMUSD(PATRON.mezoStaked)} MEZO`,       color: "var(--secondary-light)", icon: "🔐" },
            { label: "Voting Weight",      value: `${formatMUSD(votingWeight)} eq`,             color: "var(--primary)", icon: "⚖️" },
            { label: "Active Grant Votes", value: String(grantTasks.length),                    color: "var(--blue)", icon: "🗳️" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
          {/* Left — voting */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 20px" }}>Grant Applications</h2>

            {!canVote && (
              <div style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", borderRadius: 12, padding: "14px 16px", marginBottom: 24, fontSize: 13, color: "var(--primary)", lineHeight: 1.6 }}>
                You need to deposit MUSD or stake MEZO to vote on grant applications.
              </div>
            )}

            {grantTasks.length === 0 ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗳️</div>
                <div style={{ fontSize: 15, color: "var(--text-muted)" }}>No active grant votes right now</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {grantTasks.map(task => {
                  const vote = MOCK_GRANT_VOTES[task.id];
                  const total = vote ? vote.votesFor + vote.votesAgainst : 0;
                  const forPct = total > 0 ? (vote.votesFor / total) * 100 : 0;
                  const passed = vote && vote.votesFor >= vote.threshold;
                  const myVote = votes[task.id] ?? null;
                  const isExecuted = executed[task.id] ?? vote?.executed ?? false;

                  return (
                    <div key={task.id} style={{ background: "var(--surface)", border: `1px solid ${passed ? "color-mix(in srgb, var(--success) 19%, transparent)" : "color-mix(in srgb, var(--secondary) 19%, transparent)"}`, borderRadius: 16, padding: 24 }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                            <Badge color="purple">Grant Request</Badge>
                            <Badge color="orange">{formatMUSD(task.amount)} MUSD requested</Badge>
                            {passed && !isExecuted && <Badge color="green">✓ Threshold Reached</Badge>}
                            {isExecuted && <Badge color="green">✓ Executed</Badge>}
                          </div>
                          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>{task.title}</h3>
                          {task.grantJustification && (
                            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                              "{task.grantJustification.slice(0, 180)}{task.grantJustification.length > 180 ? "…" : ""}"
                            </p>
                          )}
                        </div>
                        <Link href={`/tasks/${task.id}`} style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
                          View task →
                        </Link>
                      </div>

                      {/* Vote bar */}
                      {vote && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                            <span style={{ color: "var(--success)", fontWeight: 600 }}>For: {formatMUSD(vote.votesFor)} MUSD-eq</span>
                            <span style={{ color: "var(--danger)", fontWeight: 600 }}>Against: {formatMUSD(vote.votesAgainst)} MUSD-eq</span>
                          </div>
                          <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                            <div style={{ height: "100%", background: passed ? "linear-gradient(90deg, var(--success), color-mix(in srgb, var(--success) 50%, transparent))" : "linear-gradient(90deg, var(--secondary), color-mix(in srgb, var(--secondary) 38%, transparent))", width: `${forPct}%`, borderRadius: 4, transition: "width 0.3s" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-dim)" }}>
                            <span>{forPct.toFixed(1)}% support · {formatMUSD(total)} total weight</span>
                            <span style={{ color: passed ? "var(--success)" : "var(--text-dim)" }}>
                              Threshold: {formatMUSD(vote.threshold)} MUSD-eq {passed ? "✓" : `(${formatMUSD(vote.threshold - vote.votesFor)} more needed)`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {isExecuted ? (
                        <div style={{ background: "color-mix(in srgb, var(--success) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: "12px 16px", textAlign: "center", color: "var(--success)", fontWeight: 700, fontSize: 14 }}>
                          ✓ Grant executed — task now open on the bounty board
                        </div>
                      ) : passed ? (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            onClick={() => setExecuted(prev => ({ ...prev, [task.id]: true }))}
                            style={{ flex: 1, background: "var(--success)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                            ⚡ Execute Grant — Fund Task from Pool
                          </button>
                        </div>
                      ) : (
                        <div>
                          {!canVote ? (
                            <div style={{ background: "var(--border)", borderRadius: 10, padding: "12px 16px", textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
                              Deposit MUSD or stake MEZO to unlock voting →
                            </div>
                          ) : myVote ? (
                            <div style={{ background: myVote === "for" ? "color-mix(in srgb, var(--success) 9%, transparent)" : "color-mix(in srgb, var(--danger-strong) 9%, transparent)", border: `1px solid ${myVote === "for" ? "color-mix(in srgb, var(--success) 19%, transparent)" : "color-mix(in srgb, var(--danger-strong) 19%, transparent)"}`, borderRadius: 10, padding: "12px 16px", textAlign: "center", color: myVote === "for" ? "var(--success)" : "var(--danger)", fontWeight: 700, fontSize: 14 }}>
                              {myVote === "for" ? "✓ You voted For" : "✗ You voted Against"} · {formatMUSD(votingWeight)} MUSD-eq weight
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 10 }}>
                              <button
                                onClick={() => setVotes(prev => ({ ...prev, [task.id]: "for" }))}
                                style={{ flex: 1, background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: "pointer" }}>
                                ✓ Vote For
                              </button>
                              <button
                                onClick={() => setVotes(prev => ({ ...prev, [task.id]: "against" }))}
                                style={{ flex: 1, background: "color-mix(in srgb, var(--danger-strong) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger-strong) 19%, transparent)", color: "var(--danger)", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: "pointer" }}>
                                ✗ Vote Against
                              </button>
                            </div>
                          )}
                          {!myVote && canVote && (
                            <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", marginTop: 8 }}>
                              Your weight: <strong style={{ color: "var(--text)" }}>{formatMUSD(votingWeight)} MUSD-eq</strong> · Deadline: {vote?.deadline ? new Date(vote.deadline * 1000).toLocaleDateString() : "—"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Voting weight formula */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Voting Weight Formula</div>
              <code style={{ fontSize: 14, color: "var(--text)", fontFamily: "var(--font-geist-mono), monospace", display: "block", marginBottom: 16 }}>
                <span style={{ color: "var(--success)" }}>musd-deposited</span>{" + ("}
                <span style={{ color: "var(--secondary-light)" }}>mezo-staked</span>{" × "}
                <span style={{ color: "var(--primary)" }}>10</span>{")"}
              </code>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <WeightRow label="MUSD deposited" value={`+${formatMUSD(PATRON.totalDeposited)}`} color="var(--success)" />
                <WeightRow label="MEZO stake bonus (×10)" value={`+${formatMUSD(PATRON.mezoStaked * 10)}`} color="var(--secondary-light)" />
                <div style={{ height: 1, background: "var(--border)" }} />
                <WeightRow label="Total weight" value={`${formatMUSD(votingWeight)} MUSD-eq`} color="var(--primary)" bold />
              </div>
            </div>
          </div>

          {/* Right — deposit & stake */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Patron tier */}
            <div style={{ background: "var(--surface)", border: `1px solid ${currentTier.id !== 99 ? currentTier.color + "30" : "var(--border)"}`, borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Patron Tier</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {PATRON_TIERS.filter(t => t.id !== 99).map(t => {
                  const active = t.id === PATRON.tier;
                  const reached = PATRON.totalDeposited >= t.min;
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
                  {formatMUSD(nextTier.min - PATRON.totalDeposited)} MUSD more to reach <strong style={{ color: nextTier.color }}>{nextTier.label}</strong>
                </div>
              )}
            </div>

            {/* Deposit MUSD */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Deposit MUSD</div>
              <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 14 }}>
                Deposits are <strong style={{ color: "var(--text)" }}>permanent</strong> — this is ecosystem patronage, not a loan. Each MUSD = 1 governance unit.
              </p>
              <input type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="Amount in MUSD" min="1"
                style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "var(--text)", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--success) 25%, transparent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              <button disabled={numDeposit < 1 || depositing} onClick={() => { setDepositing(true); setTimeout(() => setDepositing(false), 1500); }}
                style={{ width: "100%", background: numDeposit >= 1 ? "color-mix(in srgb, var(--success) 9%, transparent)" : "var(--border)", border: `1px solid ${numDeposit >= 1 ? "color-mix(in srgb, var(--success) 19%, transparent)" : "var(--border)"}`, color: numDeposit >= 1 ? "var(--success)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: numDeposit >= 1 ? "pointer" : "not-allowed" }}>
                {depositing ? "Depositing…" : "Deposit to Pool"}
              </button>
            </div>

            {/* Stake MEZO */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--secondary-light)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Stake MEZO</div>
              <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 14 }}>
                1 MEZO staked = 10 MUSD-eq voting weight. Always withdrawable — no lockup or slashing.
              </p>
              <input type="number" value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} placeholder="Amount in MEZO" min="1"
                style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "var(--text)", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--secondary-light) 25%, transparent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={numStake < 1 || staking} onClick={() => { setStaking(true); setTimeout(() => setStaking(false), 1500); }}
                  style={{ flex: 1, background: numStake >= 1 ? "color-mix(in srgb, var(--secondary) 9%, transparent)" : "var(--border)", border: `1px solid ${numStake >= 1 ? "color-mix(in srgb, var(--secondary) 19%, transparent)" : "var(--border)"}`, color: numStake >= 1 ? "var(--secondary-light)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, cursor: numStake >= 1 ? "pointer" : "not-allowed" }}>
                  {staking ? "Staking…" : "Stake MEZO"}
                </button>
                <button disabled={PATRON.mezoStaked === 0}
                  style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, cursor: PATRON.mezoStaked > 0 ? "pointer" : "not-allowed", opacity: PATRON.mezoStaked === 0 ? 0.5 : 1 }}>
                  Unstake
                </button>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
                Staked: <strong style={{ color: "var(--text)" }}>{formatMUSD(PATRON.mezoStaked)} MEZO</strong>
                {!hasStake && <span style={{ color: "var(--primary)", marginLeft: 6 }}>← Stake to amplify your vote 10×</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 700 : 600 }}>{value}</span>
    </div>
  );
}
