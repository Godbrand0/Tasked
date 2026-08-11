import Link from "next/link";
import { Task } from "@/lib/mock";
import { formatMUSD } from "@/lib/constants";
import { Badge, TierRangeBadge, StatusBadge } from "./Badge";

export default function TaskCard({ task }: { task: Task }) {
  return (
    <Link href={`/tasks/${task.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, transition: "border-color 0.15s, box-shadow 0.15s", cursor: "pointer" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px color-mix(in srgb, var(--primary) 8%, transparent)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <StatusBadge status={task.status} />
          <div style={{ display: "flex", gap: 6 }}>
            {task.kind === "community" && <Badge color="blue">📣 Community</Badge>}
            {task.fundingType === "grant" && <Badge color="purple">Grant</Badge>}
          </div>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 8px", lineHeight: 1.4 }}>{task.title}</h3>
        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.description}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Badge color="orange">{formatMUSD(task.amount)} MUSD</Badge>
          {task.kind === "community"
            ? <Badge color="gray">Up to {task.maxWinners ?? 1} winner{(task.maxWinners ?? 1) !== 1 ? "s" : ""}</Badge>
            : <TierRangeBadge min={task.experienceMin} max={task.experienceMax} />}
          {task.tags?.slice(0, 2).map((tag) => <Badge key={tag} color="gray">{tag}</Badge>)}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>
              {task.creatorUsername.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{task.creatorUsername}</span>
          </div>
          {task.kind === "community"
            ? (() => {
                const count = task.submissionCount ?? task.submissions?.length ?? 0;
                return <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{count} participant{count !== 1 ? "s" : ""}</span>;
              })()
            : task.applicantCount !== undefined && (
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{task.applicantCount} applicant{task.applicantCount !== 1 ? "s" : ""}</span>
            )}
        </div>
      </div>
    </Link>
  );
}
