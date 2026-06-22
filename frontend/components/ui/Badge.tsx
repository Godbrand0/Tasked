import { TIERS, PATRON_TIERS, TASK_STATUSES } from "@/lib/constants";

type Color = "orange" | "purple" | "green" | "blue" | "gray" | "gold" | "red";

const COLORS: Record<Color, { bg: string; text: string; border: string }> = {
  orange: { bg: "#F7931A18", text: "#F7931A", border: "#F7931A30" },
  purple: { bg: "#5546FF18", text: "#8B80FF", border: "#5546FF30" },
  green:  { bg: "#00D39518", text: "#00D395", border: "#00D39530" },
  blue:   { bg: "#3B82F618", text: "#60A5FA", border: "#3B82F630" },
  gray:   { bg: "#FFFFFF0D", text: "#9090B0", border: "#FFFFFF18" },
  gold:   { bg: "#FFD70018", text: "#FFD700", border: "#FFD70030" },
  red:    { bg: "#EF444418", text: "#F87171", border: "#EF444430" },
};

export function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: Color }) {
  const s = COLORS[color];
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.02em", display: "inline-flex", alignItems: "center", gap: 5 }}>
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier: number }) {
  const t = TIERS.find((x) => x.id === tier) ?? TIERS[0];
  return (
    <span style={{ background: t.bg, color: t.color, border: `1px solid ${t.color}30`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      Tier {t.id} · {t.label}
    </span>
  );
}

export function TierRangeBadge({ min, max }: { min: number; max: number }) {
  const lo = TIERS.find((x) => x.id === min) ?? TIERS[0];
  const hi = TIERS.find((x) => x.id === max) ?? TIERS[4];
  const sameColor = lo.id === hi.id;
  return (
    <span style={{ background: lo.bg, color: lo.color, border: `1px solid ${lo.color}30`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {sameColor ? lo.label : `${lo.label} – ${hi.label}`}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = TASK_STATUSES[status] ?? { label: status, color: "#9090B0", bg: "#FFFFFF0D" };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

export function PatronTierBadge({ tier }: { tier: number }) {
  const t = PATRON_TIERS.find((x) => x.id === tier);
  if (!t || t.id === 99) return null;
  return (
    <span style={{ background: t.bg, color: t.color, border: `1px solid ${t.color}30`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {t.label}
    </span>
  );
}
