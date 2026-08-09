"use client";

import { use, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Badge, TierRangeBadge, StatusBadge } from "@/components/ui/Badge";
import { MOCK_TASKS, MOCK_GRANT_VOTES } from "@/lib/mock";
import { formatMUSD, TIERS, TASK_STATUSES } from "@/lib/constants";

function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
import { useWallet } from "@/lib/wallet-context";

const LIFECYCLE = ["GRANT_PENDING", "OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "FUNDS_RELEASED"];

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const task = MOCK_TASKS.find(t => t.id === Number(id));
  const { role, connected, isRegistered, connect, xVerified, xHandle, linkX } = useWallet();

  const [motivation, setMotivation] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(task?.comments ?? []);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");

  // Community task state
  const [submissions, setSubmissions] = useState(task?.submissions ?? []);
  const [proofUrl, setProofUrl] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [xHandleDraft, setXHandleDraft] = useState("");
  const [selectedWinners, setSelectedWinners] = useState<Set<string>>(new Set());
  const [payingWinners, setPayingWinners] = useState(false);
  const [winnersPaid, setWinnersPaid] = useState(false);

  if (!task) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 600, margin: "100px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Task not found</h1>
          <Link href="/tasks" style={{ color: "var(--primary)", textDecoration: "none" }}>← Back to tasks</Link>
        </div>
      </div>
    );
  }

  const grantVote = MOCK_GRANT_VOTES[task.id];
  const statusInfo = TASK_STATUSES[task.status] ?? { label: task.status, color: "var(--text-muted)" };
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
  const isCommunity = task.kind === "community";
  const canApply = isContributor && task.status === "OPEN" && !applied;
  const maxWinners = task.maxWinners ?? 1;

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
      avatarColor: "var(--primary)",
      body: comment.trim(),
      createdAt: Math.floor(Date.now() / 1000),
    };
    setComments(prev => [...prev, newComment]);
    setComment("");
  }

  function handleReply(parentId: number) {
    if (!replyBody.trim() || !connected) return;
    const newReply = {
      id: comments.length + 100,
      author: "you",
      avatarColor: "var(--primary)",
      body: replyBody.trim(),
      createdAt: Math.floor(Date.now() / 1000),
      replyTo: parentId,
    };
    setComments(prev => [...prev, newReply]);
    setReplyBody("");
    setReplyingTo(null);
  }

  function handleQuickLinkX() {
    if (!xHandleDraft.trim()) return;
    linkX(xHandleDraft.trim().replace(/^@/, ""));
  }

  function handleJoinCommunity() {
    if (!proofUrl.trim()) return;
    setJoining(true);
    setTimeout(() => {
      setSubmissions(prev => [...prev, {
        id: prev.length + 100,
        author: "you",
        avatarColor: "var(--primary)",
        proofUrl: proofUrl.trim(),
        createdAt: Math.floor(Date.now() / 1000),
      }]);
      setJoining(false);
      setJoined(true);
    }, 1200);
  }

  function toggleWinner(author: string) {
    setSelectedWinners(prev => {
      const next = new Set(prev);
      if (next.has(author)) {
        next.delete(author);
      } else if (task && next.size < (task.maxWinners ?? 1)) {
        next.add(author);
      }
      return next;
    });
  }

  function handlePayWinners() {
    if (selectedWinners.size === 0) return;
    setPayingWinners(true);
    setTimeout(() => {
      setPayingWinners(false);
      setWinnersPaid(true);
    }, 1600);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontSize: 13, color: "var(--text-dim)" }}>
          <Link href="/tasks" style={{ color: "var(--text-dim)", textDecoration: "none" }}>Tasks</Link>
          <span>/</span>
          <span style={{ color: "var(--text)" }}>#{task.id} {task.title}</span>
        </div>

        {/* Status + title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <StatusBadge status={task.status} />
            {isCommunity && <Badge color="blue">📣 Community</Badge>}
            {task.fundingType === "grant" && <Badge color="purple">Grant-Funded</Badge>}
            {task.token === "MEZO" && <Badge color="blue">Paid in MEZO</Badge>}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--text)", margin: "0 0 16px", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
            {task.title}
          </h1>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-dim)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>
                {task.creatorUsername.charAt(0).toUpperCase()}
              </div>
              <span>Posted by <strong style={{ color: "var(--text)" }}>{task.creatorUsername}</strong></span>
            </div>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <span>Task #{task.id}</span>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            {isCommunity ? (
              <span>{submissions.length} participant{submissions.length !== 1 ? "s" : ""}</span>
            ) : (
              <>
                <span>{slotsUsed} applicant{slotsUsed !== 1 ? "s" : ""}</span>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
              </>
            )}
            {task.githubRepo && (
              <>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <a href={task.githubRepo} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", textDecoration: "none" }}>
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
              <div style={{ fontSize: 15, color: "var(--text-soft)", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                {task.description}
              </div>
            </Section>

            {/* Images */}
            {task.images && task.images.length > 0 && (
              <Section title="Attachments">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {task.images.map((url, i) => (
                    <img key={i} src={url} alt={`Attachment ${i + 1}`} style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)" }} />
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
                <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8, fontStyle: "italic" }}>
                  "{task.grantJustification}"
                </div>
              </Section>
            )}

            {/* Grant vote (inline) */}
            {grantVote && task.status === "GRANT_PENDING" && (
              <Section title="Community Grant Vote">
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>For: {formatMUSD(grantVote.votesFor)} MUSD-eq</span>
                    <span style={{ color: "var(--danger)", fontWeight: 600 }}>Against: {formatMUSD(grantVote.votesAgainst)} MUSD-eq</span>
                  </div>
                  <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg, var(--success), color-mix(in srgb, var(--success) 44%, transparent))", width: `${Math.min(100, (grantVote.votesFor / (grantVote.votesFor + grantVote.votesAgainst)) * 100)}%`, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
                    <span>{((grantVote.votesFor / (grantVote.votesFor + grantVote.votesAgainst)) * 100).toFixed(1)}% support</span>
                    <span>Threshold: {formatMUSD(grantVote.threshold)} MUSD-eq needed</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 4px", lineHeight: 1.6 }}>
                  Voting deadline: {formatTimestamp(grantVote.deadline)}. Only Patrons with MUSD deposited or MEZO staked can vote.
                </p>
              </Section>
            )}

            {/* Task Lifecycle — community tasks skip the assign/start/submit chain */}
            {isCommunity ? (
              <Section title="How This Task Works">
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8 }}>
                  This is a <strong style={{ color: "var(--text)" }}>Community task</strong> — no application, no single assignee. Anyone joins with a proof link, and the creator pays up to <strong style={{ color: "var(--primary)" }}>{maxWinners} winner{maxWinners !== 1 ? "s" : ""}</strong> directly, splitting the escrow evenly between them in one transaction.
                </div>
              </Section>
            ) : (
              <Section title="Task Lifecycle">
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {LIFECYCLE.map((state, i) => {
                    const done = i < lifecycleIdx;
                    const active = i === lifecycleIdx;
                    const s = TASK_STATUSES[state];
                    return (
                      <div key={state} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < LIFECYCLE.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: done ? "var(--success)" : active ? "var(--primary)" : "var(--border)", border: `2px solid ${done ? "var(--success)" : active ? "var(--primary)" : "var(--border-strong)"}`, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: done ? "var(--success)" : active ? "var(--primary)" : "color-mix(in srgb, var(--text-faint) 44%, transparent)" }}>
                          {s?.label ?? state}
                        </span>
                        {active && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 9%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)" }}>CURRENT</span>}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Community: participants + winner selection */}
            {isCommunity ? (
              <Section title={`${submissions.length} Participant${submissions.length !== 1 ? "s" : ""}`}>
                {winnersPaid && (
                  <div style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: "var(--success)", fontWeight: 600, textAlign: "center" }}>
                    ✓ {selectedWinners.size} winner{selectedWinners.size !== 1 ? "s" : ""} paid — escrow released and split evenly
                  </div>
                )}
                {submissions.length === 0 ? (
                  <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>No one has joined yet. Share this task to get participants.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {submissions.map((s, i) => {
                      const isSelected = selectedWinners.has(s.author);
                      const canSelect = isCreator && task.status === "OPEN" && !winnersPaid;
                      return (
                        <div key={s.id} style={{ display: "flex", gap: 14, paddingBottom: 20, marginBottom: 20, borderBottom: i < submissions.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                          {canSelect && (
                            <button
                              onClick={() => toggleWinner(s.author)}
                              disabled={!isSelected && selectedWinners.size >= maxWinners}
                              style={{ width: 22, height: 22, borderRadius: 6, marginTop: 6, border: `2px solid ${isSelected ? "var(--success)" : "var(--border-strong)"}`, background: isSelected ? "var(--success)" : "transparent", cursor: (!isSelected && selectedWinners.size >= maxWinners) ? "not-allowed" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)", fontSize: 13, fontWeight: 800 }}>
                              {isSelected && "✓"}
                            </button>
                          )}
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: s.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                            {s.author.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{s.author}</span>
                              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatTimestamp(s.createdAt)}</span>
                              {winnersPaid && isSelected && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--success)", background: "color-mix(in srgb, var(--success) 9%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)" }}>WINNER</span>
                              )}
                            </div>
                            <a href={s.proofUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--secondary-light)", textDecoration: "none", wordBreak: "break-all" }}>
                              {s.proofUrl}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isCreator && task.status === "OPEN" && !winnersPaid && submissions.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                      {selectedWinners.size} / {maxWinners} selected
                    </div>
                    <button
                      disabled={selectedWinners.size === 0 || payingWinners}
                      onClick={handlePayWinners}
                      style={{ width: "100%", background: selectedWinners.size > 0 ? "var(--success)" : "var(--border)", color: selectedWinners.size > 0 ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: selectedWinners.size > 0 ? "pointer" : "not-allowed", opacity: payingWinners ? 0.7 : 1 }}>
                      {payingWinners ? "Paying winners on-chain…" : `Pay ${selectedWinners.size || ""} Winner${selectedWinners.size !== 1 ? "s" : ""} →`}
                    </button>
                    <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                      Calls <code style={{ color: "var(--primary)", fontSize: 10 }}>selectWinners</code> — splits escrow evenly, pays everyone in one transaction.
                    </p>
                  </div>
                )}
              </Section>
            ) : isCreator ? (
              <Section title={`${comments.length} Application${comments.length !== 1 ? "s" : ""}`}>
                {comments.length === 0 ? (
                  <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>No applications yet. Share this task to get visibility.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {comments.map((c, i) => (
                      <div key={c.id} style={{ display: "flex", gap: 14, paddingBottom: 20, marginBottom: 20, borderBottom: i < comments.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                          {c.author.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{c.author}</span>
                            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatTimestamp(c.createdAt)}</span>
                            {task.status === "OPEN" && (
                              <button style={{ marginLeft: "auto", background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 700, fontSize: 12, padding: "4px 14px", borderRadius: 6, cursor: "pointer" }}>
                                Assign →
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: 14, color: "var(--text-soft)", lineHeight: 1.7 }}>{c.body}</div>
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
                  <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>No comments yet — be the first.</div>
                )}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {comments.filter(c => !c.replyTo).map((c, i, topLevel) => {
                    const replies = comments.filter(r => r.replyTo === c.id);
                    return (
                      <div key={c.id} style={{ paddingBottom: 20, marginBottom: 20, borderBottom: i < topLevel.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ display: "flex", gap: 14 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                            {c.author.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{c.author}</span>
                              {c.isCreator && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 9%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)" }}>CREATOR</span>
                              )}
                              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatTimestamp(c.createdAt)}</span>
                            </div>
                            <div style={{ fontSize: 14, color: "var(--text-soft)", lineHeight: 1.7, marginBottom: 8 }}>{c.body}</div>
                            {connected && isRegistered && isContributor && (
                              <button
                                onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyBody(""); }}
                                style={{ background: "none", border: "none", color: replyingTo === c.id ? "var(--text)" : "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                                {replyingTo === c.id ? "Cancel" : "↳ Reply"}
                              </button>
                            )}

                            {replyingTo === c.id && (
                              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--secondary-light), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>
                                  Y
                                </div>
                                <div style={{ flex: 1 }}>
                                  <textarea
                                    value={replyBody}
                                    onChange={e => setReplyBody(e.target.value)}
                                    placeholder={`Replying to ${c.author}...`}
                                    rows={2}
                                    autoFocus
                                    style={{ width: "100%", background: "var(--bg-alt)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", marginBottom: 8 }}
                                    onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--secondary-light) 31%, transparent)")}
                                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                                  />
                                  <button
                                    disabled={!replyBody.trim()}
                                    onClick={() => handleReply(c.id)}
                                    style={{ background: replyBody.trim() ? "var(--secondary-light)" : "var(--border)", color: replyBody.trim() ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "none", cursor: replyBody.trim() ? "pointer" : "not-allowed" }}>
                                    Post Reply
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Replies — indented + left border links each reply visually to its parent */}
                            {replies.length > 0 && (
                              <div style={{ marginTop: 16, paddingLeft: 18, borderLeft: "2px solid var(--border)", display: "flex", flexDirection: "column", gap: 16 }}>
                                {replies.map(r => (
                                  <div key={r.id} style={{ display: "flex", gap: 10 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: r.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>
                                      {r.author.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{r.author}</span>
                                        {r.isCreator && (
                                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 9%, transparent)", padding: "1px 6px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)" }}>CREATOR</span>
                                        )}
                                        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>↳ replying to {c.author}</span>
                                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatTimestamp(r.createdAt)}</span>
                                      </div>
                                      <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>{r.body}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {connected && isRegistered && isContributor ? (
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--secondary-light), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                      Y
                    </div>
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Leave a comment..."
                        rows={3}
                        style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", marginBottom: 8 }}
                        onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--secondary-light) 31%, transparent)")}
                        onBlur={e => (e.target.style.borderColor = "var(--border)")}
                      />
                      <button
                        disabled={!comment.trim()}
                        onClick={handleComment}
                        style={{ background: comment.trim() ? "var(--secondary-light)" : "var(--border)", color: comment.trim() ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 13, padding: "8px 20px", borderRadius: 8, border: "none", cursor: comment.trim() ? "pointer" : "not-allowed" }}>
                        Comment
                      </button>
                    </div>
                  </div>
                ) : !connected || !isRegistered ? (
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
                    <button onClick={connect} style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Connect wallet</button> to join the discussion
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
              <div style={{ fontSize: 30, fontWeight: 800, color: "var(--primary)", marginBottom: 4 }}>
                {formatMUSD(task.amount)} <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)" }}>{task.token}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                {isCommunity ? (
                  <SideRow label={`Split between up to ${maxWinners} winners`} value={`~${formatMUSD(netAmount / maxWinners)} ${task.token} each`} valueColor="var(--success)" />
                ) : (
                  <SideRow label="Contributor receives" value={`${formatMUSD(netAmount)} ${task.token}`} valueColor="var(--success)" />
                )}
                <SideRow label={`Protocol fee (${task.fundingType === "self" ? "3" : "5"}%)`} value={`${formatMUSD(fee)} ${task.token}`} />
                <SideRow label="Funding type" value={task.fundingType === "self" ? "Self-funded" : "Community grant"} />
              </div>
            </SideCard>

            {/* Experience gate — development only */}
            {!isCommunity && (
              <SideCard>
                <SideCardTitle>Experience Gate</SideCardTitle>
                <TierRangeBadge min={task.experienceMin} max={task.experienceMax} />
                <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, margin: "12px 0 0" }}>
                  Tiers <strong style={{ color: minTier.color }}>{minTier.label}</strong> → <strong style={{ color: maxTier.color }}>{maxTier.label}</strong>. Verified on-chain.
                </p>
              </SideCard>
            )}

            {/* Community: join + submit proof — open to any registered role except the creator */}
            {isCommunity && task.status === "OPEN" && (
              <>
                {!connected || !isRegistered ? (
                  <SideCard>
                    <SideCardTitle>Join this Task</SideCardTitle>
                    <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14, lineHeight: 1.6 }}>
                      Connect your wallet and register to join — any role works, no experience tier required.
                    </p>
                    <button onClick={connect} style={{ width: "100%", background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                      Connect Wallet to Join
                    </button>
                  </SideCard>
                ) : isCreator ? null : !xVerified ? (
                  <SideCard style={{ border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)" }}>
                    <SideCardTitle color="var(--primary)">Link X to Join</SideCardTitle>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.6 }}>
                      Community tasks are gated to X-linked accounts. Self-declared for now — link it here to join.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={xHandleDraft} onChange={e => setXHandleDraft(e.target.value)} placeholder="@yourhandle"
                        style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
                        onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                        onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                      <button onClick={handleQuickLinkX} disabled={!xHandleDraft.trim()}
                        style={{ background: xHandleDraft.trim() ? "var(--text)" : "var(--border)", color: xHandleDraft.trim() ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 13, padding: "10px 16px", borderRadius: 8, border: "none", cursor: xHandleDraft.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                        Link
                      </button>
                    </div>
                  </SideCard>
                ) : (
                  <SideCard style={{ border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)" }}>
                    <SideCardTitle color="var(--primary)">Join this Task</SideCardTitle>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 12, color: "var(--success)" }}>
                      <span>✓ X linked as @{xHandle}</span>
                    </div>
                    {joined ? (
                      <div style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: 16, textAlign: "center", color: "var(--success)", fontWeight: 700, fontSize: 14 }}>
                        ✓ Joined — proof submitted on-chain
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.6 }}>
                          Paste a link proving your participation (a post, a write-up, anything public). The creator reviews it before picking winners.
                        </p>
                        <input
                          value={proofUrl}
                          onChange={e => setProofUrl(e.target.value)}
                          placeholder="https://x.com/you/status/..."
                          style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                          onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                          onBlur={e => (e.target.style.borderColor = "var(--border)")}
                        />
                        <button
                          disabled={!proofUrl.trim() || joining}
                          onClick={handleJoinCommunity}
                          style={{ width: "100%", background: proofUrl.trim() ? "var(--primary)" : "var(--border)", color: proofUrl.trim() ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: proofUrl.trim() ? "pointer" : "not-allowed", opacity: joining ? 0.7 : 1 }}>
                          {joining ? "Submitting on-chain…" : "Join & Submit Proof →"}
                        </button>
                        <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                          Calls <code style={{ color: "var(--primary)", fontSize: 10 }}>joinCommunityTask</code> — no experience gate.
                        </p>
                      </>
                    )}
                  </SideCard>
                )}
              </>
            )}

            {/* Apply / Creator / Patron CTA — development only */}
            {!isCommunity && task.status === "OPEN" && (
              <>
                {!connected || !isRegistered ? (
                  <SideCard>
                    <SideCardTitle>Apply for this Bounty</SideCardTitle>
                    <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14, lineHeight: 1.6 }}>
                      Connect your wallet and register to apply for this task.
                    </p>
                    <button onClick={connect} style={{ width: "100%", background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                      Connect Wallet to Apply
                    </button>
                  </SideCard>
                ) : isContributor ? (
                  <SideCard style={{ border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)" }}>
                    <SideCardTitle color="var(--primary)">Apply for this Bounty</SideCardTitle>
                    {/* Slot info — contributors only */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 10 }}>
                      <span style={{ color: "var(--text-dim)" }}>{slotsUsed} / {slotsMax} applicants</span>
                      <span style={{ color: slotsLeft > 0 ? "var(--success)" : "var(--danger)", fontWeight: 700 }}>
                        {slotsLeft > 0 ? `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left` : "Full"}
                      </span>
                    </div>
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
                      <div style={{ height: "100%", background: slotsLeft > 0 ? "var(--success)" : "var(--danger)", width: `${(slotsUsed / slotsMax) * 100}%`, borderRadius: 4 }} />
                    </div>
                    {applied ? (
                      <div style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: 16, textAlign: "center", color: "var(--success)", fontWeight: 700, fontSize: 14 }}>
                        ✓ Application submitted on-chain
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.6 }}>
                          Describe your motivation and approach. This is published as a comment from your wallet address.
                        </p>
                        <textarea
                          value={motivation}
                          onChange={e => setMotivation(e.target.value)}
                          placeholder="I'm interested because... My approach would be..."
                          rows={4}
                          style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", marginBottom: 10 }}
                          onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                          onBlur={e => (e.target.style.borderColor = "var(--border)")}
                        />
                        <button
                          disabled={!motivation.trim() || applying || slotsLeft === 0}
                          onClick={handleApply}
                          style={{ width: "100%", background: (motivation.trim() && slotsLeft > 0) ? "var(--primary)" : "var(--border)", color: (motivation.trim() && slotsLeft > 0) ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: (motivation.trim() && slotsLeft > 0) ? "pointer" : "not-allowed", opacity: applying ? 0.7 : 1 }}>
                          {applying ? "Submitting on-chain…" : slotsLeft === 0 ? "No slots remaining" : "Apply →"}
                        </button>
                        <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                          Calls <code style={{ color: "var(--primary)", fontSize: 10 }}>applyForTask</code> — experience gate verified on-chain.
                        </p>
                      </>
                    )}
                  </SideCard>
                ) : isCreator ? null : (
                  <SideCard>
                    <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
                      Only contributors can apply to tasks. <Link href="/register" style={{ color: "var(--primary)" }}>Register as a contributor</Link>.
                    </p>
                  </SideCard>
                )}
              </>
            )}

            {/* Submitted — creator approve */}
            {task.status === "SUBMITTED" && isCreator && (
              <SideCard style={{ border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)" }}>
                <SideCardTitle color="var(--success)">Work Submitted</SideCardTitle>
                <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14, lineHeight: 1.6 }}>
                  The contributor has marked their work as complete. Review and approve to release funds.
                </p>
                <button style={{ width: "100%", background: "var(--success)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                  Approve & Release Funds →
                </button>
              </SideCard>
            )}

            {/* Grant pending info */}
            {task.status === "GRANT_PENDING" && (
              <SideCard style={{ border: "1px solid color-mix(in srgb, var(--secondary) 19%, transparent)" }}>
                <SideCardTitle color="var(--secondary-light)">Grant Pending</SideCardTitle>
                <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
                  This task is awaiting community grant approval. Voting ends {grantVote?.deadline ? formatTimestamp(grantVote.deadline) : "soon"}.
                  {grantVote && grantVote.votesFor >= grantVote.threshold && !grantVote.executed && (
                    <span style={{ display: "block", marginTop: 10, color: "var(--success)", fontWeight: 600 }}>
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
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white" }}>
                  {task.creatorUsername.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{task.creatorUsername}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Task creator</div>
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
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function SideCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function SideCardTitle({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: color ?? "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
      {children}
    </div>
  );
}

function SideRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor ?? "var(--text)" }}>{value}</span>
    </div>
  );
}
