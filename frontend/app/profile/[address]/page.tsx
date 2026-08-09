"use client";

import { use } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Badge, TierBadge, StatusBadge } from "@/components/ui/Badge";
import { MOCK_LEADERBOARD, MOCK_TASKS } from "@/lib/mock";
import { formatMUSD, TIERS } from "@/lib/constants";

export default function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const user = MOCK_LEADERBOARD.find((u) => u.address === address) ?? MOCK_LEADERBOARD[0];
  const completedTasks = MOCK_TASKS.filter((t) => t.assignee === user.address && t.status === "FUNDS_RELEASED");
  const appliedTasks = MOCK_TASKS.filter((t) => t.status !== "FUNDS_RELEASED" && t.assignee === user.address);
  const tier = TIERS[user.experienceLevel];
  const rank = [...MOCK_LEADERBOARD].sort((a, b) => b.totalEarned - a.totalEarned).findIndex((u) => u.address === user.address) + 1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
        {/* Profile header */}
        <div style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--bg-alt) 100%)", border: "1px solid var(--border)", borderRadius: 20, padding: "40px 40px 32px", marginBottom: 32, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, background: `radial-gradient(ellipse, ${tier.color}10 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{ width: 80, height: 80, borderRadius: 20, background: `linear-gradient(135deg, ${tier.color}, var(--secondary))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "white", flexShrink: 0 }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: 0 }}>{user.username}</h1>
                {user.githubVerified && <Badge color="green">✓ GitHub Verified</Badge>}
                <TierBadge tier={user.experienceLevel} />
              </div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)", marginBottom: 14 }}>{user.address}</div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Leaderboard Rank", value: `#${rank}`,                        color: "var(--primary)" },
                  { label: "Tasks Completed",  value: String(user.tasksCompleted),        color: "var(--success)" },
                  { label: "Total Earned",     value: `${formatMUSD(user.totalEarned)} MUSD`, color: "var(--primary)" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 28, alignItems: "start" }}>
          <div>
            {/* Completed tasks */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
                Completed Bounties ({user.tasksCompleted})
              </div>
              {completedTasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-dim)", fontSize: 14 }}>
                  Completed tasks will appear here
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {completedTasks.map((task, i) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < completedTasks.length - 1 ? "1px solid var(--border)" : "none" }}
                        onMouseEnter={(e) => { const el = e.currentTarget.querySelector(".ptask") as HTMLElement | null; if (el) el.style.color = "var(--primary)"; }}
                        onMouseLeave={(e) => { const el = e.currentTarget.querySelector(".ptask") as HTMLElement | null; if (el) el.style.color = "var(--text)"; }}>
                        <div>
                          <div className="ptask" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 3, transition: "color 0.15s" }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>+{formatMUSD(task.amount * 0.97)} MUSD</div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Active tasks */}
            {appliedTasks.length > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Active Tasks</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {appliedTasks.map((task, i) => (
                    <div key={task.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: i < appliedTasks.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{task.title}</div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — on-chain identity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>On-Chain Identity</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Experience Tier</div>
                  <TierBadge tier={user.experienceLevel} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Years Experience</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{tier.years}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>GitHub</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: user.githubVerified ? "var(--success)" : "var(--text-dim)" }}>
                    {user.githubVerified ? `@${user.githubHandle ?? user.username}` : "Not verified"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Registered Block</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>{user.registeredAt.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Experience breakdown */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Earnings Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Total Earned</span>
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>{formatMUSD(user.totalEarned)} MUSD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Tasks Completed</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{user.tasksCompleted}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Avg per task</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>
                    {user.tasksCompleted > 0 ? formatMUSD(user.totalEarned / user.tasksCompleted) : "—"} MUSD
                  </span>
                </div>
              </div>
            </div>

            <Link href="/leaderboard" style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 13, textDecoration: "none", padding: "12px", border: "1px solid var(--border)", borderRadius: 10 }}>
              View Full Leaderboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
