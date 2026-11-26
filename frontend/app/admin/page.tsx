"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell, { Container } from "@/components/ui/PageShell";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Address from "@/components/ui/Address";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import { IconLock, IconCheck } from "@/components/icons";
import { useWallet } from "@/lib/wallet-context";
import { authedFetch } from "@/lib/authed-fetch";
import { isAdmin } from "@/lib/admins";
import { useAllTasks } from "@/lib/use-taskify";
import { TASK_REASONS, CREATOR_REASONS } from "@/lib/moderation-reasons";
import AnalyticsPanel from "@/components/admin/AnalyticsPanel";

// Moderation dashboard for the wallets in lib/admins.ts. The API re-checks
// every request (app/api/admin/moderation), so this page's own admin check is
// only about what to render.

interface ModRow { task_id: number; status: "pending_review" | "approved" | "hidden"; flagged_terms: string[]; note: string | null; reviewed_by: string | null; updated_at: string }
interface Report { id: string; kind: "task" | "creator"; task_id: number; target_address: string; reporter_address: string; reason: string; details: string | null; status: "open" | "resolved" | "dismissed"; created_at: string }
interface Standing { address: string; status: "warned" | "blocked"; note: string | null; updated_at: string }
interface Queue { tasks: ModRow[]; reports: Report[]; standings: Standing[]; keywords: string[] }

type Tab = "analytics" | "review" | "reports" | "removed" | "creators" | "keywords";

const REASON_LABELS: Record<string, string> = { ...TASK_REASONS, ...CREATOR_REASONS };

