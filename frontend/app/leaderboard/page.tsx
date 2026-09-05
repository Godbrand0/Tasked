"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import PageShell, { Container } from "@/components/ui/PageShell";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import { IconTrophy, IconMedal, IconCheck } from "@/components/icons";
import { formatMUSD, MUSD_DECIMALS } from "@/lib/constants";
import { MUSD_ADDRESS } from "@/lib/taskify";
import { useAllTasks, useCurrentWave, useUsersBatchFull, useProfilesBatch } from "@/lib/use-taskify";

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

interface LeaderboardEntry {
  address: string;
  username: string;
  avatarUrl?: string;
  githubVerified: boolean;
  selfFundedTasksPosted: number;
}

export default function LeaderboardPage() {
  const { data: onchainTasks } = useAllTasks();
  const { wave } = useCurrentWave();
  const poolAmountHuman = Number(formatUnits(wave.poolAmount, MUSD_DECIMALS));

  // Mirrors _escrowSelfFunded's counting rule exactly: only self-funded
  // tasks paid in MUSD, created since this wave started, count toward the
  // creator leaderboard / wave reward.
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of onchainTasks ?? []) {
      if (t.fundingType !== 0) continue; // Self only
      if (t.token.toLowerCase() !== MUSD_ADDRESS.toLowerCase()) continue;
      if (t.createdAt < wave.startTime) continue;
      const key = t.creator.toLowerCase();
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [onchainTasks, wave.startTime]);

  const creatorAddresses = Object.keys(counts);
  const { data: usersByAddress } = useUsersBatchFull(creatorAddresses);
  const { data: profilesByAddress } = useProfilesBatch(creatorAddresses);

  const sorted: LeaderboardEntry[] = useMemo(() => {
    return creatorAddresses
      .map((address) => {
        const profile = profilesByAddress?.[address];
        return {
          address,
          username: profile?.displayName || usersByAddress?.[address]?.username || `${address.slice(0, 6)}…${address.slice(-4)}`,
          avatarUrl: profile?.avatarUrl ?? undefined,
          githubVerified: usersByAddress?.[address]?.githubVerified ?? false,
          selfFundedTasksPosted: counts[address],
        };
      })
      .sort((a, b) => b.selfFundedTasksPosted - a.selfFundedTasksPosted);
  }, [creatorAddresses, usersByAddress, profilesByAddress, counts]);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  function waveShare(tasksPosted: number) {
    return wave.totalTasks > 0 ? (poolAmountHuman * tasksPosted) / wave.totalTasks : 0;
  }

  return (
    <PageShell>
      <Container maxWidth={900} style={{ padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
            <IconTrophy size={14} /> Leaderboard
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text)", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Top Owners</h1>
          <p style={{ fontSize: 16, color: "var(--text-dim)", margin: "0 auto", maxWidth: 520, textAlign: "justify" }}>
            Ranked by self-funded tasks posted this wave (Wave #{wave.waveId}). Grant-funded tasks don't count; only owners who commit their own MUSD earn wave rewards.
          </p>
        </div>

        {sorted.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
            <EmptyState size="lg" icon={IconTrophy} title="No self-funded tasks posted this wave yet" />
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 48, alignItems: "end" }}>
              {[top3[1], top3[0], top3[2]].map((creator, visualIdx) => {
                if (!creator) return <div key={visualIdx} />;
                const rank = sorted.indexOf(creator);
                const heights = [160, 200, 140];
                return (
                  <Link key={creator.address} href={`/profile/${creator.address}`} style={{ textDecoration: "none" }}>
                    <div className="card-hover" style={{ background: rank === 0 ? "linear-gradient(180deg, color-mix(in srgb, var(--primary) 9%, transparent) 0%, var(--surface) 100%)" : "var(--surface)", border: `1px solid ${rank === 0 ? "color-mix(in srgb, var(--primary) 25%, transparent)" : "var(--border)"}`, borderRadius: 16, padding: "24px 20px", textAlign: "center", height: heights[visualIdx], display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                        <IconMedal size={28} color={MEDAL_COLORS[rank]} />
                      </div>
                      <div style={{ margin: "0 auto 10px" }}>
                        <Avatar src={creator.avatarUrl} alt={creator.username} size={40} fontSize={16} gradient="linear-gradient(135deg, var(--primary), var(--secondary))" />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{creator.username}</div>
                      <div className="figure" style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", marginTop: 10 }}>{creator.selfFundedTasksPosted}</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>self-funded tasks</div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Full table */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 120px 80px", gap: 0, padding: "12px 24px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 600 }}>
                <span>#</span>
                <span>Owner</span>
                <span style={{ textAlign: "center" }}>Tasks Posted</span>
                <span style={{ textAlign: "right" }}>Est. Wave Share</span>
                <span style={{ textAlign: "center" }}>GitHub</span>
              </div>

              {sorted.map((creator, i) => (
                <Link key={creator.address} href={`/profile/${creator.address}`} style={{ textDecoration: "none" }}>
                  <div className="table-row" style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 120px 80px", gap: 0, padding: "16px 24px", borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", transition: "background var(--duration-fast) ease", minWidth: 600 }}>
                    <div className="figure" style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? "var(--primary)" : "var(--text-dim)" }}>{i + 1}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar src={creator.avatarUrl} alt={creator.username} size={36} fontSize={14} gradient={`linear-gradient(135deg, hsl(${(i * 60) % 360}, 70%, 50%), hsl(${(i * 60 + 120) % 360}, 70%, 50%))`} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{creator.username}</div>
                    </div>
                    <div className="figure" style={{ textAlign: "center", fontSize: 15, fontWeight: 700, color: "var(--success)" }}>{creator.selfFundedTasksPosted}</div>
                    <div style={{ textAlign: "right" }}>
                      <div className="figure" style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)" }}>{formatMUSD(waveShare(creator.selfFundedTasksPosted))}</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>MUSD</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {creator.githubVerified
                        ? <span style={{ color: "var(--success)" }}><IconCheck size={14} /></span>
                        : <span style={{ fontSize: 12, color: "var(--border-strong)" }}>N/A</span>}
                    </div>
                  </div>
                </Link>
              ))}
              </div>
            </div>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text-dim)" }}>
          Rankings reset every wave epoch (~30 days) · <Link href="/create" style={{ color: "var(--primary)", textDecoration: "none" }}>Post a task →</Link>
        </div>
      </Container>
    </PageShell>
  );
}
