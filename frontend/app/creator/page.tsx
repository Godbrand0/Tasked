"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/ui/TaskCard";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { MOCK_TASKS, MOCK_WALLET, MOCK_WAVE } from "@/lib/mock";
import { formatUSDX } from "@/lib/constants";

export default function CreatorPage() {
  const myTasks = MOCK_TASKS.filter((t) => t.creator === MOCK_WALLET.address);
  const openTasks = myTasks.filter((t) => t.status === "OPEN");
  const activeTasks = myTasks.filter((t) => ["ASSIGNED", "IN_PROGRESS", "SUBMITTED"].includes(t.status));
  const completedTasks = myTasks.filter((t) => t.status === "FUNDS_RELEASED");
  const totalEscrowed = myTasks.filter((t) => !["FUNDS_RELEASED", "CANCELLED", "EXPIRED"].includes(t.status)).reduce((s, t) => s + t.amount, 0);

  const waveShare = MOCK_WAVE.totalTasks > 0 ? Math.round((2 / MOCK_WAVE.totalTasks) * MOCK_WAVE.poolAmount) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #F7931A, #C4711A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white" }}>
              {MOCK_WALLET.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5", margin: 0 }}>{MOCK_WALLET.username}</h1>
                {MOCK_WALLET.githubVerified && <Badge color="green">GitHub Verified</Badge>}
              </div>
              <div style={{ fontSize: 13, color: "#7070A0", fontFamily: "var(--font-geist-mono)" }}>{MOCK_WALLET.address.slice(0, 12)}…{MOCK_WALLET.address.slice(-6)}</div>
            </div>
          </div>
          <Link href="/create" style={{ background: "#F7931A", color: "#0A0A0F", fontWeight: 700, fontSize: 14, padding: "12px 22px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            + Post New Task
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Tasks Posted",    value: String(myTasks.length),           color: "#F7931A", icon: "📋" },
            { label: "Active Tasks",    value: String(activeTasks.length),        color: "#60A5FA", icon: "⚡" },
            { label: "Completed",       value: String(completedTasks.length),     color: "#00D395", icon: "✓"  },
            { label: "Total Escrowed",  value: `${formatUSDX(totalEscrowed)} USDX`, color: "#F7931A", icon: "🔒" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 13, color: "#7070A0" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
          {/* Tasks list */}
          <div>
            {/* Active */}
            {activeTasks.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: 0 }}>Needs Attention</h2>
                  <span style={{ fontSize: 12, color: "#7070A0" }}>{activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {activeTasks.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, transition: "border-color 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "#F7931A40")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "#1E1E2A")}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5", marginBottom: 4 }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "#7070A0" }}>{formatUSDX(task.amount)} USDX · Task #{task.id}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                          <StatusBadge status={task.status} />
                          {task.status === "SUBMITTED" && (
                            <button style={{ background: "#00D39518", border: "1px solid #00D39530", color: "#00D395", fontWeight: 700, fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>
                              Approve & Release
                            </button>
                          )}
                          {task.status === "OPEN" && task.applicantCount && task.applicantCount > 0 && (
                            <button style={{ background: "#60A5FA18", border: "1px solid #60A5FA30", color: "#60A5FA", fontWeight: 700, fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>
                              Review {task.applicantCount} Applicant{task.applicantCount !== 1 ? "s" : ""}
                            </button>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Open */}
            {openTasks.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: 0 }}>Open Tasks</h2>
                  <span style={{ fontSize: 12, color: "#7070A0" }}>{openTasks.length} task{openTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {openTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedTasks.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: 0 }}>Completed</h2>
                  <span style={{ fontSize: 12, color: "#7070A0" }}>{completedTasks.length} task{completedTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {completedTasks.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, opacity: 0.7 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#F0F0F5" }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "#7070A0" }}>{formatUSDX(task.amount)} USDX paid</div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {myTasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#9090B0", marginBottom: 8 }}>No tasks posted yet</div>
                <Link href="/create" style={{ color: "#F7931A", fontSize: 14, textDecoration: "none" }}>Post your first task →</Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Wave reward */}
            <div style={{ background: "#111116", border: "1px solid #F7931A30", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F7931A", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Wave #{MOCK_WAVE.waveId} Reward</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#F7931A", marginBottom: 4 }}>{formatUSDX(waveShare)} USDX</div>
              <div style={{ fontSize: 13, color: "#7070A0", marginBottom: 16 }}>Estimated share from {formatUSDX(MOCK_WAVE.poolAmount)} USDX pool</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#7070A0" }}>Your tasks this wave</span>
                  <span style={{ color: "#F0F0F5", fontWeight: 600 }}>2</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#7070A0" }}>Total tasks in wave</span>
                  <span style={{ color: "#F0F0F5", fontWeight: 600 }}>{MOCK_WAVE.totalTasks}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#7070A0" }}>Wave pool</span>
                  <span style={{ color: "#F0F0F5", fontWeight: 600 }}>{formatUSDX(MOCK_WAVE.poolAmount)} USDX</span>
                </div>
              </div>
              <button style={{ width: "100%", background: "#F7931A18", border: "1px solid #F7931A30", color: "#F7931A", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: "pointer" }}>
                Claim Wave Reward
              </button>
              <div style={{ fontSize: 11, color: "#7070A0", textAlign: "center", marginTop: 8 }}>Wave advances every ~7 days</div>
            </div>

            {/* Quick actions */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Quick Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/create" style={{ background: "#F7931A18", border: "1px solid #F7931A30", color: "#F7931A", fontWeight: 600, fontSize: 14, padding: "11px 16px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>+</span> Post a new task
                </Link>
                <Link href="/create?type=grant" style={{ background: "#5546FF18", border: "1px solid #5546FF30", color: "#8B80FF", fontWeight: 600, fontSize: 14, padding: "11px 16px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🏛</span> Apply for grant
                </Link>
                <Link href={`/profile/${MOCK_WALLET.address}`} style={{ background: "#FFFFFF0D", border: "1px solid #1E1E2A", color: "#9090B0", fontWeight: 600, fontSize: 14, padding: "11px 16px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>👤</span> View public profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