const CARD: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };
const FIELD: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", fontSize: 14, padding: "9px 12px", fontFamily: "inherit" };

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminPage() {
  const { address, connected, connect } = useWallet();
  const admin = isAdmin(address);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("analytics");
  const [showClosedReports, setShowClosedReports] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [standingTarget, setStandingTarget] = useState("");
  const [standingNote, setStandingNote] = useState("");

  const { data: onchainTasks } = useAllTasks();
  const taskById = useMemo(() => new Map((onchainTasks ?? []).map((t) => [t.id, t])), [onchainTasks]);

  const load = useCallback(async () => {
    if (!address) return;
    const res = await authedFetch(`/api/admin/moderation?address=${address}`).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) { setLoadError(data?.error ?? "Couldn't load the moderation queue."); return; }
    setLoadError("");
    setQueue(data as Queue);
  }, [address]);

  useEffect(() => { if (admin) void load(); }, [admin, load]);

  async function act(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setActionError("");
    const res = await authedFetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, ...body }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setActionError((await res?.json().catch(() => null))?.error ?? "That didn't save. Try again.");
      return false;
    }
    await load();
    return true;
  }

  if (!connected || !admin) {
    return (
      <PageShell>
        <Container style={{ padding: "100px 24px" }}>
          <EmptyState
            icon={IconLock}
            title={connected ? "Admins only" : "Sign in to continue"}
            description={connected ? "This page is only available to Taskify admins." : "Connect an admin wallet to open the moderation queue."}
            action={connected ? <Button href="/tasks" variant="outline">Back to tasks</Button> : <Button onClick={connect}>Sign in</Button>}
          />
        </Container>
      </PageShell>
    );
  }

  const pending = queue?.tasks.filter((t) => t.status === "pending_review") ?? [];
  const removed = queue?.tasks.filter((t) => t.status === "hidden") ?? [];
  const openReports = queue?.reports.filter((r) => r.status === "open") ?? [];
  const reports = showClosedReports ? queue?.reports ?? [] : openReports;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "analytics", label: "Analytics" },
    { id: "review", label: "Review queue", count: pending.length },
    { id: "reports", label: "Reports", count: openReports.length },
    { id: "removed", label: "Removed", count: removed.length },
    { id: "creators", label: "Creators", count: queue?.standings.length },
    { id: "keywords", label: "Keywords", count: queue?.keywords.length },
  ];

  const taskLink = (id: number) => (
    <Link href={`/tasks/${id}`} style={{ color: "var(--text)", fontWeight: 700, textDecoration: "none" }}>
      #{id} {taskById.get(id)?.title ?? ""}
    </Link>
  );

  return (
    <PageShell>
      <Container style={{ padding: "40px 24px 80px", maxWidth: 960 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Admin</h1>
        <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 24px", lineHeight: 1.6 }}>
          {tab === "analytics"
            ? "How Taskify is doing. Task and money numbers come straight from the contract."
            : "Removing a task only hides it on Taskify. Its reward stays locked in the contract until the creator cancels it."}
        </p>

        <div role="tablist" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${tab === t.id ? "var(--primary)" : "var(--border)"}`, background: tab === t.id ? "color-mix(in srgb, var(--primary) 9%, transparent)" : "transparent", color: tab === t.id ? "var(--primary)" : "var(--text-muted)" }}
            >
              {t.label}{t.count ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>

        {tab === "analytics" && address && <AnalyticsPanel tasks={onchainTasks} address={address} />}

        {tab !== "analytics" && actionError && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{actionError}</p>}
        {tab !== "analytics" && loadError && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{loadError}</p>}

        {tab === "analytics" ? null : !queue ? (
          !loadError && <LoadingState label="Loading moderation queue…" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tab === "review" && (pending.length === 0 ? (
              <EmptyState size="sm" icon={IconCheck} title="Nothing to review" description="Tasks that match a flagged keyword show up here." />
            ) : pending.map((t) => (
              <div key={t.task_id} style={CARD}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    {taskLink(t.task_id)}
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>
                      {taskById.get(t.task_id) && <>By <Address value={taskById.get(t.task_id)!.creator} /> · </>}held {when(t.updated_at)}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                      {t.flagged_terms.map((term) => <Badge key={term} color="red">{term}</Badge>)}
                      {t.note && <Badge color="gray">{t.note}</Badge>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Button size="sm" disabled={busy} onClick={() => act({ action: "approve", taskId: t.task_id })}>Approve</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "hide", taskId: t.task_id }, "Remove this task from Taskify? Its creator will be notified.")}>Remove</Button>
                  </div>
                </div>
              </div>
            )))}

            {tab === "reports" && (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-dim)" }}>
                  <input type="checkbox" checked={showClosedReports} onChange={(e) => setShowClosedReports(e.target.checked)} />
                  Show resolved and dismissed reports
                </label>
                {reports.length === 0 ? (
                  <EmptyState size="sm" icon={IconCheck} title="No open reports" description="You'll get a notification when someone reports a task or creator." />
                ) : reports.map((r) => (
                  <div key={r.id} style={{ ...CARD, opacity: r.status === "open" ? 1 : 0.65 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      <Badge color={r.kind === "creator" ? "purple" : "orange"}>{r.kind === "creator" ? "Creator report" : "Task report"}</Badge>
                      <Badge color="gray">{REASON_LABELS[r.reason] ?? r.reason}</Badge>
                      {r.status !== "open" && <Badge color="green">{r.status}</Badge>}
                    </div>
                    {taskLink(r.task_id)}
                    {r.details && <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: "8px 0 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.details}</p>}
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
                      Reported by <Address value={r.reporter_address} /> · creator <Link href={`/profile/${r.target_address}`} style={{ color: "inherit" }}><Address value={r.target_address} /></Link> · {when(r.created_at)}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      {r.status === "open" ? (
                        <>
                          {r.kind === "task" ? (
                            <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
                              if (await act({ action: "hide", taskId: r.task_id }, "Remove this task from Taskify? Its creator will be notified.")) await act({ action: "resolve_report", reportId: r.id, status: "resolved" });
                            }}>Remove task</Button>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "set_standing", target: r.target_address, status: "warned", note: `Report on task #${r.task_id}` }, "Mark this creator as reported for non-payment? A badge shows on their profile.")}>Warn creator</Button>
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "set_standing", target: r.target_address, status: "blocked", note: `Report on task #${r.task_id}` }, "Block this creator? Every new task they post will be held for review.")}>Block creator</Button>
                            </>
                          )}
                          <Button size="sm" variant="subtle" disabled={busy} onClick={() => act({ action: "resolve_report", reportId: r.id, status: "resolved" })}>Mark resolved</Button>
                          <Button size="sm" variant="subtle" disabled={busy} onClick={() => act({ action: "resolve_report", reportId: r.id, status: "dismissed" })}>Dismiss</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="subtle" disabled={busy} onClick={() => act({ action: "resolve_report", reportId: r.id, status: "open" })}>Reopen</Button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === "removed" && (removed.length === 0 ? (
              <EmptyState size="sm" icon={IconCheck} title="No removed tasks" />
            ) : removed.map((t) => (
              <div key={t.task_id} style={{ ...CARD, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  {taskLink(t.task_id)}
                  <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>
                    Removed {when(t.updated_at)}{t.reviewed_by && <> by <Address value={t.reviewed_by} /></>}{t.note ? ` · ${t.note}` : ""}
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "approve", taskId: t.task_id })}>Restore</Button>
              </div>
            )))}

            {tab === "creators" && (
              <>
                <div style={{ ...CARD, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input aria-label="Creator wallet address" placeholder="0x… creator wallet" value={standingTarget} onChange={(e) => setStandingTarget(e.target.value)} style={{ ...FIELD, flex: "2 1 260px", fontFamily: "var(--font-geist-mono)" }} />
                  <input aria-label="Note" placeholder="Note (optional)" value={standingNote} onChange={(e) => setStandingNote(e.target.value)} style={{ ...FIELD, flex: "1 1 160px" }} />
                  <Button size="sm" variant="outline" disabled={busy || !standingTarget.trim()} onClick={async () => { if (await act({ action: "set_standing", target: standingTarget.trim(), status: "warned", note: standingNote })) { setStandingTarget(""); setStandingNote(""); } }}>Warn</Button>
                  <Button size="sm" variant="outline" disabled={busy || !standingTarget.trim()} onClick={async () => { if (await act({ action: "set_standing", target: standingTarget.trim(), status: "blocked", note: standingNote }, "Block this creator? Every new task they post will be held for review.")) { setStandingTarget(""); setStandingNote(""); } }}>Block</Button>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
                  Warned creators get a &ldquo;Reported for non-payment&rdquo; badge on their profile. Blocked creators get a &ldquo;Blocked creator&rdquo; badge, and every new task they post is held for review. Neither changes tasks they&apos;ve already posted; remove those individually.
                </p>
                {queue.standings.map((s) => (
                  <div key={s.address} style={{ ...CARD, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <Link href={`/profile/${s.address}`} style={{ color: "var(--text)", fontWeight: 700, textDecoration: "none" }}><Address value={s.address} /></Link>
                        <Badge color="red">{s.status === "blocked" ? "Blocked" : "Warned"}</Badge>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>{s.note ? `${s.note} · ` : ""}{when(s.updated_at)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {s.status === "warned"
                        ? <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "set_standing", target: s.address, status: "blocked", note: s.note }, "Block this creator? Every new task they post will be held for review.")}>Block</Button>
                        : <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "set_standing", target: s.address, status: "warned", note: s.note })}>Unblock (keep warning)</Button>}
                      <Button size="sm" variant="subtle" disabled={busy} onClick={() => act({ action: "set_standing", target: s.address, status: null })}>Clear</Button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === "keywords" && (
              <>
                <form
                  onSubmit={async (e) => { e.preventDefault(); if (newKeyword.trim() && await act({ action: "add_keyword", term: newKeyword })) setNewKeyword(""); }}
                  style={{ ...CARD, display: "flex", gap: 8, flexWrap: "wrap" }}
                >
                  <input aria-label="New keyword" placeholder="Add a word or phrase" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} maxLength={60} style={{ ...FIELD, flex: "1 1 240px" }} />
                  <Button type="submit" size="sm" disabled={busy || !newKeyword.trim()}>Add</Button>
                </form>
                <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
                  New and edited tasks whose title, description or tags contain one of these, as a whole word, are held for review. Changes apply to tasks saved from now on.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {queue.keywords.map((k) => (
                    <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "4px 6px 4px 10px", fontSize: 13, color: "var(--text)" }}>
                      {k}
                      <button aria-label={`Remove ${k}`} disabled={busy} onClick={() => act({ action: "remove_keyword", term: k })} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px" }}>×</button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Container>
    </PageShell>
  );
}
