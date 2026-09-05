// Base pulsing placeholder box, plus content-shaped compositions
// (SkeletonCard, SkeletonRow) for the two most common loading layouts in
// the app. Prefer these over LoadingState wherever the loading area has a
// known shape (a task grid, a stat row) — a spinner/text block makes the
// layout jump when content arrives; a matching skeleton doesn't.
export function Skeleton({ width = "100%", height = 14, radius = 6, style }: { width?: number | string; height?: number; radius?: number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

// Mirrors TaskCard's layout: badge row, title, two description lines, tag
// row, footer with avatar + name.
export function SkeletonCard() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Skeleton width={80} height={20} radius={6} />
        <Skeleton width={60} height={20} radius={6} />
      </div>
      <Skeleton width="85%" height={16} radius={4} style={{ marginBottom: 10 }} />
      <Skeleton width="100%" height={13} radius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="70%" height={13} radius={4} style={{ marginBottom: 18 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <Skeleton width={70} height={20} radius={6} />
        <Skeleton width={90} height={20} radius={6} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <Skeleton width={26} height={26} radius={999} />
        <Skeleton width={80} height={12} radius={4} />
      </div>
    </div>
  );
}

// "stat" mirrors a bordered stat box (value line over a label line).
// "list" mirrors a borderless list row: title+subtitle on the left, a
// badge-shaped chip on the right, bottom divider.
export function SkeletonRow({ variant = "stat" }: { variant?: "stat" | "list" }) {
  if (variant === "list") {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid var(--border)" }}>
        <div>
          <Skeleton width={140} height={14} radius={4} style={{ marginBottom: 6 }} />
          <Skeleton width={70} height={12} radius={4} />
        </div>
        <Skeleton width={64} height={20} radius={6} />
      </div>
    );
  }
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
      <Skeleton width="50%" height={20} radius={4} style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height={12} radius={4} />
    </div>
  );
}
