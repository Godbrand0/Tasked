"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { authedFetch } from "@/lib/authed-fetch";
import { MUSD_ADDRESS } from "@/lib/taskify";
import { MUSD_DECIMALS } from "@/lib/constants";
import type { OnChainTask } from "@/lib/use-taskify";
import LoadingState from "@/components/ui/LoadingState";

// Admin Analytics tab. Task and money figures are computed from the contract
// (every task, via useAllTasks); people and activity counts come from
// /api/admin/analytics (Supabase).

interface OffChain {
  users: number; usersLast7d: number; usersLast30d: number; signupsByWeek: Record<string, number>;
  applications: number; communityJoins: number; communityWinners: number; contributors: number;
  comments: number; gasDrips: number; openReports: number | null;
}

// Taskify.sol Status enum.
const S = { OPEN: 1, ASSIGNED: 2, IN_PROGRESS: 3, SUBMITTED: 4, RELEASED: 5, CANCELLED: 6, EXPIRED: 7, GRANT_PENDING: 8, GRANT_REJECTED: 9 };
const STATUS_ROWS: { label: string; statuses: number[] }[] = [
  { label: "Open", statuses: [S.OPEN] },
  { label: "In progress", statuses: [S.ASSIGNED, S.IN_PROGRESS] },
  { label: "Submitted", statuses: [S.SUBMITTED] },
  { label: "Paid out", statuses: [S.RELEASED] },
  { label: "Cancelled", statuses: [S.CANCELLED] },
  { label: "Expired", statuses: [S.EXPIRED] },
  { label: "Grant vote", statuses: [S.GRANT_PENDING] },
  { label: "Grant rejected", statuses: [S.GRANT_REJECTED] },
];
const LOCKED = new Set([S.OPEN, S.ASSIGNED, S.IN_PROGRESS, S.SUBMITTED]);
// Fees are kept on release, cancel and expiry (Taskify.sol).
const FEE_TAKEN = new Set([S.RELEASED, S.CANCELLED, S.EXPIRED]);
const SELF_FEE_BPS = BigInt(300);
const GRANT_FEE_BPS = BigInt(500);
const WEEKS = 12;
const DAY = 86400_000;
const BAR = "var(--blue-strong)"; // validated against both chart surfaces

function weekStart(t: number): string {
  const d = new Date(t);
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ((d.getUTCDay() + 6) % 7) * DAY;
  return new Date(monday).toISOString().slice(0, 10);
}

function lastWeeks(n: number): string[] {
  const thisWeek = new Date(weekStart(Date.now())).getTime();
  return Array.from({ length: n }, (_, i) => new Date(thisWeek - (n - 1 - i) * 7 * DAY).toISOString().slice(0, 10));
}

