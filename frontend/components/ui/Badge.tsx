import { TIERS, PATRON_TIERS, TASK_STATUSES } from "@/lib/constants";

type Color = "orange" | "purple" | "green" | "blue" | "gray" | "gold" | "red";

const COLORS: Record<Color, { bg: string; text: string; border: string }> = {
  orange: { bg: "color-mix(in srgb, var(--primary) 9%, transparent)", text: "var(--primary)", border: "color-mix(in srgb, var(--primary) 19%, transparent)" },
  purple: { bg: "color-mix(in srgb, var(--secondary) 9%, transparent)", text: "var(--secondary-light)", border: "color-mix(in srgb, var(--secondary) 19%, transparent)" },
  green:  { bg: "color-mix(in srgb, var(--success) 9%, transparent)", text: "var(--success)", border: "color-mix(in srgb, var(--success) 19%, transparent)" },
  blue:   { bg: "color-mix(in srgb, var(--blue-strong) 9%, transparent)", text: "var(--blue)", border: "color-mix(in srgb, var(--blue-strong) 19%, transparent)" },
  gray:   { bg: "var(--neutral-tint)", text: "var(--text-muted)", border: "var(--border)" },
  gold:   { bg: "color-mix(in srgb, var(--gold) 9%, transparent)", text: "var(--gold)", border: "color-mix(in srgb, var(--gold) 19%, transparent)" },
  red:    { bg: "color-mix(in srgb, var(--danger-strong) 9%, transparent)", text: "var(--danger)", border: "color-mix(in srgb, var(--danger-strong) 19%, transparent)" },
};

export function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: Color }) {
  const s = COLORS[color];
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: "var(--radius-sm)", padding: "3px 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.02em", display: "inline-flex", alignItems: "center", gap: 5 }}>
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier: number }) {
  const t = TIERS.find((x) => x.id === tier) ?? TIERS[0];
  return (
    <span style={{ background: t.bg, color: t.color, border: `1px solid ${t.color}30`, borderRadius: "var(--radius-sm)", padding: "3px 10px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      Tier {t.id} · {t.label}
    </span>
  );
}

export function TierRangeBadge({ min, max }: { min: number; max: number }) {
  const lo = TIERS.find((x) => x.id === min) ?? TIERS[0];
  const hi = TIERS.find((x) => x.id === max) ?? TIERS[4];
  const sameColor = lo.id === hi.id;
  return (
    <span style={{ background: lo.bg, color: lo.color, border: `1px solid ${lo.color}30`, borderRadius: "var(--radius-sm)", padding: "3px 10px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {sameColor ? lo.label : `${lo.label} – ${hi.label}`}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = TASK_STATUSES[status] ?? { label: status, color: "var(--text-muted)", bg: "var(--neutral-tint)" };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30`, borderRadius: "var(--radius-sm)", padding: "3px 10px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

export function PatronTierBadge({ tier }: { tier: number }) {
  const t = PATRON_TIERS.find((x) => x.id === tier);
  if (!t || t.id === 99) return null;
  return (
    <span style={{ background: t.bg, color: t.color, border: `1px solid ${t.color}30`, borderRadius: "var(--radius-sm)", padding: "3px 10px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {t.label}
    </span>
  );
}
