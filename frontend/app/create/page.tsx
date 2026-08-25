"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { TIERS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";
import { TASKIFY_ADDRESS, tokenAddress } from "@/lib/taskify";
import { extractTaskId, toRawMUSD, useApproveIfNeeded, useTaskifyTx } from "@/lib/use-taskify";
import { formatContractError } from "@/lib/errors";

type FundingType = "self" | "grant";
type Currency = "MUSD" | "MEZO";
type TaskKind = "development" | "community";

const TASK_TOPICS = [
  "DeFi / Protocol",
  "NFT / Marketplace",
  "Infrastructure / Tooling",
  "Frontend / UI",
  "Smart Contracts / Solidity",
  "Security / Audit",
  "Testing / QA",
  "Documentation",
  "Data / Analytics",
  "Other",
];

interface ImagePreview { name: string; url: string; size: number }

export default function CreatePage() {
  const router = useRouter();
  const { connected, isRegistered, role } = useWallet();
  const { address } = useAccount();
  const { ensureApproval } = useApproveIfNeeded();
  const { send } = useTaskifyTx();

  const [taskKind, setTaskKind] = useState<TaskKind>("development");
  const [fundingType, setFundingType] = useState<FundingType>("self");
  const [currency, setCurrency] = useState<Currency>("MUSD");

  // Grant-funded tasks are always paid out in MUSD from the patron pool —
  // applyForGrant() has no token param, so MEZO isn't a real option here.
  // Force it back to MUSD if MEZO was picked while self-funded.
  useEffect(() => {
    if (fundingType === "grant") setCurrency("MUSD");
  }, [fundingType]);
  const [maxWinners, setMaxWinners] = useState(5);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState(TASK_TOPICS[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [githubIssueUrl, setGithubIssueUrl] = useState("");
  const [githubIssueFetching, setGithubIssueFetching] = useState(false);
  const [githubIssueData, setGithubIssueData] = useState<{ number: number; repo: string; url: string } | null>(null);
  const [githubIssueError, setGithubIssueError] = useState("");
  const [expMin, setExpMin] = useState(0);
  const [expMax, setExpMax] = useState(4);
  const [deadline, setDeadline] = useState("");
  const [workDurationDays, setWorkDurationDays] = useState(14);
  const [tags, setTags] = useState("");
  const [grantJustification, setGrantJustification] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);
  const [descriptionSaveFailed, setDescriptionSaveFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fee = fundingType === "self" ? 0.03 : 0.05;
  const numAmount = parseFloat(amount) || 0;
  const feeAmt = numAmount * fee;
  const netAmt = numAmount - feeAmt;
  const perWinnerAmt = taskKind === "community" && maxWinners > 0 ? netAmt / maxWinners : netAmt;
  const valid =
    title.trim().length > 0 &&
    numAmount >= 1 &&
    (taskKind === "development"
      ? expMin <= expMax && (fundingType === "self" || grantJustification.trim().length > 20)
      : maxWinners >= 1 && maxWinners <= 20);

  function handleTaskKindChange(kind: TaskKind) {
    setTaskKind(kind);
    if (kind === "community") setFundingType("self"); // grant-funded community tasks aren't supported yet
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.slice(0, 5 - images.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setImages(prev => [...prev, { name: file.name, url: ev.target?.result as string, size: file.size }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleGithubIssueLink(url: string) {
    setGithubIssueUrl(url);
    setGithubIssueError("");
    setGithubIssueData(null);

    // Parse: https://github.com/{owner}/{repo}/issues/{number}
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (!match) return;

    const [, owner, repo, issueNumber] = match;
    setGithubIssueFetching(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`);
      if (!res.ok) throw new Error("Issue not found");
      const issue = await res.json();
      setTitle(issue.title ?? "");
      setDescription(issue.body ?? "");
      setGithubIssueData({ number: issue.number, repo: `${owner}/${repo}`, url: issue.html_url });
    } catch {
      setGithubIssueError("Could not fetch issue. Check the URL and make sure the repo is public.");
    } finally {
      setGithubIssueFetching(false);
    }
  }

  async function handleSubmit() {
    if (!valid || !address) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const token = tokenAddress(currency);
      if (!token || !TASKIFY_ADDRESS) throw new Error("Contract not configured");
      const deadlineTs = deadline ? Math.floor(new Date(deadline).getTime() / 1000) : 0;

      let taskId: number | undefined;

      if (fundingType === "grant") {
        const workDurationSeconds = BigInt(workDurationDays * 86400);
        const receipt = await send("applyForGrant", [title, toRawMUSD(numAmount), expMin, expMax, workDurationSeconds]);
        taskId = extractTaskId(receipt, "GrantApplied");
      } else {
        await ensureApproval(token, address, TASKIFY_ADDRESS, toRawMUSD(numAmount));
        if (taskKind === "community") {
          const receipt = await send("createCommunityTask", [title, toRawMUSD(numAmount), token, maxWinners, BigInt(deadlineTs)]);
          taskId = extractTaskId(receipt, "TaskCreated");
        } else {
          const receipt = await send("createTask", [title, toRawMUSD(numAmount), token, expMin, expMax, BigInt(deadlineTs)]);
          taskId = extractTaskId(receipt, "TaskCreated");
        }
      }

      setCreatedTaskId(taskId ?? null);

      // Best-effort — the task is already live on-chain regardless of
      // whether this off-chain write succeeds; a failure here just means
      // the task shows no description until edited/retried (the creator can
      // add it from the task page — see the "Edit description" affordance
      // in app/tasks/[id]/page.tsx).
      if (taskId !== undefined && description.trim()) {
        try {
          const res = await fetch("/api/task-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId,
              description: description.trim(),
              tags: tags.split(",").map(t => t.trim()).filter(Boolean),
              // githubIssueData only populates when the URL matches the
              // strict github.com/owner/repo/issues/N pattern (used to
              // auto-fetch title/description) — fall back to whatever raw
              // URL was typed so a link that doesn't match still gets saved.
              githubRepoUrl: githubIssueData?.url || githubIssueUrl.trim() || null,
              grantJustification: fundingType === "grant" ? grantJustification.trim() : null,
            }),
          });
          if (!res.ok) setDescriptionSaveFailed(true);
        } catch {
          setDescriptionSaveFailed(true);
        }
      } else if (taskId === undefined && description.trim()) {
        setDescriptionSaveFailed(true);
      }

      if (fundingType === "grant" && taskId !== undefined) {
        fetch("/api/notify-patrons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, taskTitle: title, amount: `${numAmount} MUSD`, creatorAddress: address }),
        }).catch(() => {});
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(formatContractError(err, "Transaction failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  // Gate: must be connected + registered as creator
  if (!connected || !isRegistered) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔐</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Connect your wallet</h1>
          <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 28 }}>
            You need a connected Ethereum wallet and a registered Taskify account to post a task.
          </p>
          <Link href="/register" style={{ background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 15, padding: "14px 32px", borderRadius: 12, textDecoration: "none", display: "inline-block" }}>
            Get Started →
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "creator") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🧩</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Owner access only</h1>
          <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 28 }}>
            Task posting is restricted to Owner accounts. Your current role is <strong style={{ color: "var(--text)" }}>{role}</strong>.
          </p>
          <Link href="/tasks" style={{ color: "var(--primary)", fontSize: 14, textDecoration: "none" }}>← Browse bounties instead</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>{taskKind === "community" ? "📣" : fundingType === "self" ? "🔒" : "🗳️"}</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>
            {taskKind === "community" ? "Community task is live!" : fundingType === "self" ? "Task posted & escrow locked!" : "Grant application submitted!"}
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 32 }}>
            {taskKind === "community"
              ? `${numAmount.toLocaleString()} ${currency} is locked in escrow, open for anyone to join. Pick up to ${maxWinners} winners from the submissions whenever you're ready.`
              : fundingType === "self"
              ? `${numAmount.toLocaleString()} ${currency} is now locked in the Taskify contract. Your task is live in the bounty board.`
              : "Your grant application enters a 3-day community voting period. Voting weight comes from patrons' veBTC position on Mezo Earn."}
          </p>
          {descriptionSaveFailed && (
            <div style={{ background: "var(--warning-tint, #fff3cd)", border: "1px solid var(--warning, #e0a100)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "var(--text-muted)", textAlign: "left" }}>
              Your task is live on-chain, but the description couldn&apos;t be saved. {createdTaskId !== null ? "Open the task and add it from there." : "Try adding it again from the task page once it appears in the bounty board."}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {createdTaskId !== null && (
              <Link href={`/tasks/${createdTaskId}`} style={{ background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px 24px", borderRadius: 10, textDecoration: "none" }}>
                View Your Task →
              </Link>
            )}
            <Link href="/tasks" style={{ background: createdTaskId !== null ? "var(--neutral-tint)" : "var(--primary)", color: createdTaskId !== null ? "var(--text-muted)" : "var(--bg)", fontWeight: createdTaskId !== null ? 600 : 700, fontSize: 14, padding: "12px 24px", borderRadius: 10, textDecoration: "none", border: createdTaskId !== null ? "1px solid var(--border)" : "none" }}>
              View Bounty Board
            </Link>
            <Link href="/creator" style={{ background: "var(--neutral-tint)", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, padding: "12px 24px", borderRadius: 10, textDecoration: "none", border: "1px solid var(--border)" }}>
              My Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 6 }}>
            <Link href="/creator" style={{ color: "var(--text-dim)", textDecoration: "none" }}>My Dashboard</Link> → Post Task
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Post a Task</h1>
          <p style={{ fontSize: 15, color: "var(--text-dim)", margin: 0 }}>Lock funds in escrow and match the right contributors on-chain.</p>
        </div>

        {/* Task kind toggle */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 6, display: "flex", gap: 4, marginBottom: 12 }}>
          {(["development", "community"] as TaskKind[]).map(kind => (
            <button key={kind} onClick={() => handleTaskKindChange(kind)}
              style={{ flex: 1, background: taskKind === kind ? "var(--secondary)" : "transparent", color: taskKind === kind ? "var(--text)" : "var(--text-muted)", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", transition: "all 0.15s" }}>
              {kind === "development" ? "💻 Development" : "📣 Community"}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 28 }}>
          {taskKind === "development"
            ? "One contributor applies, you assign them, they get paid on approval."
            : "Anyone can join with proof of participation — you pick up to N winners and the payout splits evenly between them."}
        </div>

        {/* Funding type toggle — grant-funded only supported for Development tasks */}
        {taskKind === "development" && (
          <>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 6, display: "flex", gap: 4, marginBottom: 28 }}>
              {(["self", "grant"] as FundingType[]).map(type => (
                <button key={type} onClick={() => setFundingType(type)}
                  style={{ flex: 1, background: fundingType === type ? "var(--primary)" : "transparent", color: fundingType === type ? "var(--bg)" : "var(--text-muted)", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", transition: "all 0.15s" }}>
                  {type === "self" ? "🔒 Self-Funded (3% fee)" : "🏛 Apply for Grant (5% fee)"}
                </button>
              ))}
            </div>

            {fundingType === "grant" && (
              <div style={{ background: "color-mix(in srgb, var(--secondary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--secondary) 19%, transparent)", borderRadius: 12, padding: "14px 16px", marginBottom: 28, fontSize: 13, color: "var(--secondary-light)", lineHeight: 1.7 }}>
                Grant tasks enter a <strong>3-day community voting period</strong>. Voting weight comes from patrons&apos; veBTC position on Mezo Earn, currently limited to an approved pilot group of veBTC holders. If approved, MUSD from the patron pool funds the escrow automatically.
              </div>
            )}
          </>
        )}

        {taskKind === "community" && (
          <div style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 13%, transparent)", borderRadius: 12, padding: "14px 16px", marginBottom: 28, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Community tasks are self-funded only (3% fee) — grant-funded community tasks aren't supported yet.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Title */}
          <Field label="Task Title" required hint="keep it small — one clear, bite-sized deliverable">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fix broken footer layout on mobile" maxLength={200}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--text-faint) 50%, transparent)", marginTop: 4, textAlign: "right" }}>{title.length}/200</div>
          </Field>

          {/* Topic + Currency row */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px]" style={{ gap: 16 }}>
            <Field label="Task Topic" required>
              <select value={topic} onChange={e => setTopic(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {TASK_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Payment Currency" required hint={fundingType === "grant" ? "Grant tasks pay out in MUSD from the patron pool" : undefined}>
              <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 4, gap: 4 }}>
                {(["MUSD", "MEZO"] as Currency[]).map(c => {
                  const disabled = fundingType === "grant" && c === "MEZO";
                  return (
                    <button key={c} disabled={disabled} onClick={() => setCurrency(c)}
                      style={{ flex: 1, background: currency === c ? (c === "MUSD" ? "color-mix(in srgb, var(--success) 13%, transparent)" : "color-mix(in srgb, var(--secondary-light) 13%, transparent)") : "transparent", color: disabled ? "color-mix(in srgb, var(--text-faint) 50%, transparent)" : currency === c ? (c === "MUSD" ? "var(--success)" : "var(--secondary-light)") : "var(--text-dim)", fontWeight: 700, fontSize: 13, padding: "8px 4px", borderRadius: 8, border: `1px solid ${currency === c ? (c === "MUSD" ? "color-mix(in srgb, var(--success) 25%, transparent)" : "color-mix(in srgb, var(--secondary-light) 25%, transparent)") : "transparent"}`, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          {/* Description */}
          <Field label="Description" required hint="scope it to a few hours–a couple of days of work">
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe the task scope, deliverables, acceptance criteria, and any technical requirements. Given the bounty size, keep this to a single well-defined fix or improvement — e.g. 'make the dashboard page responsive on mobile' — rather than an open-ended feature." rows={8}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7, minHeight: 160 }}
              onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")} />
          </Field>

          {/* Grant justification */}
          {fundingType === "grant" && (
            <Field label="Why should this be grant-funded?" required hint="Explain the public good, ecosystem value, and why this can't be self-funded. Patrons use this to vote.">
              <textarea value={grantJustification} onChange={e => setGrantJustification(e.target.value)}
                placeholder="e.g. This open-source indexer would eliminate the need for every Mezo dApp to run its own node, saving the ecosystem $500–$2k/month per team..." rows={5}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }}
                onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--secondary-light) 31%, transparent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              <div style={{ fontSize: 12, color: grantJustification.length < 20 ? "var(--danger)" : "var(--text-dim)", marginTop: 4 }}>
                {grantJustification.length < 20 ? `${20 - grantJustification.length} more chars required` : "✓ Good"} · {grantJustification.length} chars
              </div>
            </Field>
          )}

          {/* Amount + fee breakdown */}
          <Field label={fundingType === "self" ? `Bounty Amount (${currency})` : `Requested Amount (${currency})`} required>
            <div style={{ position: "relative" }}>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500" min="1"
                style={{ ...inputStyle, paddingRight: 64 }}
                onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: currency === "MUSD" ? "var(--success)" : "var(--secondary-light)" }}>{currency}</span>
            </div>
            {numAmount >= 1 && (
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <Row label="Gross deposit" value={`${numAmount.toLocaleString()} ${currency}`} />
                <Row label={`Protocol fee (${fee * 100}%)`} value={`−${feeAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`} valueColor="var(--text-muted)" />
                <div style={{ height: 1, background: "var(--border)" }} />
                <Row label="Contributor receives" value={`${netAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`} valueColor="var(--success)" bold />
              </div>
            )}
          </Field>

          {/* GitHub issue link — development tasks only */}
          {taskKind === "development" && (
            <Field label="GitHub Issue" hint="Paste a GitHub issue URL to auto-fill title and description">
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="var(--text-dim)">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <input
                  value={githubIssueUrl}
                  onChange={e => handleGithubIssueLink(e.target.value)}
                  placeholder="https://github.com/org/repo/issues/123"
                  style={{ ...inputStyle, paddingLeft: 38, paddingRight: githubIssueFetching ? 40 : 14 }}
                  onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                  onBlur={e => (e.target.style.borderColor = githubIssueData ? "color-mix(in srgb, var(--success) 31%, transparent)" : "var(--border)")}
                />
                {githubIssueFetching && (
                  <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-dim)" }}>…</div>
                )}
              </div>
              {githubIssueData && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "var(--success)" }}>
                  <span>✓ Linked to</span>
                  <a href={githubIssueData.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--success)", fontWeight: 600, textDecoration: "none" }}>
                    {githubIssueData.repo}#{githubIssueData.number}
                  </a>
                  <span style={{ color: "var(--text-dim)" }}>— title & description filled in</span>
                </div>
              )}
              {githubIssueError && (
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--danger)" }}>{githubIssueError}</div>
              )}
            </Field>
          )}

          {/* Experience range — development only */}
          {taskKind === "development" && (
            <Field label="Experience Range" required>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
                  {(["min", "max"] as const).map(bound => (
                    <div key={bound}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 8 }}>{bound === "min" ? "Minimum tier" : "Maximum tier"}</div>
                      <select value={bound === "min" ? expMin : expMax}
                        onChange={e => bound === "min" ? setExpMin(Number(e.target.value)) : setExpMax(Number(e.target.value))}
                        style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "var(--text)", outline: "none", cursor: "pointer" }}>
                        {TIERS.map(t => <option key={t.id} value={t.id} disabled={bound === "max" ? t.id < expMin : t.id > expMax}>{t.label} — {t.years}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {TIERS.filter(t => t.id >= expMin && t.id <= expMax).map(t => (
                    <span key={t.id} style={{ background: t.bg, color: t.color, border: `1px solid ${t.color}30`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{t.label}</span>
                  ))}
                </div>
              </div>
              {expMin > expMax && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>Minimum must be ≤ maximum</div>}
            </Field>
          )}

          {/* Number of winners — community only */}
          {taskKind === "community" && (
            <Field label="Number of Winners" required hint="Owner picks up to this many participants; payout splits evenly">
              <input type="number" value={maxWinners} onChange={e => setMaxWinners(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} min={1} max={20}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              {numAmount >= 1 && (
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
                  Each winner receives roughly <strong style={{ color: "var(--success)" }}>{perWinnerAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</strong> if all {maxWinners} slots are paid.
                </div>
              )}
            </Field>
          )}

          {/* Deadline — self-funded only */}
          {fundingType === "self" && (
            <Field label="Deadline" required hint="Date the work must be completed by">
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                style={{ ...inputStyle, colorScheme: "dark", cursor: "pointer" }}
                onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </Field>
          )}

          {/* Work duration — grant-funded only. The voting window is fixed
              at 3 days on-chain; this is separate — how long the creator
              gets to actually deliver *if* the grant is approved. */}
          {fundingType === "grant" && (
            <Field label="Time to Complete (if approved)" required hint="Starts counting from approval, not from today — the 3-day patron vote happens first">
              <select value={workDurationDays} onChange={e => setWorkDurationDays(Number(e.target.value))}
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--secondary-light) 31%, transparent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}>
                {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </Field>
          )}

          {/* Tags */}
          <Field label="Tags" hint="Comma separated — helps contributors search and filter">
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. React, Solidity, TypeScript"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            {tags.trim() && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} style={{ background: "var(--neutral-tint)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>{t}</span>
                ))}
              </div>
            )}
          </Field>

          {/* Image upload */}
          <Field label="Attachments" hint="Up to 5 images — screenshots, mockups, diagrams (PNG, JPG, GIF)">
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            <div
              onClick={() => images.length < 5 && fileInputRef.current?.click()}
              style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: "24px", textAlign: "center", cursor: images.length < 5 ? "pointer" : "default", transition: "border-color 0.15s", background: "var(--surface)" }}
              onMouseEnter={e => { if (images.length < 5) (e.currentTarget as HTMLDivElement).style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🖼</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>
                {images.length < 5 ? "Click to upload images" : "Maximum 5 images reached"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{images.length}/5 uploaded</div>
            </div>
            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 12 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "1" }}>
                    <img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      onClick={() => removeImage(i)}
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          {/* Submit info */}
          <div style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 13%, transparent)", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {taskKind === "community"
              ? <>Your wallet will be prompted to transfer <strong style={{ color: "var(--primary)" }}>{numAmount || "..."} {currency}</strong> into escrow via <code style={{ color: "var(--primary)", fontSize: 11 }}>createCommunityTask</code>. Anyone can join with a proof link; you'll pick up to {maxWinners} winners later via <code style={{ color: "var(--primary)", fontSize: 11 }}>selectWinners</code>, which pays everyone in one transaction.</>
              : fundingType === "self"
              ? <>Your wallet will be prompted to transfer <strong style={{ color: "var(--primary)" }}>{numAmount || "..."} {currency}</strong> into escrow via <code style={{ color: "var(--primary)", fontSize: 11 }}>createTask</code>. A post-condition asserts the exact amount leaving your account.</>
              : <>Clicking <strong style={{ color: "var(--text)" }}>Submit Grant Application</strong> calls <code style={{ color: "var(--primary)", fontSize: 11 }}>applyForGrant</code>. No {currency} leaves your wallet — community patrons vote on whether to fund from the grant pool.</>}
          </div>

          {submitError && (
            <div style={{ fontSize: 13, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 19%, transparent)", borderRadius: 10, padding: "10px 14px" }}>
              {submitError}
            </div>
          )}

          <button disabled={!valid || submitting} onClick={handleSubmit}
            style={{ background: valid ? "var(--primary)" : "var(--border)", color: valid ? "var(--bg)" : "color-mix(in srgb, var(--text-faint) 53%, transparent)", fontWeight: 700, fontSize: 16, padding: "16px", borderRadius: 12, border: "none", cursor: valid ? "pointer" : "not-allowed", transition: "all 0.15s", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Submitting on-chain…" : taskKind === "community" ? `Lock ${numAmount || "..."} ${currency} & Open to Community →` : fundingType === "self" ? `Lock ${numAmount || "..."} ${currency} & Post Task →` : "Submit Grant Application →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
        {required && <span style={{ color: "var(--danger)", fontSize: 12 }}>*</span>}
        {hint && <span style={{ fontSize: 12, color: "color-mix(in srgb, var(--text-faint) 50%, transparent)" }}>— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <span style={{ color: valueColor ?? "var(--text)", fontWeight: bold ? 700 : 600 }}>{value}</span>
    </div>
  );
}
