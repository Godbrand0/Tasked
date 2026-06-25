"use client";

import { use, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Badge, TierRangeBadge, StatusBadge } from "@/components/ui/Badge";
import { MOCK_TASKS, MOCK_GRANT_VOTES } from "@/lib/mock";
import { formatUSDX, TIERS, TASK_STATUSES } from "@/lib/constants";

// Stacks mainnet genesis: Jan 14 2021. ~600s per block.
function blockToDate(block: number): string {
  const genesis = 1610582400; // unix seconds
  const date = new Date((genesis + block * 600) * 1000);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
import { useWallet } from "@/lib/wallet-context";

const LIFECYCLE = ["GRANT_PENDING", "OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "FUNDS_RELEASED"];

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const task = MOCK_TASKS.find(t => t.id === Number(id));
  const { role, connected, isRegistered, connect } = useWallet();

  const [motivation, setMotivation] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(task?.comments ?? []);

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
  const minTier = TIERS.find(t => t.id === task.experienceMin)!;
  const maxTier = TIERS.find(t => t.id === task.experienceMax)!;
  const lifecycleIdx = LIFECYCLE.indexOf(task.status);
  const slotsUsed = task.applicantCount ?? 0;
  const slotsMax = 5; // hard cap at 5 per task
  const slotsLeft = Math.max(0, slotsMax - slotsUsed);

  const isContributor = role === "contributor";
  const isCreator = role === "creator";
  const canApply = isContributor && task.status === "OPEN" && !applied;

  function handleApply() {
    if (!motivation.trim()) return;
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      setApplied(true);
    }, 1600);
  }

  function handleComment() {
    if (!comment.trim() || !connected) return;
    const newComment = {
      id: comments.length + 100,
      author: "you",
      avatarColor: "#F7931A",
      body: comment.trim(),
      createdAt: 150999,
    };
    setComments(prev => [...prev, newComment]);
    setComment("");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontSize: 13, color: "#7070A0" }}>
          <Link href="/tasks" style={{ color: "#7070A0", textDecoration: "none" }}>Tasks</Link>
          <span>/</span>
          <span style={{ color: "#F0F0F5" }}>#{task.id} {task.title}</span>
        </div>

        {/* Status + title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <StatusBadge status={task.status} />
            {task.fundingType === "grant" && <Badge color="purple">Grant-Funded</Badge>}
            {task.token === "STX" && <Badge color="blue">Paid in STX</Badge>}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#F0F0F5", margin: "0 0 16px", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
            {task.title}
          </h1>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#7070A0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #F7931A, #5546FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>
                {task.creatorUsername.charAt(0).toUpperCase()}
              </div>
              <span>Posted by <strong style={{ color: "#F0F0F5" }}>{task.creatorUsername}</strong></span>
            </div>
            <span style={{ color: "#2E2E3A" }}>·</span>
            <span>Task #{task.id}</span>
            <span style={{ color: "#2E2E3A" }}>·</span>
            <span>{slotsUsed} applicant{slotsUsed !== 1 ? "s" : ""}</span>
            <span style={{ color: "#2E2E3A" }}>·</span>
            <span>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
            {task.githubRepo && (
              <>
                <span style={{ color: "#2E2E3A" }}>·</span>
                <a href={task.githubRepo} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, color: "#9090B0", textDecoration: "none" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  View on GitHub
                </a>
              </>
            )}
          </div>
        </div>

        {/* 2-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 32, alignItems: "start" }}>
          {/* ── Left: Main content ── */}
          <div>
            {/* Description */}
            <Section title="Description">
              <div style={{ fontSize: 15, color: "#C0C0D0", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                {task.description}
              </div>
            </Section>

            {/* Images */}
            {task.images && task.images.length > 0 && (
              <Section title="Attachments">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {task.images.map((url, i) => (
                    <img key={i} src={url} alt={`Attachment ${i + 1}`} style={{ width: "100%", borderRadius: 10, border: "1px solid #1E1E2A" }} />
                  ))}
                </div>
              </Section>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                {task.tags.map(tag => <Badge key={tag} color="gray">{tag}</Badge>)}
              </div>
            )}

            {/* Grant justification */}
            {task.fundingType === "grant" && task.grantJustification && (
              <Section title="Why Grant-Funded?">
                <div style={{ fontSize: 14, color: "#9090B0", lineHeight: 1.8, fontStyle: "italic" }}>
                  "{task.grantJustification}"
                </div>
              </Section>
            )}

            {/* Grant vote (inline) */}
            {grantVote && task.status === "GRANT_PENDING" && (
              <Section title="Community Grant Vote">
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "#00D395", fontWeight: 600 }}>For: {formatUSDX(grantVote.votesFor)} USDX-eq</span>
                    <span style={{ color: "#F87171", fontWeight: 600 }}>Against: {formatUSDX(grantVote.votesAgainst)} USDX-eq</span>
                  </div>
                  <div style={{ height: 8, background: "#1E1E2A", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg, #00D395, #00D39570)", width: `${Math.min(100, (grantVote.votesFor / (grantVote.votesFor + grantVote.votesAgainst)) * 100)}%`, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7070A0", marginTop: 6 }}>
                    <span>{((grantVote.votesFor / (grantVote.votesFor + grantVote.votesAgainst)) * 100).toFixed(1)}% support</span>
                    <span>Threshold: {formatUSDX(grantVote.threshold)} USDX-eq needed</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#7070A0", margin: "0 0 4px", lineHeight: 1.6 }}>
                  Voting deadline: block {grantVote.deadline.toLocaleString()}. Only Patrons with USDX deposited or STX staked can vote.
                </p>
              </Section>
            )}

            {/* Task Lifecycle */}
            <Section title="Task Lifecycle">
              <div style={{ display: "flex", flexDirection: "column" }}>
                {LIFECYCLE.map((state, i) => {
                  const done = i < lifecycleIdx;
                  const active = i === lifecycleIdx;
                  const s = TASK_STATUSES[state];
                  return (
                    <div key={state} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < LIFECYCLE.length - 1 ? "1px solid #1E1E2A" : "none" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: done ? "#00D395" : active ? "#F7931A" : "#1E1E2A", border: `2px solid ${done ? "#00D395" : active ? "#F7931A" : "#2E2E3A"}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: done ? "#00D395" : active ? "#F7931A" : "#50507070" }}>
                        {s?.label ?? state}
                      </span>
                      {active && <span style={{ fontSize: 10, fontWeight: 700, color: "#F7931A", background: "#F7931A18", padding: "2px 8px", borderRadius: 4, border: "1px solid #F7931A30" }}>CURRENT</span>}
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Creator: application comments with assign */}
            {isCreator ? (
              <Section title={`${comments.length} Application${comments.length !== 1 ? "s" : ""}`}>
                {comments.length === 0 ? (
                  <div style={{ fontSize: 14, color: "#7070A0", textAlign: "center", padding: "20px 0" }}>No applications yet. Share this task to get visibility.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {comments.map((c, i) => (
                      <div key={c.id} style={{ display: "flex", gap: 14, paddingBottom: 20, marginBottom: 20, borderBottom: i < comments.length - 1 ? "1px solid #1E1E2A" : "none" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                          {c.author.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>{c.author}</span>
                            <span style={{ fontSize: 12, color: "#7070A0" }}>{blockToDate(c.createdAt)}</span>
                            {task.status === "OPEN" && (
                              <button style={{ marginLeft: "auto", background: "#00D39518", border: "1px solid #00D39530", color: "#00D395", fontWeight: 700, fontSize: 12, padding: "4px 14px", borderRadius: 6, cursor: "pointer" }}>
                                Assign →
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: 14, color: "#C0C0D0", lineHeight: 1.7 }}>{c.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            ) : (
              /* Contributor + visitor: comment thread */
              <Section title={`${comments.length} Comment${comments.length !== 1 ? "s" : ""}`}>
                {comments.length === 0 && (
                  <div style={{ fontSize: 14, color: "#7070A0", textAlign: "center", padding: "20px 0" }}>No comments yet — be the first.</div>
                )}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {comments.map((c, i) => (
                    <div key={c.id} style={{ display: "flex", gap: 14, paddingBottom: 20, marginBottom: 20, borderBottom: i < comments.length - 1 ? "1px solid #1E1E2A" : "none" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                        {c.author.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>{c.author}</span>
                          {c.isCreator && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#F7931A", background: "#F7931A18", padding: "2px 8px", borderRadius: 4, border: "1px solid #F7931A30" }}>CREATOR</span>
                          )}
                          <span style={{ fontSize: 12, color: "#7070A0" }}>{blockToDate(c.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: 14, color: "#C0C0D0", lineHeight: 1.7 }}>{c.body}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {connected && isRegistered && isContributor ? (
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #8B80FF, #5546FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                      Y
                    </div>
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Leave a comment..."
                        rows={3}
                        style={{ width: "100%", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#F0F0F5", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", marginBottom: 8 }}
                        onFocus={e => (e.target.style.borderColor = "#8B80FF50")}
                        onBlur={e => (e.target.style.borderColor = "#1E1E2A")}
                      />
                      <button
                        disabled={!comment.trim()}
                        onClick={handleComment}
                        style={{ background: comment.trim() ? "#8B80FF" : "#1E1E2A", color: comment.trim() ? "#0A0A0F" : "#50507088", fontWeight: 700, fontSize: 13, padding: "8px 20px", borderRadius: 8, border: "none", cursor: comment.trim() ? "pointer" : "not-allowed" }}>
                        Comment
                      </button>
                    </div>
                  </div>
                ) : !connected || !isRegistered ? (
                  <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: 16, textAlign: "center", fontSize: 13, color: "#7070A0" }}>
                    <button onClick={connect} style={{ color: "#F7931A", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Connect wallet</button> to join the discussion
                  </div>
                ) : null}
              </Section>
            )}
          </div>

          {/* ── Right: Sidebar ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 80 }}>

            {/* Bounty details */}
            <SideCard>
              <SideCardTitle>Bounty</SideCardTitle>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#F7931A", marginBottom: 4 }}>
                {formatUSDX(task.amount)} <span style={{ fontSize: 15, fontWeight: 600, color: "#9090B0" }}>{task.token}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                <SideRow label="Contributor receives" value={`${formatUSDX(netAmount)} ${task.token}`} valueColor="#00D395" />
                <SideRow label={`Protocol fee (${task.fundingType === "self" ? "3" : "5"}%)`} value={`${formatUSDX(fee)} ${task.token}`} />
                <SideRow label="Funding type" value={task.fundingType === "self" ? "Self-funded" : "Community grant"} />
              </div>
            </SideCard>

            {/* Experience gate */}
            <SideCard>
              <SideCardTitle>Experience Gate</SideCardTitle>
              <TierRangeBadge min={task.experienceMin} max={task.experienceMax} />
              <p style={{ fontSize: 12, color: "#7070A0", lineHeight: 1.6, margin: "12px 0 0" }}>
                Tiers <strong style={{ color: minTier.color }}>{minTier.label}</strong> → <strong style={{ color: maxTier.color }}>{maxTier.label}</strong>. Verified on-chain by Clarity.
              </p>
            </SideCard>

            {/* Apply / Creator / Patron CTA */}
            {task.status === "OPEN" && (
              <>
                {!connected || !isRegistered ? (
                  <SideCard>
                    <SideCardTitle>Apply for this Bounty</SideCardTitle>
                    <p style={{ fontSize: 13, color: "#7070A0", marginBottom: 14, lineHeight: 1.6 }}>
                      Connect your wallet and register to apply for this task.
                    </p>
                    <button onClick={connect} style={{ width: "100%", background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                      Connect Wallet to Apply
                    </button>
                  </SideCard>
                ) : isContributor ? (
                  <SideCard style={{ border: "1px solid #F7931A30" }}>
                    <SideCardTitle color="#F7931A">Apply for this Bounty</SideCardTitle>
                    {/* Slot info — contributors only */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 10 }}>
                      <span style={{ color: "#7070A0" }}>{slotsUsed} / {slotsMax} applicants</span>
                      <span style={{ color: slotsLeft > 0 ? "#00D395" : "#F87171", fontWeight: 700 }}>
                        {slotsLeft > 0 ? `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left` : "Full"}
                      </span>
                    </div>
                    <div style={{ height: 4, background: "#1E1E2A", borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
                      <div style={{ height: "100%", background: slotsLeft > 0 ? "#00D395" : "#F87171", width: `${(slotsUsed / slotsMax) * 100}%`, borderRadius: 4 }} />
                    </div>
                    {applied ? (
                      <div style={{ background: "#00D39518", border: "1px solid #00D39530", borderRadius: 10, padding: 16, textAlign: "center", color: "#00D395", fontWeight: 700, fontSize: 14 }}>
                        ✓ Application submitted on-chain
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: "#7070A0", marginBottom: 12, lineHeight: 1.6 }}>
                          Describe your motivation and approach. This is published as a comment from your wallet address.
                        </p>
                        <textarea
                          value={motivation}
                          onChange={e => setMotivation(e.target.value)}
                          placeholder="I'm interested because... My approach would be..."
                          rows={4}
                          style={{ width: "100%", background: "#18181F", border: "1px solid #1E1E2A", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#F0F0F5", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", marginBottom: 10 }}
                          onFocus={e => (e.target.style.borderColor = "#F7931A50")}
                          onBlur={e => (e.target.style.borderColor = "#1E1E2A")}
                        />
                        <button
                          disabled={!motivation.trim() || applying || slotsLeft === 0}
                          onClick={handleApply}
                          style={{ width: "100%", background: (motivation.trim() && slotsLeft > 0) ? "#F7931A" : "#1E1E2A", color: (motivation.trim() && slotsLeft > 0) ? "#0A0A0F" : "#50507088", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: (motivation.trim() && slotsLeft > 0) ? "pointer" : "not-allowed", opacity: applying ? 0.7 : 1 }}>
                          {applying ? "Submitting on-chain…" : slotsLeft === 0 ? "No slots remaining" : "Apply →"}
                        </button>
                        <p style={{ fontSize: 11, color: "#7070A0", textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                          Calls <code style={{ color: "#F7931A", fontSize: 10 }}>apply-for-task</code> — experience gate verified on-chain.
                        </p>
                      </>
                    )}
                  </SideCard>
                ) : isCreator ? null : (
                  <SideCard>
                    <p style={{ fontSize: 13, color: "#7070A0", lineHeight: 1.6, margin: 0 }}>
                      Only contributors can apply to tasks. <Link href="/register" style={{ color: "#F7931A" }}>Register as a contributor</Link>.
                    </p>
                  </SideCard>
                )}
              </>
            )}

            {/* Submitted — creator approve */}
            {task.status === "SUBMITTED" && isCreator && (
              <SideCard style={{ border: "1px solid #00D39530" }}>
                <SideCardTitle color="#00D395">Work Submitted</SideCardTitle>
                <p style={{ fontSize: 13, color: "#7070A0", marginBottom: 14, lineHeight: 1.6 }}>
                  The contributor has marked their work as complete. Review and approve to release funds.
                </p>
                <button style={{ width: "100%", background: "#00D395", color: "#0A0A0F", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                  Approve & Release Funds →
                </button>
              </SideCard>
            )}

            {/* Grant pending info */}
            {task.status === "GRANT_PENDING" && (
              <SideCard style={{ border: "1px solid #5546FF30" }}>
                <SideCardTitle color="#8B80FF">Grant Pending</SideCardTitle>
                <p style={{ fontSize: 13, color: "#7070A0", lineHeight: 1.6, margin: 0 }}>
                  This task is awaiting community grant approval. Voting ends at block {grantVote?.deadline?.toLocaleString()}.
                  {grantVote && grantVote.votesFor >= grantVote.threshold && !grantVote.executed && (
                    <span style={{ display: "block", marginTop: 10, color: "#00D395", fontWeight: 600 }}>
                      ✓ Threshold reached — anyone can execute!
                    </span>
                  )}
                </p>
              </SideCard>
            )}

            {/* Creator */}
            <SideCard>
              <SideCardTitle>Creator</SideCardTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #F7931A, #5546FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white" }}>
                  {task.creatorUsername.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>{task.creatorUsername}</div>
                  <div style={{ fontSize: 12, color: "#7070A0" }}>Task creator</div>
                </div>
              </div>
            </SideCard>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#7070A0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function SideCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function SideCardTitle({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: color ?? "#7070A0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
      {children}
    </div>
  );
}

function SideRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #1E1E2A" }}>
      <span style={{ fontSize: 12, color: "#7070A0" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor ?? "#F0F0F5" }}>{value}</span>
    </div>
  );
}