function weekLabel(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

const num = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const money = (raw: bigint) => Number(formatUnits(raw, MUSD_DECIMALS)).toLocaleString(undefined, { maximumFractionDigits: 2 });

type Totals = { posted: bigint; locked: bigint; paid: bigint; fees: bigint };
const zero = (): Totals => ({ posted: BigInt(0), locked: BigInt(0), paid: BigInt(0), fees: BigInt(0) });

export default function AnalyticsPanel({ tasks, address }: { tasks: OnChainTask[] | undefined; address: string }) {
  const [off, setOff] = useState<OffChain | null>(null);
  const [offError, setOffError] = useState("");

  useEffect(() => {
    let cancelled = false;
    authedFetch(`/api/admin/analytics?address=${address}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) setOffError(data?.error ?? "Couldn't load user numbers.");
        else setOff(data as OffChain);
      })
      .catch(() => !cancelled && setOffError("Couldn't load user numbers."));
    return () => { cancelled = true; };
  }, [address]);

  const stats = useMemo(() => {
    const list = tasks ?? [];
    const byToken = { MUSD: zero(), MEZO: zero() };
    const creators = new Set<string>();
    const statusCounts = STATUS_ROWS.map((r) => ({ label: r.label, count: list.filter((t) => r.statuses.includes(t.status)).length }));
    const weeks = lastWeeks(WEEKS);
    const perWeek: Record<string, number> = Object.fromEntries(weeks.map((w) => [w, 0]));

    for (const t of list) {
      creators.add(t.creator.toLowerCase());
      const wk = weekStart(t.createdAt * 1000);
      if (wk in perWeek) perWeek[wk]++;
      // Grant proposals hold no money until a vote passes.
      if (t.status === S.GRANT_PENDING || t.status === S.GRANT_REJECTED) continue;
      const tot = t.token.toLowerCase() === MUSD_ADDRESS.toLowerCase() ? byToken.MUSD : byToken.MEZO;
      const fee = (t.amount * (t.fundingType === 1 ? GRANT_FEE_BPS : SELF_FEE_BPS)) / BigInt(10000);
      tot.posted += t.amount;
      if (LOCKED.has(t.status)) tot.locked += t.amount;
      if (t.status === S.RELEASED) tot.paid += t.amount - fee;
      if (FEE_TAKEN.has(t.status)) tot.fees += fee;
    }

    return {
      total: list.length,
      open: list.filter((t) => t.status === S.OPEN).length,
      completed: list.filter((t) => t.status === S.RELEASED).length,
      community: list.filter((t) => t.kind === 1).length,
      grants: list.filter((t) => t.fundingType === 1).length,
      postedLast30d: list.filter((t) => Date.now() - t.createdAt * 1000 < 30 * DAY).length,
      creators: creators.size,
      byToken,
      statusCounts,
      tasksPerWeek: weeks.map((w) => ({ week: w, count: perWeek[w] })),
    };
  }, [tasks]);

  if (!tasks) return <LoadingState label="Reading tasks from the contract…" />;

  const mezo = stats.byToken.MEZO;
  const hasMezo = mezo.posted > BigInt(0);
  const mezoLine = (v: bigint) => (hasMezo ? `+ ${money(v)} MEZO` : undefined);
  const signupWeeks = lastWeeks(WEEKS).map((w) => ({ week: w, count: off?.signupsByWeek[w] ?? 0 }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <Section title="Money" note="MUSD, from the contract. Paid out is after fees.">
        <Tile label="Total posted" value={money(stats.byToken.MUSD.posted)} sub={mezoLine(mezo.posted)} />
        <Tile label="Locked in open tasks" value={money(stats.byToken.MUSD.locked)} sub={mezoLine(mezo.locked)} />
        <Tile label="Paid to contributors" value={money(stats.byToken.MUSD.paid)} sub={mezoLine(mezo.paid)} />
        <Tile label="Fees charged" value={money(stats.byToken.MUSD.fees)} sub={mezoLine(mezo.fees) ?? "3% self-funded, 5% grant-funded"} />
      </Section>

      <Section title="Tasks">
        <Tile label="Tasks posted" value={num(stats.total)} sub={`${num(stats.postedLast30d)} in the last 30 days`} />
        <Tile label="Open now" value={num(stats.open)} />
        <Tile label="Completed and paid" value={num(stats.completed)} />
        <Tile label="Community tasks" value={num(stats.community)} sub={`${num(stats.total - stats.community)} development`} />
        <Tile label="Grant-funded" value={num(stats.grants)} />
        <Tile label="Task creators" value={num(stats.creators)} />
      </Section>

      <Section title="People and activity" note={offError || undefined}>
        <Tile label="Signed up" value={off ? num(off.users) : "…"} sub={off ? `${num(off.usersLast7d)} this week · ${num(off.usersLast30d)} in 30 days` : undefined} />
        <Tile label="Contributors" value={off ? num(off.contributors) : "…"} sub="Applied to or joined a task" />
        <Tile label="Applications" value={off ? num(off.applications) : "…"} />
        <Tile label="Community joins" value={off ? num(off.communityJoins) : "…"} sub={off ? `${num(off.communityWinners)} winners` : undefined} />
        <Tile label="Comments" value={off ? num(off.comments) : "…"} />
        <Tile label="Gas drips sent" value={off ? num(off.gasDrips) : "…"} />
        {off?.openReports != null && <Tile label="Open reports" value={num(off.openReports)} />}
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 16 }}>
        <WeeklyBars title="Tasks posted per week" data={stats.tasksPerWeek} unit="task" />
        <WeeklyBars title="Sign-ups per week" data={signupWeeks} unit="sign-up" loading={!off && !offError} />
      </div>

      <StatusBars rows={stats.statusCounts} total={stats.total} />
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: 0 }}>{title}</h2>
        {note && <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{note}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: 12 }}>{children}</div>
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const CHART_H = 140;

/** Single-series weekly column chart with a hover/focus value readout and a table view. */
function WeeklyBars({ title, data, unit, loading }: { title: string; data: { week: string; count: number }[]; unit: string; loading?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const shown = active ?? data.length - 1;
  const plural = (n: number) => `${num(n)} ${unit}${n === 1 ? "" : "s"}`;

  return (
    <figure style={{ margin: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
      <figcaption style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{title}</span>
        {!loading && (
          <span aria-live="polite" style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            Week of {weekLabel(data[shown].week)}: <strong style={{ color: "var(--text)" }}>{plural(data[shown].count)}</strong>
          </span>
        )}
      </figcaption>

      {loading ? (
        <div style={{ height: CHART_H + 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--text-dim)" }}>Loading…</div>
      ) : (
        <>
          <div style={{ position: "relative", height: CHART_H, borderBottom: "1px solid var(--border)" }}>
            <span style={{ position: "absolute", top: -2, left: 0, fontSize: 11, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>{num(max)}</span>
            <div style={{ position: "absolute", top: 6, left: 0, right: 0, borderTop: "1px dashed var(--border)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 2 }} onMouseLeave={() => setActive(null)}>
              {data.map((d, i) => (
                <button
                  key={d.week}
                  type="button"
                  aria-label={`Week of ${weekLabel(d.week)}: ${plural(d.count)}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", background: "transparent", border: "none", padding: 0, cursor: "default" }}
                >
                  <span style={{
                    width: "100%",
                    height: d.count === 0 ? 0 : `max(2px, ${((d.count / max) * (CHART_H - 10)).toFixed(1)}px)`,
                    background: BAR,
                    borderRadius: "4px 4px 0 0",
                    opacity: active === null || active === i ? 1 : 0.45,
                    transition: "opacity 0.12s",
                  }} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
            <span>{weekLabel(data[0].week)}</span>
            <span>This week</span>
          </div>
          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 12, color: "var(--text-dim)", cursor: "pointer" }}>Show as table</summary>
            <table style={{ width: "100%", fontSize: 12, color: "var(--text-muted)", marginTop: 8, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
              <thead><tr><th style={{ textAlign: "left", fontWeight: 600 }}>Week of</th><th style={{ textAlign: "right", fontWeight: 600 }}>{unit[0].toUpperCase() + unit.slice(1)}s</th></tr></thead>
              <tbody>{data.map((d) => <tr key={d.week}><td>{weekLabel(d.week)}</td><td style={{ textAlign: "right" }}>{num(d.count)}</td></tr>)}</tbody>
            </table>
          </details>
        </>
      )}
    </figure>
  );
}

/** Tasks by status as a ranked horizontal bar list, values labeled. */
function StatusBars({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
  const visible = rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...visible.map((r) => r.count));
  return (
    <figure style={{ margin: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
      <figcaption style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Tasks by status</figcaption>
      {visible.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No tasks yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(90px, max-content) 1fr auto", gap: "8px 12px", alignItems: "center" }}>
          {visible.map((r) => (
            <div key={r.label} style={{ display: "contents" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{r.label}</span>
              <span style={{ height: 10, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${(r.count / max) * 100}%`, background: BAR, borderRadius: 4 }} />
              </span>
              <span style={{ fontSize: 13, color: "var(--text)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {num(r.count)} <span style={{ color: "var(--text-dim)" }}>({Math.round((r.count / Math.max(1, total)) * 100)}%)</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}
