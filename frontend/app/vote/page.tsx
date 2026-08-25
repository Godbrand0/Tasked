"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/Badge";
import { formatMUSD, MUSD_DECIMALS } from "@/lib/constants";
import { useWallet, formatAddress } from "@/lib/wallet-context";
import { formatVotingWeight, GRANT_PASS_THRESHOLD } from "@/lib/taskify";
import { useAllTasks, useGrantVotesBatch, useIsApprovedVoter, useTaskifyTx, useTaskifyUser, useVotingWeight } from "@/lib/use-taskify";
import { formatContractError } from "@/lib/errors";

// Where "get real voting weight" sends people to actually lock BTC or MEZO —
// Taskify no longer custodies anything for voting purposes, see
// VOTING_SYSTEM_REDESIGN.md.
const MEZO_EARN_URL = "https://mezo.org/earn";

export default function VotePage() {
  const { connected, isRegistered, username } = useWallet();
  const { address } = useAccount();
  const { send } = useTaskifyTx();

  const { user } = useTaskifyUser(address);
  const { data: allTasks } = useAllTasks();
  const grantTasks = (allTasks ?? []).filter(t => t.status === 8); // GRANT_PENDING
  const taskIds = grantTasks.map(t => t.id);
  const { data: votesById, refetch: refetchVotes } = useGrantVotesBatch(taskIds, address);

  // Non-binding "your voting power right now" preview — an actual vote uses
  // the specific proposal's own snapshotTimestamp (vote.myWeight below), not
  // this current-time read. See lib/use-taskify.ts's useVotingWeight.
  const nowTimestamp = useMemo(() => Math.floor(Date.now() / 1000), []);
  const { weight: currentWeight, refetch: refetchWeight } = useVotingWeight(address, nowTimestamp);
  // Pilot-phase voter whitelist — real veBTC weight alone isn't enough to
  // vote yet; the owner has to have explicitly approved the wallet too.
  // See Taskify.sol's approvedVoters/setApprovedVoters. Independent of role —
  // any registered wallet can be approved.
  const { isApproved } = useIsApprovedVoter(address);

  const [votingTaskId, setVotingTaskId] = useState<number | null>(null);
  const [executingTaskId, setExecutingTaskId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const canVote = currentWeight > BigInt(0) && isApproved;

  async function handleVote(taskId: number, support: boolean) {
    setVotingTaskId(taskId);
    setActionError("");
    try {
      await send("voteOnGrant", [BigInt(taskId), support]);
      await refetchVotes();
    } catch (err) {
      setActionError(formatContractError(err, "Vote failed"));
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
      setActionError(formatContractError(err, "Execute failed"));
    } finally {
      setExecutingTaskId(null);
    }
  }

  // Gate: must be a registered wallet — any role can be approved to vote.
  if (!connected || !isRegistered) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🗳️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Grant voting</h1>
          <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 28 }}>
            Connect your wallet and register to vote on grant applications, once approved. See{" "}
            <Link href="/support" style={{ color: "var(--primary)" }}>Support</Link> to deposit into the pool instead.
          </p>
          <Link href="/register" style={{ background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 15, padding: "14px 32px", borderRadius: 12, textDecoration: "none", display: "inline-block" }}>
            Register →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, var(--primary), var(--primary-strong))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🗳️</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 6px" }}>{user.username || username || formatAddress(address ?? "")}</h1>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                Voting power: <strong style={{ color: "var(--success)" }}>{formatVotingWeight(currentWeight)}</strong>
                {" "}<button onClick={() => refetchWeight()} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0 }}>refresh</button>
                {!canVote && !isApproved && (
                  <span style={{ marginLeft: 8, color: "var(--text-dim)", fontSize: 12 }}>— voting is pilot-only right now</span>
                )}
                {!canVote && isApproved && (
                  <a href={MEZO_EARN_URL} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: "var(--primary)", fontSize: 12, textDecoration: "none" }}>
                    — Lock BTC or MEZO on Mezo Earn to vote →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {actionError && (
          <div style={{ fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 10, padding: "10px 14px", marginBottom: 24 }}>
            {actionError}
          </div>
        )}

        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 20px" }}>Grant Applications</h2>

        {!canVote && !isApproved && (
          <div style={{ background: "var(--border)", borderRadius: 12, padding: "14px 16px", marginBottom: 24, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>
            Grant voting is limited to an approved pilot group of veBTC holders right now — reach out if you&apos;d like to be added.
          </div>
        )}
        {!canVote && isApproved && (
          <div style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", borderRadius: 12, padding: "14px 16px", marginBottom: 24, fontSize: 13, color: "var(--primary)", lineHeight: 1.6 }}>
            Voting weight comes from your veBTC/veMEZO position on{" "}
            <a href={MEZO_EARN_URL} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Mezo Earn</a>
            {" "}— lock BTC or MEZO there to vote on grant applications.
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
              // Weight as of *this proposal's* snapshotTimestamp — not
              // currentWeight, which can differ if the voter's veBTC
              // position changed after this proposal opened. This is the
              // actual value voteOnGrant will use.
              const myWeightForThisTask = vote?.myWeight ?? BigInt(0);
              const canVoteThisTask = myWeightForThisTask > BigInt(0) && isApproved;
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
                      {!canVoteThisTask ? (
                        <div style={{ background: "var(--border)", borderRadius: 10, padding: "12px 16px", textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
                          {!isApproved
                            ? "Voting is limited to an approved pilot group right now — reach out if you'd like to be added."
                            : currentWeight > BigInt(0)
                            ? "Your veBTC position was locked after this proposal opened — it doesn't carry weight here."
                            : "Lock BTC or MEZO on Mezo Earn to unlock voting →"}
                        </div>
                      ) : myVote ? (
                        <div style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: "12px 16px", textAlign: "center", color: "var(--success)", fontWeight: 700, fontSize: 14 }}>
                          ✓ You voted · {formatVotingWeight(myWeightForThisTask)} weight
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
                      {!myVote && canVoteThisTask && (
                        <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", marginTop: 8 }}>
                          Your weight: <strong style={{ color: "var(--text)" }}>{formatVotingWeight(myWeightForThisTask)}</strong> · Deadline: {vote?.deadline ? new Date(vote.deadline * 1000).toLocaleDateString() : "—"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Voting weight source */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Where Voting Weight Comes From</div>
          <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 16 }}>
            Taskify doesn&apos;t custody anything for governance. Voting weight is read live from your{" "}
            <strong style={{ color: "var(--text)" }}>veBTC</strong> position on{" "}
            <a href={MEZO_EARN_URL} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Mezo Earn</a>
            {" "}— lock BTC to mint veBTC, or pair it with a veMEZO lock via Mezo&apos;s Matching Market to boost your weight up to 5x.
            Each grant proposal fixes a snapshot when it opens, so weight acquired after a vote starts doesn&apos;t count toward it.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--text-dim)" }}>Your voting power now</span>
              <span style={{ color: "var(--primary)", fontWeight: 700 }}>{formatVotingWeight(currentWeight)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
