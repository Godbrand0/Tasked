import "server-only";
import { readFileSync } from "fs";
import { join } from "path";

// Shared bits for the link-card images (opengraph-image routes).
export const OG_SIZE = { width: 1200, height: 630 };
export const OG = { bg: "#0A0A0F", surface: "#131313", border: "#262626", ink: "#F2F1EE", muted: "#A8A49A", accent: "#FF004D" };

let logo: string | null | undefined;
/** The Taskify logo as a data URI (the image renderer can't fetch relative URLs), or null if the file is missing. */
export function logoDataUri(): string | null {
  if (logo !== undefined) return logo;
  try {
    logo = `data:image/jpeg;base64,${readFileSync(join(process.cwd(), "public", "logo.jpg")).toString("base64")}`;
  } catch {
    logo = null;
  }
  return logo;
}

export function Brand() {
  const src = logoDataUri();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {src && <img src={src} width={56} height={56} style={{ borderRadius: 14 }} alt="" />}
      <div style={{ fontSize: 38, fontWeight: 700, color: OG.ink, letterSpacing: -1 }}>Taskify</div>
    </div>
  );
}

export function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: "flex", padding: "8px 20px", borderRadius: 999, fontSize: 26, fontWeight: 600,
      color: accent ? OG.accent : OG.muted, border: `2px solid ${accent ? OG.accent : OG.border}`, background: OG.surface }}>
      {children}
    </div>
  );
}
