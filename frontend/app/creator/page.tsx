"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/ui/TaskCard";
import Avatar from "@/components/ui/Avatar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { formatMUSD, MUSD_DECIMALS } from "@/lib/constants";
import { useWallet, formatAddress } from "@/lib/wallet-context";
import {
  useAllTasks,
  useCurrentWave,
  useTaskifyTx,
  useUsersBatch,
  useWaveClaimed,
  useWaveCreatorTasks,
  mapOnChainTask,
} from "@/lib/use-taskify";

export default function CreatorPage() {
  const { username, githubVerified, avatarUrl } = useWallet();
  const { address } = useAccount();
  const { send } = useTaskifyTx();
  const displayAddress = address ?? "";
  const displayUsername = username || formatAddress(displayAddress);

  const { data: onchainTasks } = useAllTasks();
  const { data: usersByAddress } = useUsersBatch((onchainTasks ?? []).map(t => t.creator));
  const allTasks = useMemo(
    () => (onchainTasks ?? []).map(t => mapOnChainTask(t, usersByAddress?.[t.creator.toLowerCase()] ?? "")),
    [onchainTasks, usersByAddress]
  );

  const myTasks = allTasks.filter((t) => address && t.creator.toLowerCase() === address.toLowerCase());
  const openTasks = myTasks.filter((t) => t.status === "OPEN");
  const activeTasks = myTasks.filter((t) => ["ASSIGNED", "IN_PROGRESS", "SUBMITTED"].includes(t.status));
  const completedTasks = myTasks.filter((t) => t.status === "FUNDS_RELEASED");
  // Grant applications sit at GRANT_PENDING until a patron vote resolves
  // them — no funds are locked yet (applyForGrant doesn't escrow up front),
  // so they're tracked separately from the escrowed-tasks buckets above.
  const grantPendingTasks = myTasks.filter((t) => t.status === "GRANT_PENDING");
  // Catch-all for terminal statuses that never made it into a dedicated
  // section — without this a cancelled/expired/rejected task disappears
  // from the dashboard entirely, same class of gap as GRANT_PENDING above.
  const closedTasks = myTasks.filter((t) => ["CANCELLED", "EXPIRED", "GRANT_REJECTED"].includes(t.status));
  const totalEscrowed = myTasks
    .filter((t) => ["OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED"].includes(t.status))
    .reduce((s, t) => s + t.amount, 0);

  const { wave } = useCurrentWave();
  const { count: myWaveTasks } = useWaveCreatorTasks(wave.waveId, address);
  const previousWaveId = wave.waveId > 1 ? wave.waveId - 1 : undefined;
  const { count: myPrevWaveTasks } = useWaveCreatorTasks(previousWaveId, address);
  const { claimed: prevWaveClaimed, refetch: refetchClaimed } = useWaveClaimed(previousWaveId, address);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [approvingTaskId, setApprovingTaskId] = useState<number | null>(null);

  const poolAmountHuman = Number(formatUnits(wave.poolAmount, MUSD_DECIMALS));
  const waveShare = wave.totalTasks > 0 ? Math.round((myWaveTasks / wave.totalTasks) * poolAmountHuman) : 0;
  const canClaim = previousWaveId !== undefined && myPrevWaveTasks > 0 && !prevWaveClaimed;

  async function handleClaimWave() {
    if (previousWaveId === undefined) return;
    setClaiming(true);
    setClaimError("");
    try {
      await send("claimWaveReward", [BigInt(previousWaveId)]);
      await refetchClaimed();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  async function handleApproveRelease(taskId: number, assignee?: string) {
    setApprovingTaskId(taskId);
    try {
      await send("approveAndRelease", [BigInt(taskId)]);
      if (assignee) {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient: assignee, type: "funds_released", taskId }),
        }).catch(() => {});
      }
    } catch {
      // errors surfaced on the task detail page
    } finally {
      setApprovingTaskId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar src={avatarUrl} alt={displayUsername} size={52} radius={14} fontSize={20} gradient="linear-gradient(135deg, var(--primary), var(--primary-strong))" />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>{displayUsername}</h1>
                {githubVerified && <Badge color="green">GitHub Verified</Badge>}
                <Badge color="orange">Owner</Badge>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-geist-mono)" }}>{displayAddress.slice(0, 12)}…{displayAddress.slice(-6)}</div>
            </div>
          </div>
          <Link href="/create" style={{ background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "12px 22px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            + Post New Task
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Tasks Posted",    value: String(myTasks.length),           color: "var(--primary)", icon: "📋" },
            { label: "Active Tasks",    value: String(activeTasks.length),        color: "var(--blue)", icon: "⚡" },
            { label: "Completed",       value: String(completedTasks.length),     color: "var(--success)", icon: "✓"  },
            { label: "Total Escrowed",  value: `${formatMUSD(totalEscrowed)} MUSD`, color: "var(--primary)", icon: "🔒" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]" style={{ gap: 32, alignItems: "start" }}>
          {/* Tasks list */}
          <div>
            {/* Active */}
            {activeTasks.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Needs Attention</h2>
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {activeTasks.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, transition: "border-color 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatMUSD(task.amount)} MUSD · Task #{task.id}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                          <StatusBadge status={task.status} />
                          {task.status === "SUBMITTED" && (
                            <button
                              disabled={approvingTaskId === task.id}
                              onClick={(e) => { e.preventDefault(); handleApproveRelease(task.id, task.assignee); }}
                              style={{ background: "color-mix(in srgb, var(--success) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 19%, transparent)", color: "var(--success)", fontWeight: 700, fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: approvingTaskId === task.id ? "not-allowed" : "pointer", opacity: approvingTaskId === task.id ? 0.7 : 1 }}>
                              {approvingTaskId === task.id ? "Confirming…" : "Approve & Release"}
                            </button>
                          )}
                          {task.status === "OPEN" && task.kind === "development" && (
                            <span style={{ background: "color-mix(in srgb, var(--blue) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--blue) 19%, transparent)", color: "var(--blue)", fontWeight: 700, fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
                              Review Applicants →
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Grant applications awaiting patron vote */}
            {grantPendingTasks.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Grant Applications</h2>
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{grantPendingTasks.length} task{grantPendingTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {grantPendingTasks.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, transition: "border-color 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatMUSD(task.amount)} MUSD requested · Task #{task.id} · awaiting patron vote</div>
                        </div>
                        <StatusBadge status={task.status} />
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
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Open Tasks</h2>
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{openTasks.length} task{openTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {openTasks.map((task) => <TaskCard key={task.id} task={task} creatorAvatarUrl={avatarUrl} />)}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedTasks.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Completed</h2>
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{completedTasks.length} task{completedTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {completedTasks.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, opacity: 0.7 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatMUSD(task.amount)} MUSD paid</div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Closed — cancelled, expired, or grant-rejected */}
            {closedTasks.length > 0 && (
              <div style={{ marginTop: 36 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Closed</h2>
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{closedTasks.length} task{closedTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {closedTasks.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, opacity: 0.7 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatMUSD(task.amount)} MUSD · Task #{task.id}</div>
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
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>No tasks posted yet</div>
                <Link href="/create" style={{ color: "var(--primary)", fontSize: 14, textDecoration: "none" }}>Post your first task →</Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Wave reward */}
            <div style={{ background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Wave #{wave.waveId} Reward</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", marginBottom: 4 }}>{formatMUSD(waveShare)} MUSD</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>Estimated share from {formatMUSD(poolAmountHuman)} MUSD pool</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Your tasks this wave</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{myWaveTasks}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Total tasks in wave</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{wave.totalTasks}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Wave pool</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{formatMUSD(poolAmountHuman)} MUSD</span>
                </div>
              </div>
              <button disabled={!canClaim || claiming} onClick={handleClaimWave} style={{ width: "100%", background: "color-mix(in srgb, var(--primary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", color: "var(--primary)", fontWeight: 700, fontSize: 14, padding: "11px", borderRadius: 10, cursor: (canClaim && !claiming) ? "pointer" : "not-allowed", opacity: canClaim ? 1 : 0.5 }}>
                {claiming ? "Confirming…" : prevWaveClaimed ? "Already Claimed" : canClaim ? "Claim Previous Wave Reward" : "No Reward to Claim Yet"}
              </button>
              {claimError && <div style={{ fontSize: 11, color: "var(--danger)", textAlign: "center", marginTop: 8 }}>{claimError}</div>}
              <div style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", marginTop: 8 }}>Wave advances when the owner calls advanceWave (~30 days)</div>
            </div>

            {/* Quick actions */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Quick Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/create" style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", color: "var(--primary)", fontWeight: 600, fontSize: 14, padding: "11px 16px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>+</span> Post a new task
                </Link>
                <Link href="/create?type=grant" style={{ background: "color-mix(in srgb, var(--secondary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--secondary) 19%, transparent)", color: "var(--secondary-light)", fontWeight: 600, fontSize: 14, padding: "11px 16px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🏛</span> Apply for grant
                </Link>
                <Link href={`/profile/${displayAddress}`} style={{ background: "var(--neutral-tint)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, padding: "11px 16px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
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
