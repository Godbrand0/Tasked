"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Badge, TierBadge, StatusBadge, PatronTierBadge } from "@/components/ui/Badge";
import { MOCK_WALLET, MOCK_TASKS, MOCK_WAVE } from "@/lib/mock";
import { formatMUSD, TIERS } from "@/lib/constants";

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
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Welcome banner */}
        <div style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--bg-alt) 100%)", border: "1px solid color-mix(in srgb, var(--primary) 13%, transparent)", borderRadius: 20, padding: "32px 36px", marginBottom: 40, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, background: "radial-gradient(ellipse, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 6 }}>Welcome back</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>{MOCK_WALLET.username}</h1>
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
                <Link href="/creator" style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", color: "var(--primary)", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, textDecoration: "none" }}>Creator Dashboard</Link>
              )}
              {MOCK_ROLE === "contributor" && (
                <Link href="/contributor" style={{ background: "color-mix(in srgb, var(--secondary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--secondary) 19%, transparent)", color: "var(--secondary-light)", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, textDecoration: "none" }}>Contributor Dashboard</Link>
              )}
              {MOCK_ROLE === "investor" && (
                <Link href="/investor" style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 10, textDecoration: "none" }}>Patron Dashboard</Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]" style={{ gap: 32, alignItems: "start" }}>
          <div>
            {/* Overview stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 14, marginBottom: 36 }}>
              {MOCK_ROLE === "creator" && [
                { label: "Tasks Posted",   value: String(myTasks.length),               color: "var(--primary)" },
                { label: "Active",         value: String(activeTasks.length),            color: "var(--blue)" },
                { label: "MUSD Escrowed", value: `${formatMUSD(totalEscrowed)}`,         color: "var(--success)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</div>
                </div>
              ))}
              {MOCK_ROLE === "contributor" && [
                { label: "Tasks Done",    value: String(MOCK_WALLET.tasksCompleted),              color: "var(--success)" },
                { label: "Total Earned",  value: `${formatMUSD(MOCK_WALLET.totalEarned)} MUSD`,   color: "var(--primary)" },
                { label: "Experience",    value: tier.label,                                       color: tier.color },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>Recent Tasks</h2>
                <Link href={MOCK_ROLE === "creator" ? "/creator" : "/contributor"} style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none" }}>View all →</Link>
              </div>
              {myTasks.slice(0, 5).length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-dim)", fontSize: 14 }}>No tasks yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {myTasks.slice(0, 5).map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).querySelector("span:first-child") as HTMLElement)?.style && ((e.currentTarget as HTMLDivElement).querySelector(".task-title") as HTMLElement | null) && (((e.currentTarget as HTMLDivElement).querySelector(".task-title") as HTMLElement).style.color = "var(--primary)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).querySelector(".task-title") as HTMLElement | null) && (((e.currentTarget as HTMLDivElement).querySelector(".task-title") as HTMLElement).style.color = "var(--text)")}>
                        <div>
                          <div className="task-title" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2, transition: "color 0.15s" }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatMUSD(task.amount)} MUSD</div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Explore */}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
              <Link href="/tasks" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px", textDecoration: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 24 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Browse Tasks</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Find experience-matched bounties</div>
              </Link>
              <Link href="/leaderboard" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px", textDecoration: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 24 }}>🏆</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Leaderboard</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Top contributors by MUSD earned</div>
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Profile card */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "white" }}>
                  {MOCK_WALLET.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{MOCK_WALLET.username}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)" }}>{MOCK_WALLET.address.slice(0, 10)}…</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href={`/profile/${MOCK_WALLET.address}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--text-muted)", textDecoration: "none", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span>Public Profile</span><span style={{ color: "var(--primary)" }}>→</span>
                </Link>
                <Link href="/settings" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--text-muted)", textDecoration: "none", padding: "8px 0" }}>
                  <span>Settings</span><span style={{ color: "var(--text-muted)" }}>→</span>
                </Link>
              </div>
            </div>

            {/* Wave info */}
            <div style={{ background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--primary) 13%, transparent)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Wave #{MOCK_WAVE.waveId}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Pool</span>
                  <span style={{ color: "var(--primary)", fontWeight: 600 }}>{formatMUSD(MOCK_WAVE.poolAmount)} MUSD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Tasks this wave</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{MOCK_WAVE.totalTasks}</span>
                </div>
              </div>
              {MOCK_ROLE === "creator" && (
                <Link href="/creator" style={{ display: "block", textAlign: "center", background: "color-mix(in srgb, var(--primary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", color: "var(--primary)", fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 10, textDecoration: "none" }}>
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
