"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import PageShell, { Container } from "@/components/ui/PageShell";
import TaskCard from "@/components/ui/TaskCard";
import Avatar from "@/components/ui/Avatar";
import { Badge, TierBadge, StatusBadge } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { IconCheck, IconCoins, IconAward, IconTarget } from "@/components/icons";
import { formatMUSD, formatEarnedBreakdown, TIERS } from "@/lib/constants";
import { useWallet, formatAddress } from "@/lib/wallet-context";
import { useAllTasks, useAppliedTaskIds, useTaskifyTx, useUsersBatch, useProfilesBatch, mapOnChainTask } from "@/lib/use-taskify";
import { formatContractError } from "@/lib/errors";

export default function ContributorPage() {
  const { username, experienceLevel, tasksCompleted, connected, isRegistered, avatarUrl } = useWallet();
  const { address } = useAccount();
  const { send } = useTaskifyTx();
  const [showAll, setShowAll] = useState(false);
  const [tierChoice, setTierChoice] = useState(experienceLevel);
  const [updatingTier, setUpdatingTier] = useState(false);
  const [tierError, setTierError] = useState("");
  const [submittingActive, setSubmittingActive] = useState(false);
  const displayName = (connected && isRegistered && username) ? username : formatAddress(address ?? "");
  const myTier = (connected && isRegistered) ? experienceLevel : 0;

  const { data: onchainTasks } = useAllTasks();
  const { data: usersByAddress } = useUsersBatch((onchainTasks ?? []).map(t => t.creator));
  const { data: profilesByAddress } = useProfilesBatch((onchainTasks ?? []).map(t => t.creator));
  const allTasks = useMemo(
    () => (onchainTasks ?? []).map(t => {
      const addr = t.creator.toLowerCase();
      const onchainUsername = usersByAddress?.[addr] ?? "";
      const profile = profilesByAddress?.[addr];
      return mapOnChainTask(t, profile?.displayName || onchainUsername);
    }),
    [onchainTasks, usersByAddress, profilesByAddress]
  );

  const openDevTasks = allTasks.filter(t => t.status === "OPEN" && t.kind === "development");
  const matchedTasks = openDevTasks.filter((t) => t.experienceMin <= myTier && t.experienceMax >= myTier);
  const outOfRangeTasks = openDevTasks.filter((t) => !(t.experienceMin <= myTier && t.experienceMax >= myTier));

  const { data: appliedIds } = useAppliedTaskIds(openDevTasks.map(t => t.id), address);
  const appliedTasks = allTasks.filter((t) => appliedIds?.includes(t.id));
  const activeTask = allTasks.find((t) => t.assignee && address && t.assignee.toLowerCase() === address.toLowerCase() && ["ASSIGNED", "IN_PROGRESS", "SUBMITTED"].includes(t.status));

  // task.assignee is never set for community tasks — winners are paid
  // directly via selectWinners(), not assigned — so wins there have to be
  // looked up from community_submissions instead of on-chain task data.
  const [wonCommunityTaskIds, setWonCommunityTaskIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!address) return;
    fetch(`/api/submissions?address=${address}`)
      .then(res => res.json())
      .then((data: { submissions?: { task_id: number }[] }) =>
        setWonCommunityTaskIds(new Set((data.submissions ?? []).map(s => s.task_id)))
      )
      .catch(() => {});
  }, [address]);

  const completedTasks = allTasks.filter(t =>
    t.status === "FUNDS_RELEASED" &&
    ((t.assignee && address && t.assignee.toLowerCase() === address.toLowerCase()) || wonCommunityTaskIds.has(t.id))
  );

  const displayedExtra = showAll ? outOfRangeTasks : [];

  async function handleUpdateTier() {
    setUpdatingTier(true);
    setTierError("");
    try {
      await send("updateExperience", [tierChoice]);
    } catch (err) {
      setTierError(formatContractError(err, "Failed to update tier. Check the 1-day cooldown."));
    } finally {
      setUpdatingTier(false);
    }
  }

  async function handleSubmitActive() {
    if (!activeTask) return;
    setSubmittingActive(true);
    try {
      await send("submitTask", [BigInt(activeTask.id)]);
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: activeTask.creator, type: "work_submitted", taskId: activeTask.id }),
      }).catch(() => {});
    } catch {
      // surfaced via task detail page on next visit
    } finally {
      setSubmittingActive(false);
    }
  }

  return (
    <PageShell>
      <Container maxWidth={1200} style={{ padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar src={avatarUrl} alt={displayName} size={52} fontSize={20} gradient="linear-gradient(135deg, var(--secondary), var(--secondary-light))" />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>{displayName}</h1>
                <Badge color="purple">Contributor</Badge>
              </div>
              <TierBadge tier={myTier} />
            </div>
          </div>
          {/* Solid fill matches the visual weight of the creator dashboard's primary CTA, kept in the contributor page's own secondary/purple accent rather than switching to the site-wide red primary */}
          <Link href="/tasks" className="btn-motion" style={{ background: "var(--secondary)", color: "var(--on-primary)", border: "none", fontWeight: 700, fontSize: 14, padding: "12px 22px", borderRadius: 10, textDecoration: "none" }}>
            Browse All Tasks
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Tasks Completed", value: String(tasksCompleted), color: "var(--success)", icon: IconCheck, figure: true },
            { label: "Total Earned",    value: formatEarnedBreakdown(completedTasks), color: "var(--primary)", icon: IconCoins, figure: true },
            { label: "Experience Tier", value: TIERS[myTier].label,                          color: TIERS[myTier].color, icon: IconAward, figure: false },
            { label: "Matched Tasks",   value: String(matchedTasks.length),                  color: "var(--blue)", icon: IconTarget, figure: true },
          ].map(({ label, value, color, icon: Icon, figure }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ color, marginBottom: 10 }}><Icon size={20} /></div>
              <div className={figure ? "figure" : undefined} style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]" style={{ gap: 32, alignItems: "start" }}>
          <div>
            {/* Active task */}
            {activeTask && (
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 16px" }}>Active Task</h2>
                <div style={{ background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--primary) 19%, transparent)", borderRadius: 14, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <StatusBadge status={activeTask.status} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{formatMUSD(activeTask.amount)} {activeTask.token}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 16px" }}>{activeTask.title}</h3>
                  <div style={{ display: "flex", gap: 10 }}>
                    {activeTask.status === "IN_PROGRESS" && (
                      <button disabled={submittingActive} onClick={handleSubmitActive} className="btn-motion" style={{ background: "var(--primary)", color: "var(--bg)", fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 10, border: "none", cursor: submittingActive ? "not-allowed" : "pointer", opacity: submittingActive ? 0.7 : 1 }}>
                        {submittingActive ? "Confirming…" : "Submit Work"}
                      </button>
                    )}
                    <Link href={`/tasks/${activeTask.id}`} className="btn-motion" style={{ background: "var(--neutral-tint)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, padding: "10px 20px", borderRadius: 10, textDecoration: "none" }}>
                      View Task
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Completed */}
            {completedTasks.length > 0 && (
              <div style={{ marginBottom: 36 }}>
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
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatMUSD(task.amount)} {task.token} earned</div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Matched tasks */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Matched for You</h2>
                  <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "justify", margin: 0 }}>Tasks within your {TIERS[myTier].label} experience tier</p>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{matchedTasks.length} task{matchedTasks.length !== 1 ? "s" : ""}</span>
              </div>
              {matchedTasks.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {matchedTasks.map((task) => <TaskCard key={task.id} task={task} creatorAvatarUrl={profilesByAddress?.[task.creator.toLowerCase()]?.avatarUrl ?? undefined} />)}
                </div>
              ) : (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 }}>
                  <EmptyState size="sm" icon={IconTarget} title="No matched tasks right now" description="Check back soon, or browse all tasks below" />
                </div>
              )}
            </div>

            {/* Out of range toggle */}
            {outOfRangeTasks.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <button onClick={() => setShowAll(!showAll)} className="btn-motion"
                  style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)", fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer", marginBottom: 16 }}>
                  {showAll ? "Hide" : "Show"} {outOfRangeTasks.length} tasks outside your tier
                </button>
                {showAll && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, opacity: 0.55 }}>
                    {displayedExtra.map((task) => <TaskCard key={task.id} task={task} creatorAvatarUrl={profilesByAddress?.[task.creator.toLowerCase()]?.avatarUrl ?? undefined} />)}
                  </div>
                )}
              </div>
            )}

            {/* Applied tasks */}
            {appliedTasks.length > 0 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 16px" }}>Applications</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {appliedTasks.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <div className="border-hover" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, transition: "border-color var(--duration-fast) ease" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatMUSD(task.amount)} {task.token}</div>
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
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>On-Chain Reputation</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Experience Tier</span>
                  <TierBadge tier={myTier} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Tasks Completed</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>{tasksCompleted}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Total Earned</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{formatEarnedBreakdown(completedTasks)}</span>
                </div>
              </div>
              <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
              {address && (
                <Link href={`/profile/${address}`} style={{ display: "block", textAlign: "center", color: "var(--secondary-light)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  View public profile →
                </Link>
              )}
            </div>

            {/* Update experience */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Update Experience</div>
              <p style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "justify", lineHeight: 1.6, marginBottom: 14 }}>Calls <code style={{ color: "var(--primary)", fontSize: 11 }}>updateExperience</code> on-chain. 1-day cooldown after update.</p>
              <select value={tierChoice} onChange={e => setTierChoice(Number(e.target.value))}
                style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "var(--text)", outline: "none", cursor: "pointer", marginBottom: 10 }}>
                {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label} · {t.years}</option>)}
              </select>
              <button disabled={updatingTier} onClick={handleUpdateTier} className="btn-motion" style={{ width: "100%", background: "color-mix(in srgb, var(--secondary) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--secondary) 19%, transparent)", color: "var(--secondary-light)", fontWeight: 700, fontSize: 14, padding: "10px", borderRadius: 10, cursor: updatingTier ? "not-allowed" : "pointer", opacity: updatingTier ? 0.7 : 1 }}>
                {updatingTier ? "Confirming…" : "Update Tier"}
              </button>
              {tierError && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{tierError}</div>}
            </div>
          </div>
        </div>
      </Container>
    </PageShell>
  );
}
