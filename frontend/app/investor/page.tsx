"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import Navbar from "@/components/Navbar";
import { Badge, PatronTierBadge } from "@/components/ui/Badge";
import { formatMUSD, PATRON_TIERS, MUSD_DECIMALS } from "@/lib/constants";
import { useWallet, formatAddress } from "@/lib/wallet-context";
import { MUSD_ADDRESS, MEZO_ADDRESS, TASKIFY_ADDRESS, votingWeight, formatVotingWeight, GRANT_PASS_THRESHOLD } from "@/lib/taskify";
import { useAllTasks, useApproveIfNeeded, useGrantVotesBatch, usePatron, useTaskifyTx, useTaskifyUser, toRawMUSD } from "@/lib/use-taskify";

export default function InvestorPage() {
  const { connected, isRegistered, role, username } = useWallet();
  const { address } = useAccount();
  const { send } = useTaskifyTx();
  const { ensureApproval } = useApproveIfNeeded();

  const { patron, refetch: refetchPatron } = usePatron(address);
  const { user } = useTaskifyUser(address);
  const { data: allTasks } = useAllTasks();
  const grantTasks = (allTasks ?? []).filter(t => t.status === 8); // GRANT_PENDING
  const taskIds = grantTasks.map(t => t.id);
  const { data: votesById, refetch: refetchVotes } = useGrantVotesBatch(taskIds, address);

  const [depositAmt, setDepositAmt] = useState("");
  const [stakeAmt, setStakeAmt] = useState("");
  const [unstakeAmt, setUnstakeAmt] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [staking, setStaking] = useState(false);
  const [unstaking, setUnstaking] = useState(false);
  const [votingTaskId, setVotingTaskId] = useState<number | null>(null);
  const [executingTaskId, setExecutingTaskId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const weight = votingWeight(patron.totalDeposited, patron.mezoStaked);
  const currentTier = PATRON_TIERS.find(t => t.id === patron.tier) ?? PATRON_TIERS[0];
  const nextTierIdx = PATRON_TIERS.findIndex(t => t.id === currentTier.id) - 1;
  const nextTier = nextTierIdx >= 0 ? PATRON_TIERS[nextTierIdx] : undefined;
  const canVote = weight > BigInt(0);
  const hasStake = patron.mezoStaked > BigInt(0);

  const numDeposit = parseFloat(depositAmt) || 0;
  const numStake = parseFloat(stakeAmt) || 0;
  const numUnstake = parseFloat(unstakeAmt) || 0;
  const totalDepositedHuman = Number(formatUnits(patron.totalDeposited, MUSD_DECIMALS));
  const mezoStakedHuman = Number(formatUnits(patron.mezoStaked, MUSD_DECIMALS));

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
      setActionError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setDepositing(false);
    }
  }

  async function handleStake() {
    if (numStake < 1 || !address || !MEZO_ADDRESS || !TASKIFY_ADDRESS) return;
    setStaking(true);
    setActionError("");
    try {
      const raw = toRawMUSD(numStake);
      await ensureApproval(MEZO_ADDRESS, address, TASKIFY_ADDRESS, raw);
      await send("stakeMezo", [raw]);
      setStakeAmt("");
      await refetchPatron();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Stake failed");
    } finally {
      setStaking(false);
    }
  }

  async function handleUnstake() {
    if (numUnstake < 0.000001 || !address) return;
    setUnstaking(true);
    setActionError("");
    try {
      await send("unstakeMezo", [toRawMUSD(numUnstake)]);
      setUnstakeAmt("");
      await refetchPatron();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unstake failed");
    } finally {
      setUnstaking(false);
    }
  }

  async function handleVote(taskId: number, support: boolean) {
    setVotingTaskId(taskId);
    setActionError("");
    try {
      await send("voteOnGrant", [BigInt(taskId), support]);
      await refetchVotes();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVotingTaskId(null);
    }
  }

  async function handleExecute(taskId: number) {
    setExecutingTaskId(taskId);
    setActionError("");
    try {
      await send("executeGrant", [BigInt(taskId)]);
      await refetchVotes();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Execute failed");
    } finally {
      setExecutingTaskId(null);
    }
  }

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
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>{user.username || username || formatAddress(address ?? "")}</h1>
                <PatronTierBadge tier={currentTier.id} />
              </div>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                Voting weight: <strong style={{ color: "var(--success)" }}>{formatVotingWeight(weight)} units</strong>
                {!hasStake && <span style={{ marginLeft: 8, color: "var(--primary)", fontSize: 12 }}>— Stake MEZO to amplify</span>}
              </div>
            </div>
          </div>
        </div>

        {actionError && (
          <div style={{ fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 10, padding: "10px 14px", marginBottom: 24 }}>
            {actionError}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Total Deposited",    value: `${formatMUSD(totalDepositedHuman)} MUSD`, color: "var(--success)", icon: "💰" },
            { label: "MEZO Staked",         value: `${formatMUSD(mezoStakedHuman)} MEZO`,       color: "var(--secondary-light)", icon: "🔐" },
            { label: "Voting Weight",      value: `${formatVotingWeight(weight)} units`,             color: "var(--primary)", icon: "⚖️" },
            { label: "Active Grant Votes", value: String(grantTasks.length),                    color: "var(--blue)", icon: "🗳️" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]" style={{ gap: 32, alignItems: "start" }}>
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
                  const vote = votesById?.[task.id];
                  const total = vote ? vote.votesFor + vote.votesAgainst : BigInt(0);
                  const forPct = total > BigInt(0) ? Number((vote!.votesFor * BigInt(1000)) / total) / 10 : 0;
                  const passed = total > BigInt(0) && forPct >= GRANT_PASS_THRESHOLD;
                  const votingClosed = vote ? Math.floor(Date.now() / 1000) >= vote.deadline : false;
                  const isExecuted = vote?.executed ?? false;
                  const myVote = vote?.hasVoted ?? false;
                  const amountHuman = Number(formatUnits(task.amount, MUSD_DECIMALS));

                  return (
                    <div key={task.id} style={{ background: "var(--surface)", border: `1px solid ${passed ? "color-mix(in srgb, var(--success) 19%, transparent)" : "color-mix(in srgb, var(--secondary) 19%, transparent)"}`, borderRadius: 16, padding: 24 }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                            <Badge color="purple">Grant Request</Badge>
                            <Badge color="orange">{formatMUSD(amountHuman)} MUSD requested</Badge>
                            {votingClosed && passed && !isExecuted && <Badge color="green">✓ Threshold Reached</Badge>}
                            {isExecuted && <Badge color="green">✓ Executed</Badge>}
                          </div>
                          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>{task.title}</h3>
                        </div>
                        <Link href={`/tasks/${task.id}`} style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
                          View task →
                        </Link>
                      </div>

                      {/* Vote bar */}
                      {vote && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                            <span style={{ color: "var(--success)", fontWeight: 600 }}>For: {formatVotingWeight(vote.votesFor)} units</span>
                            <span style={{ color: "var(--danger)", fontWeight: 600 }}>Against: {formatVotingWeight(vote.votesAgainst)} units</span>
                          </div>
                          <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden", marginBottom: 6, display: "flex" }}>
                            {total > BigInt(0) && (
                              <>
                                <div style={{ height: "100%", background: "var(--success)", width: `${forPct}%`, transition: "width 0.3s" }} />
                                <div style={{ height: "100%", background: "var(--danger)", width: `${100 - forPct}%`, transition: "width 0.3s" }} />
                              </>
                            )}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-dim)" }}>
                            <span>{forPct.toFixed(1)}% support · {formatVotingWeight(total)} total weight</span>
                            <span style={{ color: passed ? "var(--success)" : "var(--text-dim)" }}>
                              {GRANT_PASS_THRESHOLD}% required {passed ? "✓" : ""}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {isExecuted ? (
                        <div style={{ background: "color-mix(in srgb, var(--success) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: "12px 16px", textAlign: "center", color: "var(--success)", fontWeight: 700, fontSize: 14 }}>
                          ✓ Grant executed
                        </div>
                      ) : votingClosed ? (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            disabled={executingTaskId === task.id}
                            onClick={() => handleExecute(task.id)}
                            style={{ flex: 1, background: "var(--success)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: executingTaskId === task.id ? "not-allowed" : "pointer", opacity: executingTaskId === task.id ? 0.7 : 1 }}>
                            {executingTaskId === task.id ? "Confirming…" : "⚡ Execute Grant"}
                          </button>
                        </div>
                      ) : (
                        <div>
                          {!canVote ? (
                            <div style={{ background: "var(--border)", borderRadius: 10, padding: "12px 16px", textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
                              Deposit MUSD or stake MEZO to unlock voting →
                            </div>
                          ) : myVote ? (
                            <div style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: "12px 16px", textAlign: "center", color: "var(--success)", fontWeight: 700, fontSize: 14 }}>
                              ✓ You voted · {formatVotingWeight(weight)} unit weight
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 10 }}>
                              <button
                                disabled={votingTaskId === task.id}
                                onClick={() => handleVote(task.id, true)}
                                style={{ flex: 1, background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: votingTaskId === task.id ? "not-allowed" : "pointer" }}>
                                ✓ Vote For
                              </button>
                              <button
                                disabled={votingTaskId === task.id}
                                onClick={() => handleVote(task.id, false)}
                                style={{ flex: 1, background: "color-mix(in srgb, var(--danger-strong) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger-strong) 19%, transparent)", color: "var(--danger)", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: votingTaskId === task.id ? "not-allowed" : "pointer" }}>
                                ✗ Vote Against
                              </button>
                            </div>
                          )}
                          {!myVote && canVote && (
                            <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", marginTop: 8 }}>
                              Your weight: <strong style={{ color: "var(--text)" }}>{formatVotingWeight(weight)} units</strong> · Deadline: {vote?.deadline ? new Date(vote.deadline * 1000).toLocaleDateString() : "—"}
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
                <span style={{ color: "var(--success)" }}>musd-deposited / 1e13</span>{" + "}
                <span style={{ color: "var(--secondary-light)" }}>mezo-staked / 1e14</span>
              </code>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <WeightRow label="MUSD deposited" value={`${formatMUSD(totalDepositedHuman)} MUSD`} color="var(--success)" />
                <WeightRow label="MEZO staked" value={`${formatMUSD(mezoStakedHuman)} MEZO`} color="var(--secondary-light)" />
                <div style={{ height: 1, background: "var(--border)" }} />
                <WeightRow label="Total weight" value={`${formatVotingWeight(weight)} units`} color="var(--primary)" bold />
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
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Deposit MUSD</div>
              <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 14 }}>
                Deposits are <strong style={{ color: "var(--text)" }}>permanent</strong> — this is ecosystem patronage, not a loan. Minimum 50 MUSD.
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

            {/* Stake MEZO */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--secondary-light)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Stake MEZO</div>
              <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 14 }}>
                Amplifies your grant voting weight. Always withdrawable — no lockup or slashing. Minimum 1 MEZO.
              </p>
              <input type="number" value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} placeholder="Amount in MEZO" min="1"
                style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "var(--text)", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--secondary-light) 25%, transparent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              <button disabled={numStake < 1 || staking} onClick={handleStake}
                style={{ width: "100%", background: numStake >= 1 ? "color-mix(in srgb, var(--secondary) 9%, transparent)" : "var(--border)", border: `1px solid ${numStake >= 1 ? "color-mix(in srgb, var(--secondary) 19%, transparent)" : "var(--border)"}`, color: numStake >= 1 ? "var(--secondary-light)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, cursor: numStake >= 1 ? "pointer" : "not-allowed", marginBottom: 10 }}>
                {staking ? "Staking…" : "Stake MEZO"}
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" value={unstakeAmt} onChange={e => setUnstakeAmt(e.target.value)} placeholder="Amount to unstake" min="0"
                  style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }} />
                <button disabled={!hasStake || numUnstake <= 0 || numUnstake > mezoStakedHuman || unstaking} onClick={handleUnstake}
                  style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, cursor: (hasStake && numUnstake > 0) ? "pointer" : "not-allowed", opacity: (!hasStake || numUnstake <= 0) ? 0.5 : 1 }}>
                  {unstaking ? "Unstaking…" : "Unstake"}
                </button>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
                Staked: <strong style={{ color: "var(--text)" }}>{formatMUSD(mezoStakedHuman)} MEZO</strong>
                {!hasStake && <span style={{ color: "var(--primary)", marginLeft: 6 }}>← Stake to amplify your vote</span>}
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
