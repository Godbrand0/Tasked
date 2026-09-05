import Navbar from "@/components/Navbar";

// Outer app-page wrapper: full-height background + Navbar. Doesn't force a
// max-width container since pages differ on whether they need one wide
// content column (Container below) or several full-bleed bands each with
// their own inner container (see app/tasks/page.tsx).
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />
      {children}
    </div>
  );
}

export function Container({
  children,
  maxWidth = 1200,
  style,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  style?: React.CSSProperties;
}) {
  return <div style={{ maxWidth, margin: "0 auto", padding: "0 24px", ...style }}>{children}</div>;
}
