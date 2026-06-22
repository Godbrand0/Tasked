"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/ui/TaskCard";
import { Badge, TierBadge, StatusBadge } from "@/components/ui/Badge";
import { MOCK_TASKS, MOCK_LEADERBOARD } from "@/lib/mock";
import { formatUSDX, TIERS } from "@/lib/constants";

// Mock contributor profile
const CONTRIBUTOR = MOCK_LEADERBOARD[0];
const APPLIED_IDS = [1, 3];
const ACTIVE_ID = 3;

export default function ContributorPage() {
  const [showAll, setShowAll] = useState(false);
  const myTier = CONTRIBUTOR.experienceLevel;

  const matchedTasks = MOCK_TASKS.filter(
    (t) => t.status === "OPEN" && t.experienceMin <= myTier && t.experienceMax >= myTier
  );
  const outOfRangeTasks = MOCK_TASKS.filter(
    (t) => t.status === "OPEN" && !(t.experienceMin <= myTier && t.experienceMax >= myTier)
  );
  const appliedTasks = MOCK_TASKS.filter((t) => APPLIED_IDS.includes(t.id));
  const activeTask = MOCK_TASKS.find((t) => t.id === ACTIVE_ID);

  const displayedExtra = showAll ? outOfRangeTasks : [];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #5546FF, #8B80FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white" }}>
              {CONTRIBUTOR.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5", margin: 0 }}>{CONTRIBUTOR.username}</h1>
                {CONTRIBUTOR.githubVerified && <Badge color="green">GitHub Verified</Badge>}
              </div>
              <TierBadge tier={CONTRIBUTOR.experienceLevel} />
            </div>
          </div>
          <Link href="/tasks" style={{ background: "#5546FF18", border: "1px solid #5546FF30", color: "#8B80FF", fontWeight: 700, fontSize: 14, padding: "12px 22px", borderRadius: 10, textDecoration: "none" }}>
            Browse All Tasks
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Tasks Completed", value: String(CONTRIBUTOR.tasksCompleted),          color: "#00D395", icon: "✓"  },
            { label: "Total Earned",    value: `${formatUSDX(CONTRIBUTOR.totalEarned)} USDX`, color: "#F7931A", icon: "💰" },
            { label: "Experience Tier", value: TIERS[myTier].label,                          color: TIERS[myTier].color, icon: "🏅" },
            { label: "Matched Tasks",   value: String(matchedTasks.length),                  color: "#60A5FA", icon: "🎯" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 13, color: "#7070A0" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32, alignItems: "start" }}>
          <div>
            {/* Active task */}
            {activeTask && (
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: "0 0 16px" }}>Active Task</h2>
                <div style={{ background: "#111116", border: "1px solid #F7931A30", borderRadius: 14, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <StatusBadge status={activeTask.status} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#F7931A" }}>{formatUSDX(activeTask.amount)} USDX</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: "0 0 16px" }}>{activeTask.title}</h3>
                  <div style={{ display: "flex", gap: 10 }}>
                    {activeTask.status === "IN_PROGRESS" && (
                      <button style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                        Submit Work
                      </button>
                    )}
                    <Link href={`/tasks/${activeTask.id}`} style={{ background: "#FFFFFF0D", border: "1px solid #1E1E2A", color: "#9090B0", fontWeight: 600, fontSize: 14, padding: "10px 20px", borderRadius: 10, textDecoration: "none" }}>
                      View Task
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Matched tasks */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: "0 0 4px" }}>Matched for You</h2>
                  <p style={{ fontSize: 12, color: "#7070A0", margin: 0 }}>Tasks within your {TIERS[myTier].label} experience tier</p>
                </div>
                <span style={{ fontSize: 12, color: "#7070A0" }}>{matchedTasks.length} task{matchedTasks.length !== 1 ? "s" : ""}</span>
              </div>
              {matchedTasks.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {matchedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              ) : (
                <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                  <div style={{ fontSize: 15, color: "#9090B0", marginBottom: 8 }}>No matched tasks right now</div>
                  <div style={{ fontSize: 13, color: "#7070A0" }}>Check back soon, or browse all tasks below</div>
                </div>
              )}
            </div>

            {/* Out of range toggle */}
            {outOfRangeTasks.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <button onClick={() => setShowAll(!showAll)}
                  style={{ background: "transparent", border: "1px solid #1E1E2A", color: "#7070A0", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer", marginBottom: 16 }}>
                  {showAll ? "Hide" : "Show"} {outOfRangeTasks.length} tasks outside your tier
                </button>
                {showAll && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, opacity: 0.55 }}>
                    {displayedExtra.map((task) => <TaskCard key={task.id} task={task} />)}
                  </div>
                )}
              </div>
            )}

            {/* Applied tasks */}
            {appliedTasks.length > 0 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: "0 0 16px" }}>Applications</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {appliedTasks.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "#5546FF40")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "#1E1E2A")}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#F0F0F5", marginBottom: 2 }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "#7070A0" }}>{formatUSDX(task.amount)} USDX</div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Reputation */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>On-Chain Reputation</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#7070A0" }}>Experience Tier</span>
                  <TierBadge tier={myTier} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#7070A0" }}>Tasks Completed</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#00D395" }}>{CONTRIBUTOR.tasksCompleted}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#7070A0" }}>Total Earned</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#F7931A" }}>{formatUSDX(CONTRIBUTOR.totalEarned)} USDX</span>
                </div>
              </div>
              <div style={{ height: 1, background: "#1E1E2A", margin: "16px 0" }} />
              <Link href={`/profile/${CONTRIBUTOR.address}`} style={{ display: "block", textAlign: "center", color: "#8B80FF", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                View public profile →
              </Link>
            </div>

            {/* Update experience */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Update Experience</div>
              <p style={{ fontSize: 13, color: "#7070A0", lineHeight: 1.6, marginBottom: 14 }}>Calls <code style={{ color: "#F7931A", fontSize: 11 }}>update-experience</code> on-chain. 1-day cooldown after update.</p>
              <select defaultValue={myTier}
                style={{ width: "100%", background: "#18181F", border: "1px solid #1E1E2A", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#F0F0F5", outline: "none", cursor: "pointer", marginBottom: 10 }}>
                {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label} — {t.years}</option>)}
              </select>
              <button style={{ width: "100%", background: "#5546FF18", border: "1px solid #5546FF30", color: "#8B80FF", fontWeight: 700, fontSize: 14, padding: "10px", borderRadius: 10, cursor: "pointer" }}>
                Update Tier
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
