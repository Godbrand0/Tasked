"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/ui/TaskCard";
import { MOCK_TASKS } from "@/lib/mock";
import { TIERS } from "@/lib/constants";

const STATUS_FILTERS = ["All", "Open", "In Progress", "Submitted", "Completed"];

const STATUS_MAP: Record<string, string[]> = {
  "All": [],
  "Open": ["OPEN", "GRANT_PENDING"],
  "In Progress": ["ASSIGNED", "IN_PROGRESS"],
  "Submitted": ["SUBMITTED"],
  "Completed": ["FUNDS_RELEASED"],
};

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [fundingFilter, setFundingFilter] = useState<"all" | "self" | "grant">("all");

  const filtered = MOCK_TASKS.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))) return false;
    if (statusFilter !== "All" && !STATUS_MAP[statusFilter].includes(t.status)) return false;
    if (tierFilter !== null && (t.experienceMin > tierFilter || t.experienceMax < tierFilter)) return false;
    if (fundingFilter !== "all" && t.fundingType !== fundingFilter) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1E1E2A", padding: "40px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F0F0F5", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Browse Bounties</h1>
              <p style={{ fontSize: 15, color: "#7070A0", margin: 0 }}>{MOCK_TASKS.filter(t => t.status === "OPEN").length} open tasks · experience-matched on-chain</p>
            </div>
            <a href="/create" style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 14, padding: "12px 22px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
              + Post a Task
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 32, alignItems: "start" }}>
        {/* Sidebar filters */}
        <aside style={{ position: "sticky", top: 80 }}>
          {/* Search */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7070A0" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, tags..."
                style={{ width: "100%", background: "#111116", border: "1px solid #1E1E2A", borderRadius: 10, padding: "10px 12px 10px 36px", fontSize: 14, color: "#F0F0F5", outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => (e.target.style.borderColor = "#F7931A50")}
                onBlur={(e) => (e.target.style.borderColor = "#1E1E2A")} />
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7070A0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Status</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {STATUS_FILTERS.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ background: statusFilter === s ? "#F7931A18" : "transparent", border: `1px solid ${statusFilter === s ? "#F7931A30" : "transparent"}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: statusFilter === s ? "#F7931A" : "#9090B0", fontWeight: statusFilter === s ? 600 : 400, textAlign: "left", transition: "all 0.15s" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7070A0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Experience Level</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button onClick={() => setTierFilter(null)}
                style={{ background: tierFilter === null ? "#F7931A18" : "transparent", border: `1px solid ${tierFilter === null ? "#F7931A30" : "transparent"}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: tierFilter === null ? "#F7931A" : "#9090B0", fontWeight: tierFilter === null ? 600 : 400, textAlign: "left" }}>
                All Levels
              </button>
              {TIERS.map((tier) => (
                <button key={tier.id} onClick={() => setTierFilter(tier.id)}
                  style={{ background: tierFilter === tier.id ? tier.bg : "transparent", border: `1px solid ${tierFilter === tier.id ? tier.color + "30" : "transparent"}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: tierFilter === tier.id ? tier.color : "#9090B0", fontWeight: tierFilter === tier.id ? 600 : 400, textAlign: "left" }}>
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {/* Funding type */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7070A0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Funding</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(["all", "self", "grant"] as const).map((f) => (
                <button key={f} onClick={() => setFundingFilter(f)}
                  style={{ background: fundingFilter === f ? "#F7931A18" : "transparent", border: `1px solid ${fundingFilter === f ? "#F7931A30" : "transparent"}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: fundingFilter === f ? "#F7931A" : "#9090B0", fontWeight: fundingFilter === f ? 600 : 400, textAlign: "left" }}>
                  {f === "all" ? "All" : f === "self" ? "Self-Funded" : "Grant-Funded"}
                </button>
              ))}
            </div>
          </div>
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
              {filtered.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
