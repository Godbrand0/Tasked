"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  /** Unix timestamp in seconds (matches the on-chain `deadline`). */
  deadline: number;
  /** Shown once the deadline has passed. Default "Expired". */
  expiredLabel?: string;
  /** Terser output for tight spots like task cards ("3d left" instead of "3d 4h left"). */
  compact?: boolean;
  style?: React.CSSProperties;
}

function format(ms: number, compact: boolean): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (compact) {
    if (d > 0) return `${d}d left`;
    if (h > 0) return `${h}h left`;
    if (m > 0) return `${m}m left`;
    return `${sec}s left`;
  }
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${sec}s left`;
  return `${sec}s left`;
}

/**
 * Live "time left until deadline" label. Ticks on its own (per-second in the
 * final hour, per-30s before that) and turns amber under 24h, red once passed.
 * SSR-safe: renders nothing until mounted so the server and first client render
 * agree.
 */
export default function Countdown({ deadline, expiredLabel = "Expired", compact = false, style }: CountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    let id: ReturnType<typeof setInterval>;
    const schedule = () => {
      const remaining = deadline * 1000 - Date.now();
      const period = remaining > 0 && remaining < 3_600_000 ? 1000 : 30_000;
      id = setInterval(() => {
        setNow(Date.now());
        const next = deadline * 1000 - Date.now();
        const nextPeriod = next > 0 && next < 3_600_000 ? 1000 : 30_000;
        if (nextPeriod !== period) {
          clearInterval(id);
          schedule();
        }
      }, period);
    };
    schedule();
    return () => clearInterval(id);
  }, [deadline]);

  if (now === null) return <span style={style} />;

  const remainingMs = deadline * 1000 - now;
  const expired = remainingMs <= 0;
  const urgent = !expired && remainingMs < 86_400_000;
  const color = expired ? "var(--danger)" : urgent ? "var(--warning)" : "var(--text-muted)";

  return (
    <span style={{ color, fontVariantNumeric: "tabular-nums", ...style }}>
      {expired ? expiredLabel : format(remainingMs, compact)}
    </span>
  );
}
