import { ImageResponse } from "next/og";
import { Brand, OG, OG_SIZE } from "@/lib/og";

// Site-wide link card: every page without its own (the task page has one) shares this.
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Taskify: on-chain bounties for the Mezo community";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: OG.bg, padding: 72 }}>
        <Brand />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: OG.ink, letterSpacing: -3, lineHeight: 1.05 }}>
            On-chain bounties for the Mezo community
          </div>
          <div style={{ display: "flex", fontSize: 32, color: OG.muted, lineHeight: 1.35 }}>
            Rewards held in escrow and paid out automatically when the work is approved.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: OG.accent }}>taskifybounties.com</div>
      </div>
    ),
    size,
  );
}
