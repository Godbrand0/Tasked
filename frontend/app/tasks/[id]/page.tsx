"use client";

import { use, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Badge, TierRangeBadge, StatusBadge } from "@/components/ui/Badge";
import { MOCK_TASKS, MOCK_GRANT_VOTES } from "@/lib/mock";
import { formatUSDX, TIERS, TASK_STATUSES } from "@/lib/constants";

const LIFECYCLE = ["GRANT_PENDING", "OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "FUNDS_RELEASED"];

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const task = MOCK_TASKS.find((t) => t.id === Number(id));
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!task) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
        <Navbar />
        <div style={{ maxWidth: 600, margin: "100px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F0F0F5", marginBottom: 8 }}>Task not found</h1>
          <Link href="/tasks" style={{ color: "#F7931A", textDecoration: "none" }}>← Back to tasks</Link>
        </div>
      </div>
    );
  }

  const grantVote = MOCK_GRANT_VOTES[task.id];
  const statusInfo = TASK_STATUSES[task.status] ?? { label: task.status, color: "#9090B0" };
  const fee = task.fundingType === "self" ? task.amount * 0.03 : task.amount * 0.05;
  const netAmount = task.amount - fee;
  const minTier = TIERS.find((t) => t.id === task.experienceMin)!;
  const maxTier = TIERS.find((t) => t.id === task.experienceMax)!;

  const lifecycleIdx = LIFECYCLE.indexOf(task.status);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontSize: 13, color: "#7070A0" }}>
          <Link href="/tasks" style={{ color: "#7070A0", textDecoration: "none" }}>Tasks</Link>
          <span>/</span>
          <span style={{ color: "#F0F0F5" }}>#{task.id}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
          {/* Main content */}
          <div>
            {/* Title & status */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <StatusBadge status={task.status} />
              {task.fundingType === "grant" && <Badge color="purple">Grant-Funded</Badge>}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#F0F0F5", margin: "0 0 20px", lineHeight: 1.3, letterSpacing: "-0.02em" }}>{task.title}</h1>

            {/* Meta row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #F7931A, #5546FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>
                  {task.creatorUsername.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, color: "#9090B0" }}>Posted by <strong style={{ color: "#F0F0F5" }}>{task.creatorUsername}</strong></span>
              </div>
              <span style={{ color: "#2E2E3A" }}>·</span>
              <span style={{ fontSize: 13, color: "#7070A0" }}>Task #{task.id}</span>
              {task.applicantCount !== undefined && (
                <>
                  <span style={{ color: "#2E2E3A" }}>·</span>
                  <span style={{ fontSize: 13, color: "#7070A0" }}>{task.applicantCount} applicant{task.applicantCount !== 1 ? "s" : ""}</span>
                </>
              )}
            </div>

            {/* Description */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Description</div>
              <p style={{ fontSize: 15, color: "#C0C0D0", lineHeight: 1.8, margin: 0 }}>{task.description}</p>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Tags</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {task.tags.map((tag) => <Badge key={tag} color="gray">{tag}</Badge>)}
                </div>
              </div>
            )}

            {/* Task lifecycle */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Task Lifecycle</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {LIFECYCLE.map((state, i) => {
                  const done = i < lifecycleIdx;
                  const active = i === lifecycleIdx;
                  const pending = i > lifecycleIdx;
                  const s = TASK_STATUSES[state];
                  return (
                    <div key={state} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: i < LIFECYCLE.length - 1 ? "1px solid #1E1E2A" : "none" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: done ? "#00D395" : active ? "#F7931A" : "#1E1E2A", border: `2px solid ${done ? "#00D395" : active ? "#F7931A" : "#2E2E3A"}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: done ? "#00D395" : active ? "#F7931A" : "#50507088" }}>
                        {s?.label ?? state}
                      </span>
                      {active && <span style={{ fontSize: 11, fontWeight: 700, color: "#F7931A", background: "#F7931A18", padding: "2px 8px", borderRadius: 4, border: "1px solid #F7931A30" }}>CURRENT</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grant voting */}
            {grantVote && task.status === "GRANT_PENDING" && (
              <div style={{ background: "#111116", border: "1px solid #5546FF30", borderRadius: 14, padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8B80FF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Community Grant Vote</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#9090B0", marginBottom: 8 }}>
                    <span>For: <strong style={{ color: "#00D395" }}>{formatUSDX(grantVote.votesFor)} USDX</strong></span>
                    <span>Against: <strong style={{ color: "#F87171" }}>{formatUSDX(grantVote.votesAgainst)} USDX</strong></span>
                  </div>
                  <div style={{ height: 8, background: "#1E1E2A", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg, #00D395, #00D39580)", width: `${(grantVote.votesFor / (grantVote.votesFor + grantVote.votesAgainst)) * 100}%`, borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ flex: 1, background: "#00D39518", border: "1px solid #00D39530", color: "#00D395", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: "pointer" }}>Vote For</button>
                  <button style={{ flex: 1, background: "#EF444418", border: "1px solid #EF444430", color: "#F87171", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: "pointer" }}>Vote Against</button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Bounty details */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Bounty Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#7070A0", marginBottom: 4 }}>Total Escrow</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#F7931A" }}>{formatUSDX(task.amount)} <span style={{ fontSize: 14, fontWeight: 600 }}>USDX</span></div>
                </div>
                <div style={{ height: 1, background: "#1E1E2A" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#7070A0" }}>Contributor receives</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#00D395" }}>{formatUSDX(netAmount)} USDX</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#7070A0" }}>Protocol fee ({task.fundingType === "self" ? "3%" : "5%"})</span>
                  <span style={{ fontSize: 13, color: "#9090B0" }}>{formatUSDX(fee)} USDX</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#7070A0" }}>Funding type</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#F0F0F5" }}>{task.fundingType === "self" ? "Self-funded" : "Grant"}</span>
                </div>
              </div>
            </div>

            {/* Experience */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Experience Gate</div>
              <TierRangeBadge min={task.experienceMin} max={task.experienceMax} />
              <div style={{ marginTop: 14, fontSize: 13, color: "#7070A0", lineHeight: 1.6 }}>
                Contributors with <strong style={{ color: minTier.color }}>{minTier.label}</strong> to <strong style={{ color: maxTier.color }}>{maxTier.label}</strong> experience can apply. Enforced on-chain by the Clarity contract.
              </div>
            </div>

            {/* Apply CTA */}
            {task.status === "OPEN" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {applied ? (
                  <div style={{ background: "#00D39518", border: "1px solid #00D39530", borderRadius: 12, padding: "16px", textAlign: "center", color: "#00D395", fontWeight: 700, fontSize: 15 }}>
                    ✓ Application submitted on-chain
                  </div>
                ) : (
                  <button onClick={() => { setApplying(true); setTimeout(() => { setApplying(false); setApplied(true); }, 1500); }}
                    style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", opacity: applying ? 0.7 : 1 }}>
                    {applying ? "Submitting on-chain…" : "Apply for Task"}
                  </button>
                )}
                <p style={{ fontSize: 12, color: "#7070A0", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
                  Calls <code style={{ color: "#F7931A", fontSize: 11 }}>apply-for-task</code> on the Tasked contract. Experience verified on-chain.
                </p>
              </div>
            )}

            {task.status === "GRANT_PENDING" && (
              <div style={{ background: "#5546FF0D", border: "1px solid #5546FF30", borderRadius: 12, padding: 16, fontSize: 13, color: "#8B80FF", lineHeight: 1.6 }}>
                This task is pending community grant approval. Voting ends at block {grantVote?.deadline?.toLocaleString()}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
