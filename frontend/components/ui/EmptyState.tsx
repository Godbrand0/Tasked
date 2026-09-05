type Size = "sm" | "lg";

const SIZES: Record<Size, { icon: number; padding: string; titleFont: number; descFont: number; gapIcon: number; gapTitle: number; gapDesc: number }> = {
  sm: { icon: 32, padding: "32px 0", titleFont: 14, descFont: 13, gapIcon: 10, gapTitle: 4, gapDesc: 16 },
  lg: { icon: 40, padding: "80px 0", titleFont: 16, descFont: 14, gapIcon: 16, gapTitle: 8, gapDesc: 20 },
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "lg",
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: Size;
}) {
  const s = SIZES[size];
  return (
    <div style={{ textAlign: "center", padding: s.padding }}>
      <div style={{ display: "flex", justifyContent: "center", color: "var(--text-faint)", marginBottom: s.gapIcon }}>
        <Icon size={s.icon} />
      </div>
      <div style={{ fontSize: s.titleFont, fontWeight: 700, color: "var(--text)", marginBottom: description || action ? s.gapTitle : 0 }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: s.descFont, color: "var(--text-dim)", marginBottom: action ? s.gapDesc : 0 }}>
          {description}
        </div>
      )}
      {action}
    </div>
  );
}
