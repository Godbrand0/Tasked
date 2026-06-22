"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Badge, TierBadge, StatusBadge, PatronTierBadge } from "@/components/ui/Badge";
import { MOCK_WALLET, MOCK_TASKS, MOCK_WAVE } from "@/lib/mock";
import { formatUSDX, TIERS } from "@/lib/constants";

// Simulated role — in production derived from on-chain user profile
const MOCK_ROLE = MOCK_WALLET.role;

export default function DashboardPage() {
  const myTasks = MOCK_TASKS.filter((t) =>
    MOCK_ROLE === "creator" ? t.creator === MOCK_WALLET.address : t.assignee === MOCK_WALLET.address
  );
  const activeTasks = myTasks.filter((t) => ["OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "GRANT_PENDING"].includes(t.status));
  const completedTasks = myTasks.filter((t) => t.status === "FUNDS_RELEASED");
  const totalEscrowed = MOCK_ROLE === "creator"
    ? myTasks.filter((t) => !["FUNDS_RELEASED", "CANCELLED", "EXPIRED"].includes(t.status)).reduce((s, t) => s + t.amount, 0)
    : 0;

  const tier = TIERS[MOCK_WALLET.experienceLevel];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Welcome banner */}
        <div style={{ background: "linear-gradient(135deg, #111116 0%, #16121A 100%)", border: "1px solid #F7931A20", borderRadius: 20, padding: "32px 36px", marginBottom: 40, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, background: "radial-gradient(ellipse, rgba(247,147,26,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "#7070A0", marginBottom: 6 }}>Welcome back</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#F0F0F5", margin: "0 0 10px", letterSpacing: "-0.02em" }}>{MOCK_WALLET.username}</h1>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Badge color={MOCK_ROLE === "creator" ? "orange" : MOCK_ROLE === "contributor" ? "purple" : "green"}>
                  {MOCK_ROLE.charAt(0).toUpperCase() + MOCK_ROLE.slice(1)}
                </Badge>
                {MOCK_WALLET.githubVerified && <Badge color="green">GitHub Verified</Badge>}
                {MOCK_ROLE === "contributor" && <TierBadge tier={MOCK_WALLET.experienceLevel} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {MOCK_ROLE === "creator" && (
                <Link href="/creator" style={{ background: "#F7931A18", border: "1px solid #F7931A30", color: "#F7931A", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, textDecoration: "none" }}>Creator Dashboard</Link>
              )}
              {MOCK_ROLE === "contributor" && (
                <Link href="/contributor" style={{ background: "#5546FF18", border: "1px solid #5546FF30", color: "#8B80FF", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, textDecoration: "none" }}>Contributor Dashboard</Link>
              )}
              {MOCK_ROLE === "investor" && (
                <Link href="/investor" style={{ background: "#00D39518", border: "1px solid #00D39530", color: "#00D395", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, textDecoration: "none" }}>Patron Dashboard</Link>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>
          <div>
            {/* Overview stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
              {MOCK_ROLE === "creator" && [
                { label: "Tasks Posted",   value: String(myTasks.length),               color: "#F7931A" },
                { label: "Active",         value: String(activeTasks.length),            color: "#60A5FA" },
                { label: "USDX Escrowed", value: `${formatUSDX(totalEscrowed)}`,         color: "#00D395" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 12, color: "#7070A0" }}>{label}</div>
                </div>
              ))}
              {MOCK_ROLE === "contributor" && [
                { label: "Tasks Done",    value: String(MOCK_WALLET.tasksCompleted),              color: "#00D395" },
                { label: "Total Earned",  value: `${formatUSDX(MOCK_WALLET.totalEarned)} USDX`,   color: "#F7931A" },
                { label: "Experience",    value: tier.label,                                       color: tier.color },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 12, color: "#7070A0" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#F0F0F5", margin: 0 }}>Recent Tasks</h2>
                <Link href={MOCK_ROLE === "creator" ? "/creator" : "/contributor"} style={{ fontSize: 13, color: "#F7931A", textDecoration: "none" }}>View all →</Link>
              </div>
              {myTasks.slice(0, 5).length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#7070A0", fontSize: 14 }}>No tasks yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {myTasks.slice(0, 5).map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid #1E1E2A" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).querySelector("span:first-child") as HTMLElement)?.style && ((e.currentTarget as HTMLDivElement).querySelector(".task-title") as HTMLElement | null) && (((e.currentTarget as HTMLDivElement).querySelector(".task-title") as HTMLElement).style.color = "#F7931A")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).querySelector(".task-title") as HTMLElement | null) && (((e.currentTarget as HTMLDivElement).querySelector(".task-title") as HTMLElement).style.color = "#F0F0F5")}>
                        <div>
                          <div className="task-title" style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F5", marginBottom: 2, transition: "color 0.15s" }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "#7070A0" }}>{formatUSDX(task.amount)} USDX</div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Explore */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Link href="/tasks" style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: "20px", textDecoration: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 24 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>Browse Tasks</div>
                <div style={{ fontSize: 12, color: "#7070A0" }}>Find experience-matched bounties</div>
              </Link>
              <Link href="/leaderboard" style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 12, padding: "20px", textDecoration: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 24 }}>🏆</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>Leaderboard</div>
                <div style={{ fontSize: 12, color: "#7070A0" }}>Top contributors by USDX earned</div>
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Profile card */}
            <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #F7931A, #5546FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "white" }}>
                  {MOCK_WALLET.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#F0F0F5" }}>{MOCK_WALLET.username}</div>
                  <div style={{ fontSize: 11, color: "#7070A0", fontFamily: "var(--font-geist-mono)" }}>{MOCK_WALLET.address.slice(0, 10)}…</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href={`/profile/${MOCK_WALLET.address}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#9090B0", textDecoration: "none", padding: "8px 0", borderBottom: "1px solid #1E1E2A" }}>
                  <span>Public Profile</span><span style={{ color: "#F7931A" }}>→</span>
                </Link>
                <Link href="/settings" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#9090B0", textDecoration: "none", padding: "8px 0" }}>
                  <span>Settings</span><span style={{ color: "#9090B0" }}>→</span>
                </Link>
              </div>
            </div>

            {/* Wave info */}
            <div style={{ background: "#111116", border: "1px solid #F7931A20", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F7931A", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Wave #{MOCK_WAVE.waveId}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#7070A0" }}>Pool</span>
                  <span style={{ color: "#F7931A", fontWeight: 600 }}>{formatUSDX(MOCK_WAVE.poolAmount)} USDX</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#7070A0" }}>Tasks this wave</span>
                  <span style={{ color: "#F0F0F5", fontWeight: 600 }}>{MOCK_WAVE.totalTasks}</span>
                </div>
              </div>
              {MOCK_ROLE === "creator" && (
                <Link href="/creator" style={{ display: "block", textAlign: "center", background: "#F7931A18", border: "1px solid #F7931A30", color: "#F7931A", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, textDecoration: "none" }}>
                  Claim Reward
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
