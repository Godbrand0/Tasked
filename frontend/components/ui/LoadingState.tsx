import { IconSpinner } from "@/components/icons";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { icon: number; padding: string; font: number; gap: number }> = {
  sm: { icon: 20, padding: "16px 0", font: 12, gap: 8 },
  md: { icon: 24, padding: "32px 0", font: 13, gap: 10 },
  lg: { icon: 28, padding: "80px 0", font: 16, gap: 16 },
};

export default function LoadingState({ label, size = "md" }: { label: string; size?: Size }) {
  const s = SIZES[size];
  return (
    <div style={{ textAlign: "center", padding: s.padding, color: "var(--text-dim)" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: s.gap }}>
        <IconSpinner size={s.icon} />
      </div>
      <div style={{ fontSize: s.font, fontWeight: 600, color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
