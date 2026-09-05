"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TaskCard from "@/components/ui/TaskCard";
import PageShell, { Container } from "@/components/ui/PageShell";
import { SkeletonCard } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { IconSearch } from "@/components/icons";
import { TIERS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";
import { useAllTasks, useUsersBatch, useProfilesBatch, mapOnChainTask } from "@/lib/use-taskify";

const STATUS_FILTERS = ["All", "Open", "In Progress", "Submitted", "Completed"];
const STATUS_MAP: Record<string, string[]> = {
  "All":         [],
  "Open":        ["OPEN", "GRANT_PENDING"],
  "In Progress": ["ASSIGNED", "IN_PROGRESS"],
  "Submitted":   ["SUBMITTED"],
  "Completed":   ["FUNDS_RELEASED"],
};

export default function TasksPage() {
  const { role, connected, isRegistered } = useWallet();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [fundingFilter, setFundingFilter] = useState<"all" | "self" | "grant">("all");
  const [kindFilter, setKindFilter] = useState<"all" | "development" | "community">("all");

  const { data: onchainTasks, isLoading: tasksLoading } = useAllTasks();
  const { data: usersByAddress } = useUsersBatch((onchainTasks ?? []).map(t => t.creator));
  // Off-chain overrides (custom display name, uploaded/Google avatar) —
  // useUsersBatch only ever returns the permanent on-chain username.
  const { data: profilesByAddress } = useProfilesBatch((onchainTasks ?? []).map(t => t.creator));
  const baseTasks = useMemo(
    () => (onchainTasks ?? []).map(t => {
      const addr = t.creator.toLowerCase();
      const onchainUsername = usersByAddress?.[addr] ?? "";
      const profile = profilesByAddress?.[addr];
      return mapOnChainTask(t, profile?.displayName || onchainUsername);
    }),
    [onchainTasks, usersByAddress, profilesByAddress]
  );

  const [submissionCounts, setSubmissionCounts] = useState<Record<number, number>>({});
  const [applicantCounts, setApplicantCounts] = useState<Record<number, number>>({});

  const communityTaskIds = useMemo(() => baseTasks.filter(t => t.kind === "community").map(t => t.id).join(","), [baseTasks]);
  const developmentTaskIds = useMemo(() => baseTasks.filter(t => t.kind === "development").map(t => t.id).join(","), [baseTasks]);

  useEffect(() => {
    if (!communityTaskIds) return;
    fetch(`/api/submissions/counts?taskIds=${communityTaskIds}`)
      .then(res => res.json())
      .then((data: { counts?: Record<number, number> }) => setSubmissionCounts(data.counts ?? {}))
      .catch(() => {});
  }, [communityTaskIds]);

  useEffect(() => {
    if (!developmentTaskIds) return;
    fetch(`/api/applications/counts?taskIds=${developmentTaskIds}`)
      .then(res => res.json())
      .then((data: { counts?: Record<number, number> }) => setApplicantCounts(data.counts ?? {}))
      .catch(() => {});
  }, [developmentTaskIds]);

  const tasks = useMemo(
    () => baseTasks.map(t => ({
      ...t,
      submissionCount: t.kind === "community" ? (submissionCounts[t.id] ?? 0) : undefined,
      applicantCount: t.kind === "development" ? (applicantCounts[t.id] ?? 0) : undefined,
    })),
    [baseTasks, submissionCounts, applicantCounts]
  );

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) return false;
    if (statusFilter !== "All" && !STATUS_MAP[statusFilter].includes(t.status)) return false;
    if (kindFilter !== "all" && t.kind !== kindFilter) return false;
    if (tierFilter !== null && t.kind === "development" && (t.experienceMin > tierFilter || t.experienceMax < tierFilter)) return false;
    if (fundingFilter !== "all" && t.fundingType !== fundingFilter) return false;
    return true;
  });

  const isContributor = connected && isRegistered && role === "contributor";
  const isCreator = connected && isRegistered && role === "creator";
  const canJoinCommunity = connected && isRegistered && role !== "creator";

  return (
    <PageShell>
      {/* Header */}
      <div style={{ padding: "40px 24px 32px", borderBottom: "1px solid transparent", borderImage: "linear-gradient(90deg, transparent, var(--border) 15%, var(--border) 85%, transparent) 1" }}>
        <Container style={{ padding: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Browse Bounties</h1>
              <p style={{ fontSize: 15, color: "var(--text-dim)", textAlign: "justify", margin: 0 }}>
                {tasks.filter(t => t.status === "OPEN").length} open tasks · experience-matched on-chain
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Role badge / hint */}
              {connected && isRegistered && (
                <div style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8, background: role === "contributor" ? "color-mix(in srgb, var(--secondary) 9%, transparent)" : role === "creator" ? "color-mix(in srgb, var(--primary) 9%, transparent)" : "color-mix(in srgb, var(--success) 9%, transparent)", color: role === "contributor" ? "var(--secondary-light)" : role === "creator" ? "var(--primary)" : "var(--success)", border: `1px solid ${role === "contributor" ? "color-mix(in srgb, var(--secondary) 19%, transparent)" : role === "creator" ? "color-mix(in srgb, var(--primary) 19%, transparent)" : "color-mix(in srgb, var(--success) 19%, transparent)"}` }}>
                  {role === "contributor" ? "You can apply" : role === "creator" ? "View only, post your own" : "Patron view"}
                </div>
              )}
              {isCreator && <Button href="/create">+ Post a Task</Button>}
            </div>
          </div>
        </Container>
      </div>

      {/* Role banner for non-contributors */}
      {connected && isRegistered && role !== "contributor" && (
        <div style={{ padding: "12px 24px", background: "var(--surface)", borderBottom: "1px solid transparent", borderImage: "linear-gradient(90deg, transparent, var(--border) 15%, var(--border) 85%, transparent) 1" }}>
          <Container style={{ padding: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {role === "creator"
              ? "As an owner you can browse tasks for inspiration, but only contributors can apply to Development tasks. "
              : "Patrons can browse tasks to inform grant voting, but only contributors can apply to Development tasks. Community tasks are open to any registered role, including you. "}
            <Link href="/tasks" style={{ color: "var(--primary)", textDecoration: "none" }}>Learn more</Link>
          </Container>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", gap: 32, alignItems: "start" }}>
        {/* Sidebar filters */}
        <aside style={{ position: "sticky", top: 80 }}>
          {/* Search */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks, tags…"
                style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px 10px 36px", fontSize: 14, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
                onFocus={e => (e.target.style.borderColor = "color-mix(in srgb, var(--primary) 31%, transparent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            </div>
          </div>

          {/* Status */}
          <FilterGroup label="Status">
            <FilterSelect value={statusFilter} onChange={setStatusFilter}>
              {STATUS_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </FilterSelect>
          </FilterGroup>

          {/* Task type */}
          <FilterGroup label="Task Type">
            <FilterSelect value={kindFilter} onChange={v => setKindFilter(v as typeof kindFilter)}>
              <option value="all">All Tasks</option>
              <option value="development">Development</option>
              <option value="community">Community</option>
            </FilterSelect>
          </FilterGroup>

          {/* Experience — development-only concept */}
          <FilterGroup label="Experience Level">
            <FilterSelect value={tierFilter === null ? "all" : String(tierFilter)} onChange={v => setTierFilter(v === "all" ? null : Number(v))}>
              <option value="all">All Levels</option>
              {TIERS.map(tier => <option key={tier.id} value={tier.id}>{tier.label}</option>)}
            </FilterSelect>
          </FilterGroup>

          {/* Funding */}
          <FilterGroup label="Funding">
            <FilterSelect value={fundingFilter} onChange={v => setFundingFilter(v as typeof fundingFilter)}>
              <option value="all">All</option>
              <option value="self">Self-Funded</option>
              <option value="grant">Grant-Funded</option>
            </FilterSelect>
          </FilterGroup>
        </aside>

        {/* Task grid */}
        <main>
          {tasksLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState size="lg" icon={IconSearch} title="No tasks match your filters" description="Try adjusting your search or filters" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {filtered.map(task => (
                <div key={task.id} style={{ position: "relative" }}>
                  <TaskCard task={task} creatorAvatarUrl={profilesByAddress?.[task.creator.toLowerCase()]?.avatarUrl ?? undefined} />
                  {/* Quick-action badge on open tasks — apply (dev, contributors only) or join (community, any role) */}
                  {task.status === "OPEN" && ((task.kind === "community" && canJoinCommunity) || (task.kind === "development" && isContributor)) && (
                    <div style={{ position: "absolute", bottom: 20, right: 20 }}>
                      <Link href={`/tasks/${task.id}`} className="btn-motion"
                        style={{ background: "var(--primary)", color: "var(--bg)", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6, textDecoration: "none", display: "inline-block" }}>
                        {task.kind === "community" ? "Join →" : "Apply →"}
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </PageShell>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "var(--text)", outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
      {children}
    </select>
  );
}
