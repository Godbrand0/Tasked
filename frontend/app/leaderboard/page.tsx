"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Badge, TierBadge } from "@/components/ui/Badge";
import { MOCK_LEADERBOARD } from "@/lib/mock";
import { formatUSDX } from "@/lib/constants";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const sorted = [...MOCK_LEADERBOARD].sort((a, b) => b.totalEarned - a.totalEarned);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F7931A12", border: "1px solid #F7931A28", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "#F7931A", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
            🏆 Leaderboard
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#F0F0F5", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Top Contributors</h1>
          <p style={{ fontSize: 16, color: "#7070A0", margin: 0 }}>Ranked by total USDX earned. On-chain reputation, permanently yours.</p>
        </div>

        {/* Top 3 podium */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 48, alignItems: "end" }}>
          {[top3[1], top3[0], top3[2]].map((user, visualIdx) => {
            if (!user) return <div key={visualIdx} />;
            const rank = sorted.indexOf(user);
            const heights = [160, 200, 140];
            return (
              <Link key={user.address} href={`/profile/${user.address}`} style={{ textDecoration: "none" }}>
                <div style={{ background: rank === 0 ? "linear-gradient(180deg, #F7931A18 0%, #111116 100%)" : "#111116", border: `1px solid ${rank === 0 ? "#F7931A40" : "#1E1E2A"}`, borderRadius: 16, padding: "24px 20px", textAlign: "center", height: heights[visualIdx], display: "flex", flexDirection: "column", justifyContent: "flex-end", transition: "transform 0.15s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "translateY(0)")}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{MEDALS[rank]}</div>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #F7931A, #5546FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "white", margin: "0 auto 10px" }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5", marginBottom: 4 }}>{user.username}</div>
                  <TierBadge tier={user.experienceLevel} />
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#F7931A", marginTop: 10 }}>{formatUSDX(user.totalEarned)}</div>
                  <div style={{ fontSize: 11, color: "#7070A0" }}>USDX earned</div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Full table */}
        <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 16, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 140px 100px 80px", gap: 0, padding: "12px 24px", borderBottom: "1px solid #1E1E2A", fontSize: 11, fontWeight: 700, color: "#7070A0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <span>#</span>
            <span>Contributor</span>
            <span style={{ textAlign: "right" }}>USDX Earned</span>
            <span style={{ textAlign: "center" }}>Tasks Done</span>
            <span style={{ textAlign: "center" }}>GitHub</span>
          </div>

          {sorted.map((user, i) => (
            <Link key={user.address} href={`/profile/${user.address}`} style={{ textDecoration: "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 140px 100px 80px", gap: 0, padding: "16px 24px", borderBottom: i < sorted.length - 1 ? "1px solid #1E1E2A" : "none", alignItems: "center", transition: "background 0.15s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#18181F")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}>
                <div style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? "#F7931A" : "#7070A0" }}>{i + 1}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, hsl(${(i * 60) % 360}, 70%, 50%), hsl(${(i * 60 + 120) % 360}, 70%, 50%))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F5" }}>{user.username}</div>
                    <TierBadge tier={user.experienceLevel} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#F7931A" }}>{formatUSDX(user.totalEarned)}</div>
                  <div style={{ fontSize: 11, color: "#7070A0" }}>USDX</div>
                </div>
                <div style={{ textAlign: "center", fontSize: 15, fontWeight: 700, color: "#00D395" }}>{user.tasksCompleted}</div>
                <div style={{ textAlign: "center" }}>
                  {user.githubVerified
                    ? <span style={{ fontSize: 12, color: "#00D395" }}>✓</span>
                    : <span style={{ fontSize: 12, color: "#2E2E3A" }}>—</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#7070A0" }}>
          Rankings update on-chain after each completed task · <Link href="/tasks" style={{ color: "#F7931A", textDecoration: "none" }}>Find work →</Link>
        </div>
      </div>
    </div>
  );
}
