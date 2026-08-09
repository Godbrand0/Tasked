"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatUnits } from "viem";
import Navbar from "@/components/Navbar";
import { Badge, TierBadge, StatusBadge } from "@/components/ui/Badge";
import { formatMUSD, TIERS, MUSD_DECIMALS } from "@/lib/constants";
import { useAllTasks, useTaskifyUser, mapOnChainTask } from "@/lib/use-taskify";

export default function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { user, isLoading: userLoading } = useTaskifyUser(address);
  const { data: onchainTasks } = useAllTasks();
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    fetch(`/api/profile?address=${address}`)
      .then((res) => res.json())
      .then((data: { profile?: { github_avatar_url?: string; x_avatar_url?: string } }) =>
        setAvatarUrl(data.profile?.github_avatar_url || data.profile?.x_avatar_url || "")
      )
      .catch(() => {});
  }, [address]);

  const myTasks = useMemo(
    () => (onchainTasks ?? [])
      .filter(t => t.assignee?.toLowerCase() === address.toLowerCase())
      .map(t => mapOnChainTask(t, user.username)),
    [onchainTasks, address, user.username]
  );
  const completedTasks = myTasks.filter((t) => t.status === "FUNDS_RELEASED");
  const appliedTasks = myTasks.filter((t) => t.status !== "FUNDS_RELEASED");

  const tier = TIERS[user.experienceLevel] ?? TIERS[0];
  const totalEarnedHuman = Number(formatUnits(user.totalEarned, MUSD_DECIMALS));
  const displayName = user.username || `${address.slice(0, 6)}…${address.slice(-4)}`;

  if (userLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 600, margin: "100px auto", textAlign: "center", padding: "0 24px", color: "var(--text-dim)" }}>Loading profile…</div>
      </div>
    );
  }

  if (!user.role) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Navbar />
        <div style={{ maxWidth: 600, margin: "100px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Not registered</h1>
          <p style={{ fontSize: 14, color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)" }}>{address}</p>
          <Link href="/leaderboard" style={{ color: "var(--primary)", textDecoration: "none" }}>← Back to leaderboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
        {/* Profile header */}
        <div style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--bg-alt) 100%)", border: "1px solid var(--border)", borderRadius: 20, padding: "40px 40px 32px", marginBottom: 32, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, background: `radial-gradient(ellipse, ${tier.color}10 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{ width: 80, height: 80, borderRadius: 20, overflow: "hidden", position: "relative", background: avatarUrl ? "var(--surface-2)" : `linear-gradient(135deg, ${tier.color}, var(--secondary))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "white", flexShrink: 0 }}>
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill sizes="80px" style={{ objectFit: "cover" }} />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: 0 }}>{displayName}</h1>
                {user.githubVerified && <Badge color="green">✓ GitHub Verified</Badge>}
                {user.role === 2 && <TierBadge tier={user.experienceLevel} />}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)", marginBottom: 14 }}>{address}</div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Tasks Completed",  value: String(user.tasksCompleted),        color: "var(--success)" },
                  { label: "Total Earned",     value: `${formatMUSD(totalEarnedHuman)} MUSD`, color: "var(--primary)" },
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]" style={{ gap: 28, alignItems: "start" }}>
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
                          <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>{formatMUSD(task.amount)} MUSD</div>
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
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: i < appliedTasks.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{task.title}</div>
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
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
                {user.role === 2 && (
                  <>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Experience Tier</div>
                      <TierBadge tier={user.experienceLevel} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Years Experience</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{tier.years}</div>
                    </div>
                  </>
                )}
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>GitHub</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: user.githubVerified ? "var(--success)" : "var(--text-dim)" }}>
                    {user.githubVerified ? `@${displayName}` : "Not verified"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Registered</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
                    {user.registeredAt > 0 ? new Date(user.registeredAt * 1000).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Experience breakdown */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Earnings Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Total Earned</span>
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>{formatMUSD(totalEarnedHuman)} MUSD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Tasks Completed</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{user.tasksCompleted}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Avg per task</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>
                    {user.tasksCompleted > 0 ? formatMUSD(totalEarnedHuman / user.tasksCompleted) : "—"} MUSD
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
