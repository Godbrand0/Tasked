"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { TIERS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";

type FundingType = "self" | "grant";
type Currency = "USDX" | "STX";

const TASK_TOPICS = [
  "DeFi / Protocol",
  "NFT / Marketplace",
  "Infrastructure / Tooling",
  "Frontend / UI",
  "Smart Contracts / Clarity",
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

  const [fundingType, setFundingType] = useState<FundingType>("self");
  const [currency, setCurrency] = useState<Currency>("USDX");
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
  const [tags, setTags] = useState("");
  const [grantJustification, setGrantJustification] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fee = fundingType === "self" ? 0.03 : 0.05;
  const numAmount = parseFloat(amount) || 0;
  const feeAmt = numAmount * fee;
  const netAmt = numAmount - feeAmt;
  const valid = title.trim().length > 0 && numAmount >= 1 && expMin <= expMax && (fundingType === "self" || grantJustification.trim().length > 20);

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

  function handleSubmit() {
    if (!valid) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 2000);
  }

  // Gate: must be connected + registered as creator
  if (!connected || !isRegistered) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔐</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F0F0F5", marginBottom: 12 }}>Connect your wallet</h1>
          <p style={{ fontSize: 15, color: "#7070A0", lineHeight: 1.7, marginBottom: 28 }}>
            You need a connected Stacks wallet and a registered Tasked account to post a task.
          </p>
          <Link href="/register" style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 15, padding: "14px 32px", borderRadius: 12, textDecoration: "none", display: "inline-block" }}>
            Get Started →
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "creator") {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🧩</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F0F0F5", marginBottom: 12 }}>Creator access only</h1>
          <p style={{ fontSize: 15, color: "#7070A0", lineHeight: 1.7, marginBottom: 28 }}>
            Task posting is restricted to Creator accounts. Your current role is <strong style={{ color: "#F0F0F5" }}>{role}</strong>.
          </p>
          <Link href="/tasks" style={{ color: "#F7931A", fontSize: 14, textDecoration: "none" }}>← Browse bounties instead</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>{fundingType === "self" ? "🔒" : "🗳️"}</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#F0F0F5", marginBottom: 12 }}>
            {fundingType === "self" ? "Task posted & escrow locked!" : "Grant application submitted!"}
          </h1>
          <p style={{ fontSize: 15, color: "#7070A0", lineHeight: 1.7, marginBottom: 32 }}>
            {fundingType === "self"
              ? `${numAmount.toLocaleString()} ${currency} is now locked in the Tasked contract. Your task is live in the bounty board.`
              : "Your grant application enters a 3-day community voting period. Patrons will vote using their USDX + STX governance weight."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/tasks" style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 14, padding: "12px 24px", borderRadius: 10, textDecoration: "none" }}>
              View Bounty Board
            </Link>
            <Link href="/creator" style={{ background: "#FFFFFF0D", color: "#9090B0", fontWeight: 600, fontSize: 14, padding: "12px 24px", borderRadius: 10, textDecoration: "none", border: "1px solid #1E1E2A" }}>
              My Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 13, color: "#7070A0", marginBottom: 6 }}>
            <Link href="/creator" style={{ color: "#7070A0", textDecoration: "none" }}>My Dashboard</Link> → Post Task
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F0F0F5", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Post a Task</h1>
          <p style={{ fontSize: 15, color: "#7070A0", margin: 0 }}>Lock funds in escrow and match the right contributors on-chain.</p>
        </div>

        {/* Funding type toggle */}
        <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 6, display: "flex", gap: 4, marginBottom: 28 }}>
          {(["self", "grant"] as FundingType[]).map(type => (
            <button key={type} onClick={() => setFundingType(type)}
              style={{ flex: 1, background: fundingType === type ? "#F7931A" : "transparent", color: fundingType === type ? "#0A0A0F" : "#9090B0", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", transition: "all 0.15s" }}>
              {type === "self" ? "🔒 Self-Funded (3% fee)" : "🏛 Apply for Grant (5% fee)"}
            </button>
          ))}
        </div>

        {fundingType === "grant" && (
          <div style={{ background: "#5546FF0D", border: "1px solid #5546FF30", borderRadius: 12, padding: "14px 16px", marginBottom: 28, fontSize: 13, color: "#8B80FF", lineHeight: 1.7 }}>
            Grant tasks enter a <strong>3-day community voting period</strong>. Patrons vote using their USDX + STX stake weight. If approved, USDX from the patron pool funds the escrow automatically.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Title */}
          <Field label="Task Title" required>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Build Stacks DeFi Analytics Dashboard" maxLength={200}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#F7931A50")}
              onBlur={e => (e.target.style.borderColor = "#1E1E2A")} />
            <div style={{ fontSize: 12, color: "#50507080", marginTop: 4, textAlign: "right" }}>{title.length}/200</div>
          </Field>

          {/* Topic + Currency row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 16 }}>
            <Field label="Task Topic" required>
              <select value={topic} onChange={e => setTopic(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {TASK_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Payment Currency" required>
              <div style={{ display: "flex", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: 4, gap: 4 }}>
                {(["USDX", "STX"] as Currency[]).map(c => (
                  <button key={c} onClick={() => setCurrency(c)}
                    style={{ flex: 1, background: currency === c ? (c === "USDX" ? "#00D39520" : "#8B80FF20") : "transparent", color: currency === c ? (c === "USDX" ? "#00D395" : "#8B80FF") : "#7070A0", fontWeight: 700, fontSize: 13, padding: "8px 4px", borderRadius: 8, border: `1px solid ${currency === c ? (c === "USDX" ? "#00D39540" : "#8B80FF40") : "transparent"}`, cursor: "pointer" }}>
                    {c}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Description */}
          <Field label="Description" required>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe the task scope, deliverables, acceptance criteria, and any technical requirements..." rows={8}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7, minHeight: 160 }}
              onFocus={e => (e.target.style.borderColor = "#F7931A50")}
              onBlur={e => (e.target.style.borderColor = "#1E1E2A")} />
          </Field>

          {/* Grant justification */}
          {fundingType === "grant" && (
            <Field label="Why should this be grant-funded?" required hint="Explain the public good, ecosystem value, and why this can't be self-funded. Patrons use this to vote.">
              <textarea value={grantJustification} onChange={e => setGrantJustification(e.target.value)}
                placeholder="e.g. This open-source indexer would eliminate the need for every Stacks dApp to run its own node, saving the ecosystem $500–$2k/month per team..." rows={5}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }}
                onFocus={e => (e.target.style.borderColor = "#8B80FF50")}
                onBlur={e => (e.target.style.borderColor = "#1E1E2A")} />
              <div style={{ fontSize: 12, color: grantJustification.length < 20 ? "#F87171" : "#7070A0", marginTop: 4 }}>
                {grantJustification.length < 20 ? `${20 - grantJustification.length} more chars required` : "✓ Good"} · {grantJustification.length} chars
              </div>
            </Field>
          )}

          {/* Amount + fee breakdown */}
          <Field label={fundingType === "self" ? `Bounty Amount (${currency})` : `Requested Amount (${currency})`} required>
            <div style={{ position: "relative" }}>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500" min="1"
                style={{ ...inputStyle, paddingRight: 64 }}
                onFocus={e => (e.target.style.borderColor = "#F7931A50")}
                onBlur={e => (e.target.style.borderColor = "#1E1E2A")} />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: currency === "USDX" ? "#00D395" : "#8B80FF" }}>{currency}</span>
            </div>
            {numAmount >= 1 && (
              <div style={{ background: "#18181F", border: "1px solid #1E1E2A", borderRadius: 10, padding: "14px 16px", marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <Row label="Gross deposit" value={`${numAmount.toLocaleString()} ${currency}`} />
                <Row label={`Protocol fee (${fee * 100}%)`} value={`−${feeAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`} valueColor="#9090B0" />
                <div style={{ height: 1, background: "#1E1E2A" }} />
                <Row label="Contributor receives" value={`${netAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`} valueColor="#00D395" bold />
              </div>
            )}
          </Field>

          {/* GitHub issue link */}
          <Field label="GitHub Issue" hint="Paste a GitHub issue URL to auto-fill title and description">
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="#7070A0">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <input
                value={githubIssueUrl}
                onChange={e => handleGithubIssueLink(e.target.value)}
                placeholder="https://github.com/org/repo/issues/123"
                style={{ ...inputStyle, paddingLeft: 38, paddingRight: githubIssueFetching ? 40 : 14 }}
                onFocus={e => (e.target.style.borderColor = "#F7931A50")}
                onBlur={e => (e.target.style.borderColor = githubIssueData ? "#00D39550" : "#1E1E2A")}
              />
              {githubIssueFetching && (
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#7070A0" }}>…</div>
              )}
            </div>
            {githubIssueData && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "#00D395" }}>
                <span>✓ Linked to</span>
                <a href={githubIssueData.url} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#00D395", fontWeight: 600, textDecoration: "none" }}>
                  {githubIssueData.repo}#{githubIssueData.number}
                </a>
                <span style={{ color: "#7070A0" }}>— title & description filled in</span>
              </div>
            )}
            {githubIssueError && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#F87171" }}>{githubIssueError}</div>
            )}
          </Field>

          {/* Experience range */}
          <Field label="Experience Range" required>
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {(["min", "max"] as const).map(bound => (
                  <div key={bound}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#7070A0", marginBottom: 8 }}>{bound === "min" ? "Minimum tier" : "Maximum tier"}</div>
                    <select value={bound === "min" ? expMin : expMax}
                      onChange={e => bound === "min" ? setExpMin(Number(e.target.value)) : setExpMax(Number(e.target.value))}
                      style={{ width: "100%", background: "#18181F", border: "1px solid #1E1E2A", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#F0F0F5", outline: "none", cursor: "pointer" }}>
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
            {expMin > expMax && <div style={{ fontSize: 12, color: "#F87171", marginTop: 6 }}>Minimum must be ≤ maximum</div>}
          </Field>

          {/* Deadline — self-funded only */}
          {fundingType === "self" && (
            <Field label="Deadline" required hint="Date the work must be completed by">
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                style={{ ...inputStyle, colorScheme: "dark", cursor: "pointer" }}
                onFocus={e => (e.target.style.borderColor = "#F7931A50")}
                onBlur={e => (e.target.style.borderColor = "#1E1E2A")}
              />
            </Field>
          )}

          {/* Tags */}
          <Field label="Tags" hint="Comma separated — helps contributors search and filter">
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. React, Clarity, TypeScript"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#F7931A50")}
              onBlur={e => (e.target.style.borderColor = "#1E1E2A")} />
            {tags.trim() && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} style={{ background: "#FFFFFF0D", color: "#9090B0", border: "1px solid #1E1E2A", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>{t}</span>
                ))}
              </div>
            )}
          </Field>

          {/* Image upload */}
          <Field label="Attachments" hint="Up to 5 images — screenshots, mockups, diagrams (PNG, JPG, GIF)">
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            <div
              onClick={() => images.length < 5 && fileInputRef.current?.click()}
              style={{ border: "2px dashed #1E1E2A", borderRadius: 12, padding: "24px", textAlign: "center", cursor: images.length < 5 ? "pointer" : "default", transition: "border-color 0.15s", background: "#111116" }}
              onMouseEnter={e => { if (images.length < 5) (e.currentTarget as HTMLDivElement).style.borderColor = "#F7931A40"; }}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "#1E1E2A"}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🖼</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#9090B0" }}>
                {images.length < 5 ? "Click to upload images" : "Maximum 5 images reached"}
              </div>
              <div style={{ fontSize: 12, color: "#7070A0", marginTop: 4 }}>{images.length}/5 uploaded</div>
            </div>
            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 12 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #1E1E2A", aspectRatio: "1" }}>
                    <img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      onClick={() => removeImage(i)}
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#F87171", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          {/* Submit info */}
          <div style={{ background: "#F7931A0A", border: "1px solid #F7931A20", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#9090B0", lineHeight: 1.6 }}>
            {fundingType === "self"
              ? <>Your wallet will be prompted to transfer <strong style={{ color: "#F7931A" }}>{numAmount || "..."} {currency}</strong> into escrow via <code style={{ color: "#F7931A", fontSize: 11 }}>create-task</code>. A post-condition asserts the exact amount leaving your account.</>
              : <>Clicking <strong style={{ color: "#F0F0F5" }}>Submit Grant Application</strong> calls <code style={{ color: "#F7931A", fontSize: 11 }}>apply-for-grant</code>. No {currency} leaves your wallet — community patrons vote on whether to fund from the grant pool.</>}
          </div>

          <button disabled={!valid || submitting} onClick={handleSubmit}
            style={{ background: valid ? "#F7931A" : "#1E1E2A", color: valid ? "#0A0A0F" : "#50507088", fontWeight: 700, fontSize: 16, padding: "16px", borderRadius: 12, border: "none", cursor: valid ? "pointer" : "not-allowed", transition: "all 0.15s", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Submitting on-chain…" : fundingType === "self" ? `Lock ${numAmount || "..."} ${currency} & Post Task →` : "Submit Grant Application →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#111116",
  border: "1px solid #1E1E2A",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  color: "#F0F0F5",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#9090B0" }}>{label}</label>
        {required && <span style={{ color: "#F87171", fontSize: 12 }}>*</span>}
        {hint && <span style={{ fontSize: 12, color: "#50507080" }}>— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "#7070A0" }}>{label}</span>
      <span style={{ color: valueColor ?? "#F0F0F5", fontWeight: bold ? 700 : 600 }}>{value}</span>
    </div>
  );
}
