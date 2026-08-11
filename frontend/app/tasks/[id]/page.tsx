"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatUnits } from "viem";
import Navbar from "@/components/Navbar";
import Avatar from "@/components/ui/Avatar";
import { Badge, TierRangeBadge, StatusBadge } from "@/components/ui/Badge";
import { formatMUSD, TIERS, TASK_STATUSES, MUSD_DECIMALS } from "@/lib/constants";
import { MUSD_ADDRESS, statusToString, formatVotingWeight } from "@/lib/taskify";
import {
  useGrantVote,
  useTaskApplicantAppliedAt,
  useTaskifyTask,
  useTaskifyTx,
  useTaskifyUser,
} from "@/lib/use-taskify";

function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const AVATAR_COLORS = ["#F7931A", "#5546FF", "#00D395", "#F87171", "#60A5FA", "#FFD700", "#8B80FF"];
function colorForAddress(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface LiveComment {
  id: string;
  author: string;
  avatarColor: string;
  body: string;
  createdAt: number;
  isCreator?: boolean;
  replyTo?: string | null;
}

interface LiveSubmission {
  address: string;
  author: string;
  avatarColor: string;
  proofUrl: string;
  createdAt: number;
  isWinner: boolean;
  payoutTxHash: string | null;
}

import { useWallet, formatAddress } from "@/lib/wallet-context";

const LIFECYCLE = ["GRANT_PENDING", "OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "FUNDS_RELEASED"];

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <TaskDetailPageInner params={params} />
    </Suspense>
  );
}

function TaskDetailPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const taskId = Number(id);
  const { role, connected, isRegistered, connect, address, xVerified, xHandle, linkX } = useWallet();
  const { send } = useTaskifyTx();

  const { task: onchainTask, isLoading: taskLoading, refetch: refetchTask } = useTaskifyTask(taskId);
  const { user: creatorUser } = useTaskifyUser(onchainTask?.creator);
  const assigneeAddr = onchainTask?.assignee && onchainTask.assignee !== "0x0000000000000000000000000000000000000000" ? onchainTask.assignee : undefined;
  const { user: assigneeUser } = useTaskifyUser(assigneeAddr);
  const { vote: grantVote, refetch: refetchGrantVote } = useGrantVote(taskId);
  const { applied: appliedOnchain, refetch: refetchApplied } = useTaskApplicantAppliedAt(taskId, address);

  const [offchainContent, setOffchainContent] = useState<{ description: string; tags: string[]; github_repo_url: string | null; grant_justification: string | null; images: string[] } | null>(null);
  useEffect(() => {
    fetch(`/api/task-content?taskId=${taskId}`)
      .then(res => res.json())
      .then((data: { content?: typeof offchainContent }) => setOffchainContent(data.content ?? null))
      .catch(() => {});
  }, [taskId]);

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionSaveError, setDescriptionSaveError] = useState("");

  async function saveDescription() {
    if (!descriptionDraft.trim()) return;
    setSavingDescription(true);
    setDescriptionSaveError("");
    try {
      const res = await fetch("/api/task-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          description: descriptionDraft.trim(),
          tags: offchainContent?.tags ?? [],
          githubRepoUrl: offchainContent?.github_repo_url ?? null,
          grantJustification: offchainContent?.grant_justification ?? null,
          images: offchainContent?.images ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save description");
      setOffchainContent(data.content);
      setEditingDescription(false);
    } catch (err) {
      setDescriptionSaveError(err instanceof Error ? err.message : "Failed to save description");
    } finally {
      setSavingDescription(false);
    }
  }

  const [workSubmission, setWorkSubmission] = useState<{ pr_url: string; issue_url: string | null } | null>(null);
  useEffect(() => {
    fetch(`/api/task-submission?taskId=${taskId}`)
      .then(res => res.json())
      .then((data: { submission?: typeof workSubmission }) => setWorkSubmission(data.submission ?? null))
      .catch(() => {});
  }, [taskId]);

  const [prUrl, setPrUrl] = useState("");
  const [issueUrl, setIssueUrl] = useState("");
  const [submitWorkError, setSubmitWorkError] = useState("");

  const [creatorAvatar, setCreatorAvatar] = useState("");
  useEffect(() => {
    if (!onchainTask?.creator) return;
    fetch(`/api/profile?address=${onchainTask.creator}`)
      .then(res => res.json())
      .then((data: { profile?: { github_avatar_url?: string; x_avatar_url?: string } }) =>
        setCreatorAvatar(data.profile?.github_avatar_url || data.profile?.x_avatar_url || "")
      )
      .catch(() => {});
  }, [onchainTask?.creator]);

  const [assigneeAvatar, setAssigneeAvatar] = useState("");
  useEffect(() => {
    if (!assigneeAddr) { setAssigneeAvatar(""); return; }
    fetch(`/api/profile?address=${assigneeAddr}`)
      .then(res => res.json())
      .then((data: { profile?: { github_avatar_url?: string; x_avatar_url?: string } }) =>
        setAssigneeAvatar(data.profile?.github_avatar_url || data.profile?.x_avatar_url || "")
      )
      .catch(() => {});
  }, [assigneeAddr]);

  const task = onchainTask
    ? {
        id: taskId,
        creator: onchainTask.creator,
        creatorUsername: creatorUser.username || formatAddress(onchainTask.creator),
        title: onchainTask.title,
        description: offchainContent?.description ?? "",
        amount: Number(formatUnits(onchainTask.amount, MUSD_DECIMALS)),
        token: (onchainTask.token.toLowerCase() === MUSD_ADDRESS.toLowerCase() ? "MUSD" : "MEZO") as "MUSD" | "MEZO",
        experienceMin: onchainTask.experienceMin,
        experienceMax: onchainTask.experienceMax,
        status: statusToString(onchainTask.status),
        fundingType: (onchainTask.fundingType === 1 ? "grant" : "self") as "self" | "grant",
        kind: (onchainTask.kind === 1 ? "community" : "development") as "development" | "community",
        maxWinners: onchainTask.maxWinners || undefined,
        assignee: onchainTask.assignee !== "0x0000000000000000000000000000000000000000" ? onchainTask.assignee : undefined,
        deadline: onchainTask.deadline,
        createdAt: onchainTask.createdAt,
        tags: offchainContent?.tags,
        images: offchainContent?.images,
        githubRepo: offchainContent?.github_repo_url ?? undefined,
        grantJustification: offchainContent?.grant_justification ?? undefined,
      }
    : undefined;

  const [motivation, setMotivation] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [txBusy, setTxBusy] = useState(false);
  const [txError, setTxError] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentError, setCommentError] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  useEffect(() => {
    if (!task) return;
    let cancelled = false;
    setCommentsLoading(true);
    fetch(`/api/comments?taskId=${task.id}`)
      .then(res => res.json())
      .then((data: { comments?: { id: string; author_address: string; body: string; reply_to: string | null; created_at: string }[] }) => {
        if (cancelled || !data.comments) return;
        setComments(data.comments.map(c => ({
          id: c.id,
          author: formatAddress(c.author_address),
          avatarColor: colorForAddress(c.author_address),
          body: c.body,
          createdAt: Math.floor(new Date(c.created_at).getTime() / 1000),
          isCreator: c.author_address.toLowerCase() === task.creator.toLowerCase(),
          replyTo: c.reply_to,
        })));
      })
      .catch(() => { if (!cancelled) setCommentError("Couldn't load comments."); })
      .finally(() => { if (!cancelled) setCommentsLoading(false); });
    return () => { cancelled = true; };
  }, [task?.id]);

  // Development-task applications (off-chain motivation text keyed to the
  // on-chain applyForTask event — see app/api/applications/route.ts).
  interface LiveApplication { id: string; address: string; author: string; avatarColor: string; motivation: string; createdAt: number }
  const [applications, setApplications] = useState<LiveApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  function loadApplications() {
    if (!task) return Promise.resolve();
    return fetch(`/api/applications?taskId=${task.id}`)
      .then(res => res.json())
      .then((data: { applications?: { id: string; applicant_address: string; motivation: string; created_at: string }[] }) => {
        if (!data.applications) return;
        setApplications(data.applications.map(a => ({
          id: a.id,
          address: a.applicant_address,
          author: formatAddress(a.applicant_address),
          avatarColor: colorForAddress(a.applicant_address),
          motivation: a.motivation,
          createdAt: Math.floor(new Date(a.created_at).getTime() / 1000),
        })));
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!task || task.kind !== "development") { setApplicationsLoading(false); return; }
    let cancelled = false;
    setApplicationsLoading(true);
    loadApplications().finally(() => { if (!cancelled) setApplicationsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, task?.kind]);

  // Community task state
  const [submissions, setSubmissions] = useState<LiveSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [proofUrl, setProofUrl] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [xConnecting, setXConnecting] = useState(false);
  const [xConnectError, setXConnectError] = useState("");
  const [selectedWinners, setSelectedWinners] = useState<Set<string>>(new Set());
  const [payingWinners, setPayingWinners] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (!task || task.kind !== "community") { setSubmissionsLoading(false); return; }
    let cancelled = false;
    setSubmissionsLoading(true);
    fetch(`/api/submissions?taskId=${task.id}`)
      .then(res => res.json())
      .then((data: { submissions?: { participant_address: string; proof_url: string; joined_at: string; is_winner: boolean; payout_tx_hash: string | null }[] }) => {
        if (cancelled || !data.submissions) return;
        setSubmissions(data.submissions.map(s => ({
          address: s.participant_address,
          author: formatAddress(s.participant_address),
          avatarColor: colorForAddress(s.participant_address),
          proofUrl: s.proof_url,
          createdAt: Math.floor(new Date(s.joined_at).getTime() / 1000),
          isWinner: s.is_winner,
          payoutTxHash: s.payout_tx_hash,
        })));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSubmissionsLoading(false); });
    return () => { cancelled = true; };
  }, [task?.id, task?.kind]);

  // Completes the X OAuth flow started from handleQuickXConnect below —
  // must stay above the `if (!task) return` guard: every hook in this
  // component has to run on every render regardless of whether task has
  // loaded yet, or the hook count changes between the loading and loaded
  // render and React throws (violates the rules of hooks).
  useEffect(() => {
    const handle = searchParams.get("x_handle");
    const avatar = searchParams.get("x_avatar");
    const error = searchParams.get("x_error");
    if (handle) {
      window.history.replaceState({}, "", `/tasks/${id}`);
      setXConnecting(true);
      setXConnectError("");
      linkX(handle, avatar ?? undefined).catch((err) => {
        setXConnectError(err instanceof Error ? err.message : "Failed to link X on-chain");
      }).finally(() => setXConnecting(false));
    }
    if (error) {
      window.history.replaceState({}, "", `/tasks/${id}`);
      setXConnectError("X connection failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, id]);

  function handleQuickXConnect() {
    setXConnectError("");
    window.location.href = `/api/auth/x?return_to=${encodeURIComponent(`/tasks/${id}`)}`;
  }

  if (!task) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 600, margin: "100px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{taskLoading ? "⏳" : "🔍"}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{taskLoading ? "Loading task…" : "Task not found"}</h1>
          {!taskLoading && <Link href="/tasks" style={{ color: "var(--primary)", textDecoration: "none" }}>← Back to tasks</Link>}
        </div>
      </div>
    );
  }

  const statusInfo = TASK_STATUSES[task.status] ?? { label: task.status, color: "var(--text-muted)" };
  const fee = task.fundingType === "self" ? task.amount * 0.03 : task.amount * 0.05;
  const netAmount = task.amount - fee;
  const minTier = TIERS.find(t => t.id === task.experienceMin)!;
  const maxTier = TIERS.find(t => t.id === task.experienceMax)!;
  const lifecycleIdx = LIFECYCLE.indexOf(task.status);
  const slotsUsed = applications.length;
  const slotsMax = 5; // hard cap at 5 per task
  const slotsLeft = Math.max(0, slotsMax - slotsUsed);

  const isContributor = role === "contributor";
  const isCreator = role === "creator";
  const isAssignee = Boolean(address && task.assignee && address.toLowerCase() === task.assignee.toLowerCase());
  const isTaskCreator = Boolean(address && address.toLowerCase() === task.creator.toLowerCase());
  const isCommunity = task.kind === "community";
  const maxWinners = task.maxWinners ?? 1;

  async function handleApply() {
    if (!motivation.trim() || !task || !address) return;
    setApplying(true);
    setApplyError("");
    try {
      await send("applyForTask", [BigInt(task.id)]);
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, address, motivation: motivation.trim(), creatorAddress: task.creator, taskTitle: task.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit application");
      await refetchApplied();
      await loadApplications();
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setApplying(false);
    }
  }

  function notifyServer(recipient: string, type: "task_assigned" | "work_submitted" | "funds_released") {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient,
        type,
        taskId,
        taskTitle: task?.title,
        actorAddress: address,
        amount: type === "funds_released" && task ? `${task.amount} MUSD` : undefined,
      }),
    }).catch(() => {});
  }

  async function handleAssign(applicant: string) {
    if (!task) return;
    setTxBusy(true);
    setTxError("");
    try {
      await send("assignTask", [BigInt(task.id), applicant as `0x${string}`]);
      notifyServer(applicant, "task_assigned");
      await refetchTask();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Failed to assign task");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleStartTask() {
    if (!task) return;
    setTxBusy(true);
    setTxError("");
    try {
      await send("startTask", [BigInt(task.id)]);
      await refetchTask();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Failed to start task");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleSubmitTask() {
    if (!task || !address || !prUrl.trim()) return;
    setTxBusy(true);
    setTxError("");
    setSubmitWorkError("");
    try {
      await send("submitTask", [BigInt(task.id)]);
      notifyServer(task.creator, "work_submitted");

      try {
        const res = await fetch("/api/task-submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task.id, address, prUrl: prUrl.trim(), issueUrl: issueUrl.trim() || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save submission links");
        setWorkSubmission(data.submission);
      } catch (err) {
        // Best-effort — the task is already marked Submitted on-chain
        // regardless of whether this off-chain write succeeds.
        setSubmitWorkError(err instanceof Error ? err.message : "Work submitted on-chain, but saving the PR/issue links failed.");
      }

      await refetchTask();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Failed to submit task");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleApproveRelease() {
    if (!task) return;
    setTxBusy(true);
    setTxError("");
    try {
      await send("approveAndRelease", [BigInt(task.id)]);
      if (task.assignee) notifyServer(task.assignee, "funds_released");
      await refetchTask();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Failed to release funds");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleCancelTask() {
    if (!task) return;
    setTxBusy(true);
    setTxError("");
    try {
      await send("cancelTask", [BigInt(task.id)]);
      await refetchTask();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Failed to cancel task");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleExecuteGrant() {
    if (!task) return;
    setTxBusy(true);
    setTxError("");
    try {
      await send("executeGrant", [BigInt(task.id)]);
      await refetchTask();
      await refetchGrantVote();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Failed to execute grant");
    } finally {
      setTxBusy(false);
    }
  }

  async function postComment(body: string, replyTo: string | null) {
    if (!task || !address) return;
    setCommentError("");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, address, body, replyTo, creatorAddress: task.creator, taskTitle: task.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post comment");
      const c = data.comment as { id: string; author_address: string; body: string; reply_to: string | null; created_at: string };
      setComments(prev => [...prev, {
        id: c.id,
        author: formatAddress(c.author_address),
        avatarColor: colorForAddress(c.author_address),
        body: c.body,
        createdAt: Math.floor(new Date(c.created_at).getTime() / 1000),
        isCreator: c.author_address.toLowerCase() === task.creator.toLowerCase(),
        replyTo: c.reply_to,
      }]);
      return true;
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment");
      return false;
    }
  }

  async function handleComment() {
    if (!comment.trim() || !connected) return;
    if (await postComment(comment.trim(), null)) setComment("");
  }

  async function handleReply(parentId: string) {
    if (!replyBody.trim() || !connected) return;
    if (await postComment(replyBody.trim(), parentId)) {
      setReplyBody("");
      setReplyingTo(null);
    }
  }

  async function handleJoinCommunity() {
    if (!proofUrl.trim() || !task || !address) return;
    setJoining(true);
    setJoinError("");
    try {
      await send("joinCommunityTask", [BigInt(task.id), proofUrl.trim()]);
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, address, proofUrl: proofUrl.trim(), creatorAddress: task.creator, taskTitle: task.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join");
      const s = data.submission as { participant_address: string; proof_url: string; joined_at: string; is_winner: boolean };
      setSubmissions(prev => [...prev, {
        address: s.participant_address,
        author: formatAddress(s.participant_address),
        avatarColor: colorForAddress(s.participant_address),
        proofUrl: s.proof_url,
        createdAt: Math.floor(new Date(s.joined_at).getTime() / 1000),
        isWinner: s.is_winner,
        payoutTxHash: null,
      }]);
      setJoined(true);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  function toggleWinner(participantAddress: string) {
    setSelectedWinners(prev => {
      const next = new Set(prev);
      if (next.has(participantAddress)) {
        next.delete(participantAddress);
      } else if (task && next.size < (task.maxWinners ?? 1)) {
        next.add(participantAddress);
      }
      return next;
    });
  }

  async function handlePayWinners() {
    if (selectedWinners.size === 0 || !task) return;
    setPayingWinners(true);
    setPayError("");
    try {
      const winners = Array.from(selectedWinners) as `0x${string}`[];
      const receipt = await send("selectWinners", [BigInt(task.id), winners]);
      const res = await fetch("/api/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, winners, txHash: receipt.transactionHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to record winners");
      const winnerSet = new Set((data.submissions as { participant_address: string }[]).map(s => s.participant_address));
      setSubmissions(prev => prev.map(s => winnerSet.has(s.address) ? { ...s, isWinner: true, payoutTxHash: receipt.transactionHash } : s));
      await refetchTask();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to record winners");
    } finally {
      setPayingWinners(false);
    }
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
              <Avatar src={creatorAvatar} alt={task.creatorUsername} size={26} fontSize={10} gradient="linear-gradient(135deg, var(--primary), var(--secondary))" />
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]" style={{ gap: 32, alignItems: "start" }}>
          {/* ── Left: Main content ── */}
          <div>
            {/* Description */}
            <Section title="Description">
              {editingDescription ? (
                <div>
                  <textarea
                    value={descriptionDraft}
                    onChange={e => setDescriptionDraft(e.target.value)}
                    rows={8}
                    style={{ width: "100%", fontSize: 14, fontFamily: "inherit", color: "var(--text)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, resize: "vertical" }}
                  />
                  {descriptionSaveError && (
                    <div style={{ color: "var(--danger, #d64545)", fontSize: 13, marginTop: 6 }}>{descriptionSaveError}</div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={saveDescription}
                      disabled={savingDescription || !descriptionDraft.trim()}
                      style={{ background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "none", cursor: savingDescription ? "default" : "pointer", opacity: savingDescription || !descriptionDraft.trim() ? 0.6 : 1 }}
                    >
                      {savingDescription ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => { setEditingDescription(false); setDescriptionSaveError(""); }}
                      style={{ background: "var(--neutral-tint)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : task.description ? (
                <div>
                  <div style={{ fontSize: 15, color: "var(--text-soft)", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                    {task.description}
                  </div>
                  {address?.toLowerCase() === task.creator.toLowerCase() && (
                    <button
                      onClick={() => { setDescriptionDraft(task.description); setEditingDescription(true); }}
                      style={{ marginTop: 10, background: "none", border: "none", color: "var(--primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
                    >
                      Edit description
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, color: "var(--text-dim)", fontStyle: "italic", marginBottom: address?.toLowerCase() === task.creator.toLowerCase() ? 10 : 0 }}>
                    No description was saved for this task.
                  </div>
                  {address?.toLowerCase() === task.creator.toLowerCase() && (
                    <button
                      onClick={() => { setDescriptionDraft(""); setEditingDescription(true); }}
                      style={{ background: "var(--neutral-tint)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer" }}
                    >
                      Add description
                    </button>
                  )}
                </div>
              )}
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
            {grantVote && task.status === "GRANT_PENDING" && (() => {
              const total = grantVote.votesFor + grantVote.votesAgainst;
              const supportPct = total > BigInt(0) ? Number((grantVote.votesFor * BigInt(1000)) / total) / 10 : 0;
              return (
                <Section title="Community Grant Vote">
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>For: {formatVotingWeight(grantVote.votesFor)} vote units</span>
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>Against: {formatVotingWeight(grantVote.votesAgainst)} vote units</span>
                    </div>
                    <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                      {total > BigInt(0) && (
                        <>
                          <div style={{ height: "100%", background: "var(--success)", width: `${supportPct}%` }} />
                          <div style={{ height: "100%", background: "var(--danger)", width: `${100 - supportPct}%` }} />
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
                      <span>{supportPct.toFixed(1)}% support</span>
                      <span>70% required to pass</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 4px", lineHeight: 1.6 }}>
                    Voting deadline: {formatTimestamp(grantVote.deadline)}. Only Patrons with MUSD deposited or MEZO staked can vote.
                  </p>
                </Section>
              );
            })()}

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
              <Section title={submissionsLoading ? "Participants" : `${submissions.length} Participant${submissions.length !== 1 ? "s" : ""}`}>
                {task.status === "FUNDS_RELEASED" && (
                  <div style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: "var(--success)", fontWeight: 600, textAlign: "center" }}>
                    ✓ {submissions.filter(s => s.isWinner).length} winner{submissions.filter(s => s.isWinner).length !== 1 ? "s" : ""} paid — escrow released and split on-chain
                  </div>
                )}
                {submissionsLoading ? (
                  <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>Loading participants…</div>
                ) : submissions.length === 0 ? (
                  <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>No one has joined yet. Share this task to get participants.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {submissions.map((s, i) => {
                      const isSelected = selectedWinners.has(s.address);
                      const canSelect = isCreator && task.status === "OPEN";
                      return (
                        <div key={s.address} style={{ display: "flex", gap: 14, paddingBottom: 20, marginBottom: 20, borderBottom: i < submissions.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                          {canSelect && (
                            <button
                              onClick={() => toggleWinner(s.address)}
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
                              {s.isWinner && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--success)", background: "color-mix(in srgb, var(--success) 9%, transparent)", padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)" }}>WINNER</span>
                              )}
                              {s.isWinner && s.payoutTxHash && (
                                <a
                                  href={`${process.env.NEXT_PUBLIC_MEZO_EXPLORER_URL ?? "https://explorer.test.mezo.org"}/tx/${s.payoutTxHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}
                                >
                                  View payout ↗
                                </a>
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

                {isCreator && task.status === "OPEN" && submissions.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                      {selectedWinners.size} / {maxWinners} selected
                    </div>
                    <button
                      disabled={selectedWinners.size === 0 || payingWinners}
                      onClick={handlePayWinners}
                      style={{ width: "100%", background: selectedWinners.size > 0 ? "var(--success)" : "var(--border)", color: selectedWinners.size > 0 ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: selectedWinners.size > 0 ? "pointer" : "not-allowed", opacity: payingWinners ? 0.7 : 1 }}>
                      {payingWinners ? "Recording winners…" : `Pay ${selectedWinners.size || ""} Winner${selectedWinners.size !== 1 ? "s" : ""} →`}
                    </button>
                    {payError && (
                      <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{payError}</div>
                    )}
                    <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                      Once on-chain, calls <code style={{ color: "var(--primary)", fontSize: 10 }}>selectWinners</code> — splits escrow evenly, pays everyone in one transaction.
                    </p>
                  </div>
                )}
              </Section>
            ) : (
              <>
              {isTaskCreator && (
              <Section title={applicationsLoading ? "Applications" : `${applications.length} Application${applications.length !== 1 ? "s" : ""}`}>
                {txError && (
                  <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>{txError}</div>
                )}
                {applicationsLoading ? (
                  <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>Loading applications…</div>
                ) : applications.length === 0 ? (
                  <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>No applications yet. Share this task to get visibility.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {applications.map((a, i) => (
                      <div key={a.id} style={{ display: "flex", gap: 14, paddingBottom: 20, marginBottom: 20, borderBottom: i < applications.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: a.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                          {a.author.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{a.author}</span>
                            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatTimestamp(a.createdAt)}</span>
                            {task.status === "OPEN" && isTaskCreator && (
                              <button
                                disabled={txBusy}
                                onClick={() => handleAssign(a.address)}
                                style={{ marginLeft: "auto", background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 700, fontSize: 12, padding: "4px 14px", borderRadius: 6, cursor: txBusy ? "not-allowed" : "pointer", opacity: txBusy ? 0.6 : 1 }}>
                                Assign →
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: 14, color: "var(--text-soft)", lineHeight: 1.7 }}>{a.motivation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
              )}
              {/* Comments — visible to creator, contributor, and visitors */}
              <Section title={commentsLoading ? "Comments" : `${comments.length} Comment${comments.length !== 1 ? "s" : ""}`}>
                {commentsLoading ? (
                  <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>Loading comments…</div>
                ) : comments.length === 0 && (
                  <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>No comments yet, be the first.</div>
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
                            {connected && isRegistered && (
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

                {connected && isRegistered ? (
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
                      {commentError && (
                        <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{commentError}</div>
                      )}
                    </div>
                  </div>
                ) : !connected || !isRegistered ? (
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
                    <button onClick={connect} style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Connect wallet</button> to join the discussion
                  </div>
                ) : null}
              </Section>
              </>
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
                    <SideCardTitle color="var(--primary)">Connect X to Join</SideCardTitle>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.6 }}>
                      Community tasks are gated to X-verified accounts.
                    </p>
                    <button onClick={handleQuickXConnect} disabled={xConnecting}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--text)", color: "var(--bg)", fontWeight: 700, fontSize: 13, padding: "10px 16px", borderRadius: 8, border: "none", cursor: xConnecting ? "not-allowed" : "pointer", opacity: xConnecting ? 0.7 : 1 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      {xConnecting ? "Connecting…" : "Continue with X"}
                    </button>
                    {xConnectError && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{xConnectError}</div>}
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
                          {joining ? "Submitting…" : "Join & Submit Proof →"}
                        </button>
                        {joinError && (
                          <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{joinError}</div>
                        )}
                        <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                          Once on-chain, calls <code style={{ color: "var(--primary)", fontSize: 10 }}>joinCommunityTask</code> — no experience gate.
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
                    {appliedOnchain ? (
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
                          {applying ? "Submitting…" : slotsLeft === 0 ? "No slots remaining" : "Apply →"}
                        </button>
                        {applyError && (
                          <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{applyError}</div>
                        )}
                        <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                          Once on-chain, calls <code style={{ color: "var(--primary)", fontSize: 10 }}>applyForTask</code> — experience gate verified on-chain.
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

            {/* Assignee — start / submit work */}
            {isAssignee && task.status === "ASSIGNED" && (
              <SideCard style={{ border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)" }}>
                <SideCardTitle color="var(--primary)">You're Assigned</SideCardTitle>
                <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14, lineHeight: 1.6 }}>
                  Mark this task as started once you begin work.
                </p>
                <button disabled={txBusy} onClick={handleStartTask} style={{ width: "100%", background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: txBusy ? "not-allowed" : "pointer", opacity: txBusy ? 0.7 : 1 }}>
                  {txBusy ? "Confirming…" : "Start Work →"}
                </button>
                {txError && <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{txError}</div>}
              </SideCard>
            )}
            {isAssignee && task.status === "IN_PROGRESS" && (
              <SideCard style={{ border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)" }}>
                <SideCardTitle color="var(--primary)">In Progress</SideCardTitle>
                <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14, lineHeight: 1.6 }}>
                  Link the PR you worked on so the creator can review it.
                </p>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  PR link <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="url"
                  value={prUrl}
                  onChange={e => setPrUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/123"
                  style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
                />
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  Issue link <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="url"
                  value={issueUrl}
                  onChange={e => setIssueUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/issues/45"
                  style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box", marginBottom: 14 }}
                />
                <button disabled={txBusy || !prUrl.trim()} onClick={handleSubmitTask} style={{ width: "100%", background: prUrl.trim() ? "var(--primary)" : "var(--border)", color: prUrl.trim() ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: (txBusy || !prUrl.trim()) ? "not-allowed" : "pointer", opacity: txBusy ? 0.7 : 1 }}>
                  {txBusy ? "Confirming…" : "Submit Work →"}
                </button>
                {txError && <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{txError}</div>}
                {submitWorkError && <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{submitWorkError}</div>}
              </SideCard>
            )}

            {/* Submitted — creator approve */}
            {task.status === "SUBMITTED" && isTaskCreator && (
              <SideCard style={{ border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)" }}>
                <SideCardTitle color="var(--success)">Work Submitted</SideCardTitle>
                <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14, lineHeight: 1.6 }}>
                  The contributor has marked their work as complete. Review and approve to release funds.
                </p>
                {workSubmission && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    <a href={workSubmission.pr_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--secondary-light)", textDecoration: "none", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 6 }}>
                      🔗 PR: {workSubmission.pr_url}
                    </a>
                    {workSubmission.issue_url && (
                      <a href={workSubmission.issue_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--secondary-light)", textDecoration: "none", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 6 }}>
                        🔗 Issue: {workSubmission.issue_url}
                      </a>
                    )}
                  </div>
                )}
                <button disabled={txBusy} onClick={handleApproveRelease} style={{ width: "100%", background: "var(--success)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, border: "none", cursor: txBusy ? "not-allowed" : "pointer", opacity: txBusy ? 0.7 : 1 }}>
                  {txBusy ? "Confirming…" : "Approve & Release Funds →"}
                </button>
                {txError && <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{txError}</div>}
              </SideCard>
            )}

            {/* Creator — cancel an open, self-funded task */}
            {task.status === "OPEN" && isTaskCreator && task.fundingType === "self" && (
              <SideCard>
                <SideCardTitle>Manage Task</SideCardTitle>
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.6 }}>
                  Cancel to refund the remaining escrow (minus the protocol fee) back to your wallet.
                </p>
                <button disabled={txBusy} onClick={handleCancelTask} style={{ width: "100%", background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, cursor: txBusy ? "not-allowed" : "pointer", opacity: txBusy ? 0.7 : 1 }}>
                  {txBusy ? "Confirming…" : "Cancel Task"}
                </button>
                {txError && <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{txError}</div>}
              </SideCard>
            )}

            {/* Grant pending info */}
            {task.status === "GRANT_PENDING" && (
              <SideCard style={{ border: "1px solid color-mix(in srgb, var(--secondary) 19%, transparent)" }}>
                <SideCardTitle color="var(--secondary-light)">Grant Pending</SideCardTitle>
                {grantVote && (() => {
                  const total = grantVote.votesFor + grantVote.votesAgainst;
                  const supportPct = total > BigInt(0) ? Number((grantVote.votesFor * BigInt(1000)) / total) / 10 : 0;
                  const votingClosed = Math.floor(Date.now() / 1000) >= grantVote.deadline;
                  const passed = total > BigInt(0) && supportPct >= 70;
                  return (
                    <>
                      <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, margin: "0 0 12px" }}>
                        Voting {votingClosed ? "ended" : "ends"} {formatTimestamp(grantVote.deadline)}. {total > BigInt(0) ? `${supportPct.toFixed(1)}% support (70% required).` : "No votes cast yet."}
                      </p>
                      {votingClosed && !grantVote.executed && (
                        <button disabled={txBusy} onClick={handleExecuteGrant} style={{ width: "100%", background: passed ? "var(--success)" : "var(--danger)", color: "var(--bg)", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, border: "none", cursor: txBusy ? "not-allowed" : "pointer", opacity: txBusy ? 0.7 : 1 }}>
                          {txBusy ? "Confirming…" : passed ? "Execute — Approve Grant →" : "Execute — Reject Grant →"}
                        </button>
                      )}
                      {grantVote.executed && (
                        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Vote executed.</div>
                      )}
                      {txError && <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{txError}</div>}
                    </>
                  );
                })()}
              </SideCard>
            )}

            {/* Assignee — development tasks only, once assigned */}
            {!isCommunity && assigneeAddr && (
              <SideCard>
                <SideCardTitle>Assigned To</SideCardTitle>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar src={assigneeAvatar} alt={assigneeUser.username || formatAddress(assigneeAddr)} size={36} fontSize={14} gradient="linear-gradient(135deg, var(--secondary-light), var(--secondary))" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{assigneeUser.username || formatAddress(assigneeAddr)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{isAssignee ? "You" : "Contributor"}</div>
                  </div>
                </div>
              </SideCard>
            )}

            {/* Creator */}
            <SideCard>
              <SideCardTitle>Creator</SideCardTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar src={creatorAvatar} alt={task.creatorUsername} size={36} fontSize={14} gradient="linear-gradient(135deg, var(--primary), var(--secondary))" />
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
