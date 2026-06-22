import Link from "next/link";
import { Task } from "@/lib/mock";
import { formatUSDX } from "@/lib/constants";
import { Badge, TierRangeBadge, StatusBadge } from "./Badge";

export default function TaskCard({ task }: { task: Task }) {
  return (
    <Link href={`/tasks/${task.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div style={{ background: "#111116", border: "1px solid #1E1E2A", borderRadius: 16, padding: 24, transition: "border-color 0.15s, box-shadow 0.15s", cursor: "pointer" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#F7931A40"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(247,147,26,0.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1E1E2A"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <StatusBadge status={task.status} />
          {task.fundingType === "grant" && <Badge color="purple">Grant</Badge>}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F5", margin: "0 0 8px", lineHeight: 1.4 }}>{task.title}</h3>
        <p style={{ fontSize: 13, color: "#7070A0", margin: "0 0 16px", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.description}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Badge color="orange">{formatUSDX(task.amount)} USDX</Badge>
          <TierRangeBadge min={task.experienceMin} max={task.experienceMax} />
          {task.tags?.slice(0, 2).map((tag) => <Badge key={tag} color="gray">{tag}</Badge>)}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid #1E1E2A" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #F7931A, #5546FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>
              {task.creatorUsername.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "#9090B0", fontWeight: 500 }}>{task.creatorUsername}</span>
          </div>
          {task.applicantCount !== undefined && (
            <span style={{ fontSize: 12, color: "#7070A0" }}>{task.applicantCount} applicant{task.applicantCount !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
