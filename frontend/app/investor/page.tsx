"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Badge, PatronTierBadge, StatusBadge } from "@/components/ui/Badge";
import { MOCK_TASKS, MOCK_GRANT_VOTES, MOCK_PATRONS } from "@/lib/mock";
import { formatUSDX, PATRON_TIERS } from "@/lib/constants";

const PATRON = MOCK_PATRONS[0];

export default function InvestorPage() {
  const [depositAmt, setDepositAmt] = useState("");
  const [stakeAmt, setStakeAmt] = useState("");
  const [unstakeAmt, setUnstakeAmt] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [staking, setStaking] = useState(false);

  const grantTasks = MOCK_TASKS.filter((t) => t.status === "GRANT_PENDING");
  const votingWeight = PATRON.totalDeposited + PATRON.stxStaked * 10;
  const currentTier = PATRON_TIERS.find((t) => t.id === PATRON.tier) ?? PATRON_TIERS[0];
  const nextTier = PATRON_TIERS.find((t) => t.id === PATRON.tier + 1);

  const numDeposit = parseFloat(depositAmt) || 0;
  const numStake = parseFloat(stakeAmt) || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #00D395, #00A070)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏛</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5", margin: 0 }}>{PATRON.username}</h1>
                <PatronTierBadge tier={PATRON.tier} />
              </div>
              <div style={{ fontSize: 13, color: "#7070A0" }}>Governance weight: <strong style={{ color: "#00D395" }}>{formatUSDX(votingWeight)} USDX-eq</strong></div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Total Deposited",    value: `${formatUSDX(PATRON.totalDeposited)} USDX`, color: "#00D395", icon: "💰" },
            { label: "STX Staked",         value: `${formatUSDX(PATRON.stxStaked)} STX`,       color: "#8B80FF", icon: "🔐" },
            { label: "Voting Weight",      value: `${formatUSDX(votingWeight)} eq`,             color: "#F7931A", icon: "⚖️" },
            { label: "Active Grant Votes", value: String(grantTasks.length),                    color: "#60A5FA", icon: "🗳️" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 13, color: "#7070A0" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
          {/* Left — voting */}
          <div>
            {/* Active grant votes */}
            <div style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F0F0F5", margin: "0 0 20px" }}>Active Grant Votes</h2>
              {grantTasks.length === 0 ? (
                <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🗳️</div>
                  <div style={{ fontSize: 15, color: "#9090B0" }}>No active grant votes right now</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {grantTasks.map((task) => {
                    const vote = MOCK_GRANT_VOTES[task.id];
                    const total = vote ? vote.votesFor + vote.votesAgainst : 0;
                    const forPct = total > 0 ? (vote.votesFor / total) * 100 : 0;
                    return (
                      <div key={task.id} style={{ background: "#111116", border: "1px solid #5546FF30", borderRadius: 14, padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                              <Badge color="purple">Grant</Badge>
                              <Badge color="orange">{formatUSDX(task.amount)} USDX requested</Badge>
                            </div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: 0 }}>{task.title}</h3>
                          </div>
                          <div style={{ fontSize: 12, color: "#7070A0", flexShrink: 0, marginLeft: 16 }}>Block deadline: {vote?.deadline?.toLocaleString()}</div>
                        </div>

                        {vote && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                              <span style={{ color: "#00D395", fontWeight: 600 }}>For: {formatUSDX(vote.votesFor)} USDX</span>
                              <span style={{ color: "#F87171", fontWeight: 600 }}>Against: {formatUSDX(vote.votesAgainst)} USDX</span>
                            </div>
                            <div style={{ height: 8, background: "#1E1E2A", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", background: "linear-gradient(90deg, #00D395, #00D39580)", width: `${forPct}%`, borderRadius: 4, transition: "width 0.3s" }} />
                            </div>
                            <div style={{ fontSize: 12, color: "#7070A0", marginTop: 6 }}>{forPct.toFixed(1)}% support · {formatUSDX(total)} USDX total weight</div>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 10 }}>
                          <button style={{ flex: 1, background: "#00D39518", border: "1px solid #00D39530", color: "#00D395", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: "pointer" }}>
                            ✓ Vote For
                          </button>
                          <button style={{ flex: 1, background: "#EF444418", border: "1px solid #EF444430", color: "#F87171", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: "pointer" }}>
                            ✗ Vote Against
                          </button>
                        </div>
                        <div style={{ fontSize: 12, color: "#7070A0", textAlign: "center", marginTop: 8 }}>
                          Your vote weight: <strong style={{ color: "#F0F0F5" }}>{formatUSDX(votingWeight)} USDX-eq</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Voting weight formula */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Voting Weight Formula</div>
              <code style={{ fontSize: 14, color: "#F0F0F5", fontFamily: "var(--font-geist-mono), monospace", display: "block", marginBottom: 12 }}>
                <span style={{ color: "#00D395" }}>usdx-deposited</span>{" + ("}
                <span style={{ color: "#8B80FF" }}>stx-staked</span>{" × "}
                <span style={{ color: "#F7931A" }}>10</span>{" / 1e6)"}
              </code>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#7070A0" }}>USDX deposited</span>
                  <span style={{ color: "#00D395", fontWeight: 600 }}>+{formatUSDX(PATRON.totalDeposited)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#7070A0" }}>STX stake bonus (×10)</span>
                  <span style={{ color: "#8B80FF", fontWeight: 600 }}>+{formatUSDX(PATRON.stxStaked * 10)}</span>
                </div>
                <div style={{ height: 1, background: "#1E1E2A" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#9090B0", fontWeight: 600 }}>Total weight</span>
                  <span style={{ color: "#F7931A", fontWeight: 700 }}>{formatUSDX(votingWeight)} USDX-eq</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar — deposit & stake */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Patron tier */}
            <div style={{ background: "#111116", border: `1px solid ${currentTier.id !== 99 ? currentTier.color + "30" : "#1E1E2A"}`, borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Patron Tier</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PATRON_TIERS.filter((t) => t.id !== 99).map((t) => {
                  const active = t.id === PATRON.tier;
                  const reached = PATRON.totalDeposited / 1e6 >= t.min;
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: active ? t.bg : "transparent", border: `1px solid ${active ? t.color + "40" : "transparent"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: reached ? t.color : "#2E2E3A" }} />
                        <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? t.color : reached ? "#9090B0" : "#50507088" }}>{t.label}</span>
                      </div>
                      <span style={{ fontSize: 12, color: active ? t.color : "#50507088" }}>{t.min.toLocaleString()} USDX</span>
                    </div>
                  );
                })}
              </div>
              {nextTier && (
                <div style={{ fontSize: 12, color: "#7070A0", marginTop: 14, lineHeight: 1.5 }}>
                  {formatUSDX((nextTier.min * 1e6) - PATRON.totalDeposited)} USDX more to reach <strong style={{ color: nextTier.color }}>{nextTier.label}</strong>
                </div>
              )}
            </div>

            {/* Deposit USDX */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#00D395", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Deposit USDX</div>
              <p style={{ fontSize: 12, color: "#7070A0", lineHeight: 1.6, marginBottom: 14 }}>Deposits are <strong style={{ color: "#F0F0F5" }}>permanent</strong>. This is ecosystem patronage, not a loan.</p>
              <input type="number" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="Amount in USDX" min="1"
                style={{ width: "100%", background: "#18181F", border: "1px solid #1E1E2A", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#F0F0F5", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                onFocus={(e) => (e.target.style.borderColor = "#00D39540")}
                onBlur={(e) => (e.target.style.borderColor = "#1E1E2A")} />
              <button disabled={numDeposit < 1 || depositing} onClick={() => { setDepositing(true); setTimeout(() => setDepositing(false), 1500); }}
                style={{ width: "100%", background: numDeposit >= 1 ? "#00D39518" : "#1E1E2A", border: `1px solid ${numDeposit >= 1 ? "#00D39530" : "#1E1E2A"}`, color: numDeposit >= 1 ? "#00D395" : "#50507088", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: numDeposit >= 1 ? "pointer" : "not-allowed" }}>
                {depositing ? "Depositing…" : "Deposit to Pool"}
              </button>
            </div>

            {/* Stake STX */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8B80FF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Stake STX</div>
              <p style={{ fontSize: 12, color: "#7070A0", lineHeight: 1.6, marginBottom: 14 }}>Amplifies your voting weight by 10×. Withdrawable any time — no lockup.</p>
              <input type="number" value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} placeholder="Amount in STX" min="1"
                style={{ width: "100%", background: "#18181F", border: "1px solid #1E1E2A", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#F0F0F5", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                onFocus={(e) => (e.target.style.borderColor = "#8B80FF40")}
                onBlur={(e) => (e.target.style.borderColor = "#1E1E2A")} />
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={numStake < 1 || staking} onClick={() => { setStaking(true); setTimeout(() => setStaking(false), 1500); }}
                  style={{ flex: 1, background: numStake >= 1 ? "#5546FF18" : "#1E1E2A", border: `1px solid ${numStake >= 1 ? "#5546FF30" : "#1E1E2A"}`, color: numStake >= 1 ? "#8B80FF" : "#50507088", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, cursor: numStake >= 1 ? "pointer" : "not-allowed" }}>
                  {staking ? "Staking…" : "Stake STX"}
                </button>
                <button disabled={PATRON.stxStaked === 0}
                  style={{ flex: 1, background: "transparent", border: "1px solid #1E1E2A", color: "#9090B0", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, cursor: "pointer" }}>
                  Unstake
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#7070A0", marginTop: 8 }}>Currently staked: <strong style={{ color: "#F0F0F5" }}>{formatUSDX(PATRON.stxStaked)} STX</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
