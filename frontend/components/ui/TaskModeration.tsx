"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { IconAlertTriangle } from "@/components/icons";
import { authedFetch } from "@/lib/authed-fetch";
import { useWallet } from "@/lib/wallet-context";
import { TASK_REASONS, CREATOR_REASONS, type ReportKind } from "@/lib/moderation-reasons";
import type { TaskModerationStatus } from "@/lib/use-moderation";

// Task-page pieces of moderation: the review/removed banner shown to a task's
// creator and to admins, and the Report button for everyone else.

const FIELD: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  fontSize: 14,
  padding: "10px 12px",
  fontFamily: "inherit",
};

/**
 * Banner above a task that is held for review or hidden. Its creator sees
 * what's happening; admins also get Approve / Remove buttons.
 */
export function ModerationBanner({ taskId, status, admin, onChange }: {
  taskId: number;
  status: TaskModerationStatus;
  admin: boolean;
  onChange: () => void;
}) {
  const { address } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "approve" | "hide") {
    if (action === "hide" && !window.confirm("Remove this task from Taskify? Its creator will be notified.")) return;
    setBusy(true);
    setError("");
    const res = await authedFetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, action, taskId }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError((await res?.json().catch(() => null))?.error ?? "Couldn't save that. Try again.");
      return;
    }
    onChange();
  }

  const adminButton = (label: string, action: "approve" | "hide") => (
    <Button size="sm" variant={action === "approve" ? "primary" : "outline"} disabled={busy} onClick={() => act(action)}>
      {label}
    </Button>
  );

  if (status === "live" || status === "approved") {
    if (!admin) return null;
    // Admins get a quick Remove on any live task.
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 16 }}>
        {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
        {adminButton("Remove from Taskify", "hide")}
      </div>
    );
  }

  const pending = status === "pending_review";
  return (
    <div role="status" style={{
      display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap",
      background: "color-mix(in srgb, var(--warning) 9%, transparent)",
      border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)",
      borderRadius: "var(--radius-sm)", padding: "14px 16px", marginBottom: 24,
    }}>
      <span style={{ color: "var(--warning)", marginTop: 2 }}><IconAlertTriangle size={18} /></span>
      <div style={{ flex: "1 1 260px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text)" }}>{pending ? "This task is being reviewed" : "This task was removed from Taskify"}</strong>
        <br />
        {pending
          ? "Something in it matched our content guidelines, so only you can see it until an admin reviews it. Most reviews take less than a day."
          : "It no longer appears on Taskify. Your reward is still locked in the contract: cancel the task to get it back."}
        {admin && (
          <> {" "}<Link href="/admin" style={{ color: "var(--primary)", textDecoration: "none" }}>Open admin page</Link></>
        )}
        {error && <div style={{ color: "var(--danger)", marginTop: 6 }}>{error}</div>}
      </div>
      {admin && (
        <div style={{ display: "flex", gap: 8 }}>
          {adminButton(pending ? "Approve" : "Restore", "approve")}
          {pending && adminButton("Remove", "hide")}
        </div>
      )}
    </div>
  );
}

/** Shown instead of the task to everyone except its creator and admins. */
export function ModeratedNotice({ status }: { status: "pending_review" | "hidden" }) {
  return (
    <div style={{ maxWidth: 520, margin: "100px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", color: "var(--text-faint)", marginBottom: 16 }}>
        <IconAlertTriangle size={40} />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
        {status === "hidden" ? "This task has been removed" : "This task is being reviewed"}
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 24 }}>
        {status === "hidden"
          ? "It broke Taskify's content guidelines and is no longer available."
          : "It'll be available once our team has checked it."}
      </p>
      <Button href="/tasks">Browse open tasks</Button>
    </div>
  );
}

/**
 * Report this task, or (for people who applied to or joined it) its creator
 * for not paying. Reports alert the admins; they don't hide anything.
 */
export function ReportButton({ taskId, canReportCreator }: { taskId: number; canReportCreator: boolean }) {
  const { address, connected, connect } = useWallet();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReportKind>("task");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const reasons: Record<string, string> = kind === "task" ? TASK_REASONS : CREATOR_REASONS;

  function close() {
    setOpen(false);
    setError("");
    if (sent) {
      setSent(false);
      setReason("");
      setDetails("");
    }
  }

  async function submit() {
    if (!reason) { setError("Pick a reason."); return; }
    if (reason === "other" && !details.trim()) { setError("Tell us what's wrong."); return; }
    setSending(true);
    setError("");
    const res = await authedFetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, address, kind, reason, details: details.trim() }),
    }).catch(() => null);
    setSending(false);
    if (!res?.ok) {
      setError((await res?.json().catch(() => null))?.error ?? "Couldn't send the report. Try again.");
      return;
    }
    setSent(true);
  }

  return (
    <>
      <button
        onClick={() => (connected ? setOpen(true) : connect())}
        aria-label="Report"
        title="Report"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, padding: "8px 12px", cursor: "pointer", flexShrink: 0 }}
      >
        <IconAlertTriangle size={14} /> Report
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
          onClick={close}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, boxShadow: "var(--shadow-sm)" }}>
            {sent ? (
              <>
                <h2 id="report-title" style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Thanks, we&apos;ve got it</h2>
                <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 20 }}>
                  Our team will look into this. We may hide the task or take action against the creator.
                </p>
                <Button onClick={close}>Done</Button>
              </>
            ) : (
              <>
                <h2 id="report-title" style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>Report</h2>

                {canReportCreator && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {(["task", "creator"] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => { setKind(k); setReason(""); setError(""); }}
                        aria-pressed={kind === k}
                        style={{ flex: 1, padding: "8px 10px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${kind === k ? "var(--primary)" : "var(--border)"}`, background: kind === k ? "color-mix(in srgb, var(--primary) 9%, transparent)" : "transparent", color: kind === k ? "var(--primary)" : "var(--text-muted)" }}
                      >
                        {k === "task" ? "This task" : "The creator"}
                      </button>
                    ))}
                  </div>
                )}

                <fieldset style={{ border: "none", padding: 0, margin: "0 0 14px" }}>
                  <legend style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>What&apos;s wrong?</legend>
                  {Object.entries(reasons).map(([value, label]) => (
                    <label key={value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 14, color: "var(--text)", cursor: "pointer" }}>
                      <input type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
                      {label}
                    </label>
                  ))}
                </fieldset>

                <label style={{ display: "block", fontSize: 13, color: "var(--text-dim)", marginBottom: 6 }} htmlFor="report-details">
                  Details {reason === "other" ? "" : "(optional)"}
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder={kind === "creator" ? "What was promised, and what happened?" : "Anything that helps us check it"}
                  style={{ ...FIELD, resize: "vertical", marginBottom: 14 }}
                />

                {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Button variant="outline" onClick={close}>Cancel</Button>
                  <Button onClick={submit} disabled={sending}>{sending ? "Sending…" : "Send report"}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
