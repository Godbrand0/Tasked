import { ImageResponse } from "next/og";
import { getTaskPreview } from "@/lib/task-preview";
import { clip } from "@/lib/task-preview-text";
import { Brand, OG, OG_SIZE, Pill } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Taskify task";
// A task's status changes, but a link card doesn't need to be live to the second.
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskPreview(id).catch(() => null);

  if (!task) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: OG.bg, padding: 64 }}>
          <Brand />
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: OG.ink, letterSpacing: -2, lineHeight: 1.1 }}>
            On-chain bounties for the Mezo community
          </div>
          <div style={{ display: "flex", fontSize: 28, color: OG.muted }}>taskifybounties.com</div>
        </div>
      ),
      size,
    );
  }

  const title = clip(task.title, 110);
  const long = title.length > 70;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: OG.bg, padding: 64 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand />
          <div style={{ display: "flex", gap: 12 }}>
            <Pill>{task.kind}</Pill>
            <Pill accent={task.status === "Open"}>{task.status}</Pill>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: long ? 52 : 64, fontWeight: 700, color: OG.ink, letterSpacing: -2, lineHeight: 1.12 }}>
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 24, color: OG.muted, textTransform: "uppercase", letterSpacing: 2 }}>Reward</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: OG.accent, letterSpacing: -3, lineHeight: 1 }}>{task.reward}</div>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: OG.ink }}>{task.symbol}</div>
            </div>
            {task.winners && <div style={{ display: "flex", fontSize: 26, color: OG.muted }}>Up to {task.winners} winners</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 26, color: OG.muted }}>Posted by {clip(task.creatorName, 28)}</div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: OG.ink }}>taskifybounties.com</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
