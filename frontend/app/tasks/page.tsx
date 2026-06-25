"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/ui/TaskCard";
import { MOCK_TASKS } from "@/lib/mock";
import { TIERS } from "@/lib/constants";
import { useWallet } from "@/lib/wallet-context";

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

  const filtered = MOCK_TASKS.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) return false;
    if (statusFilter !== "All" && !STATUS_MAP[statusFilter].includes(t.status)) return false;
    if (tierFilter !== null && (t.experienceMin > tierFilter || t.experienceMax < tierFilter)) return false;
    if (fundingFilter !== "all" && t.fundingType !== fundingFilter) return false;
    return true;
  });

  const isContributor = connected && isRegistered && role === "contributor";
  const isCreator = connected && isRegistered && role === "creator";

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1E1E2A", padding: "40px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F0F0F5", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Browse Bounties</h1>
              <p style={{ fontSize: 15, color: "#7070A0", margin: 0 }}>
                {MOCK_TASKS.filter(t => t.status === "OPEN").length} open tasks · experience-matched on-chain
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Role badge / hint */}
              {connected && isRegistered && (
                <div style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8, background: role === "contributor" ? "#5546FF18" : role === "creator" ? "#F7931A18" : "#00D39518", color: role === "contributor" ? "#8B80FF" : role === "creator" ? "#F7931A" : "#00D395", border: `1px solid ${role === "contributor" ? "#5546FF30" : role === "creator" ? "#F7931A30" : "#00D39530"}` }}>
                  {role === "contributor" ? "You can apply" : role === "creator" ? "View only — post your own" : "Patron view"}
                </div>
              )}
              {isCreator && (
                <Link href="/create" style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 10, textDecoration: "none" }}>
                  + Post a Task
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role banner for non-contributors */}
      {connected && isRegistered && role !== "contributor" && (
        <div style={{ borderBottom: "1px solid #1E1E2A", padding: "12px 24px", background: "#111116" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#9090B0" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {role === "creator"
              ? "As a creator you can browse tasks for inspiration, but only contributors can apply. "
              : "Patrons can browse tasks to inform grant voting, but only contributors can apply. "}
            <Link href="/tasks" style={{ color: "#F7931A", textDecoration: "none" }}>Learn more</Link>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 32, alignItems: "start" }}>
        {/* Sidebar filters */}
        <aside style={{ position: "sticky", top: 80 }}>
          {/* Search */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7070A0" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks, tags…"
                style={{ width: "100%", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "10px 12px 10px 36px", fontSize: 14, color: "#F0F0F5", outline: "none", boxSizing: "border-box" }}
                onFocus={e => (e.target.style.borderColor = "#F7931A50")}
                onBlur={e => (e.target.style.borderColor = "#1E1E2A")} />
            </div>
          </div>

          {/* Status */}
          <FilterGroup label="Status">
            {STATUS_FILTERS.map(s => (
              <FilterBtn key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s}</FilterBtn>
            ))}
          </FilterGroup>

          {/* Experience */}
          <FilterGroup label="Experience Level">
            <FilterBtn active={tierFilter === null} onClick={() => setTierFilter(null)}>All Levels</FilterBtn>
            {TIERS.map(tier => (
              <FilterBtn key={tier.id} active={tierFilter === tier.id} onClick={() => setTierFilter(tier.id)} color={tierFilter === tier.id ? tier.color : undefined} bg={tierFilter === tier.id ? tier.bg : undefined}>
                {tier.label}
              </FilterBtn>
            ))}
          </FilterGroup>

          {/* Funding */}
          <FilterGroup label="Funding">
            {(["all", "self", "grant"] as const).map(f => (
              <FilterBtn key={f} active={fundingFilter === f} onClick={() => setFundingFilter(f)}>
                {f === "all" ? "All" : f === "self" ? "Self-Funded" : "Grant-Funded"}
              </FilterBtn>
            ))}
          </FilterGroup>
        </aside>

        {/* Task grid */}
        <main>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#7070A0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#9090B0", marginBottom: 8 }}>No tasks match your filters</div>
              <div style={{ fontSize: 14 }}>Try adjusting your search or filters</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {filtered.map(task => (
                <div key={task.id} style={{ position: "relative" }}>
                  <TaskCard task={task} />
                  {/* Contributor apply badge on open tasks */}
                  {isContributor && task.status === "OPEN" && (
                    <div style={{ position: "absolute", bottom: 20, right: 20 }}>
                      <Link href={`/tasks/${task.id}`}
                        style={{ background: "#F7931A", color: "#0A0A0F", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6, textDecoration: "none", display: "inline-block" }}>
                        Apply →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#7070A0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </div>
  );
}

function FilterBtn({ active, onClick, children, color, bg }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <button onClick={onClick}
      style={{ background: active ? (bg ?? "#F7931A18") : "transparent", border: `1px solid ${active ? (color ?? "#F7931A") + "30" : "transparent"}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: active ? (color ?? "#F7931A") : "#9090B0", fontWeight: active ? 600 : 400, textAlign: "left", transition: "all 0.15s" }}>
      {children}
    </button>
  );
}
