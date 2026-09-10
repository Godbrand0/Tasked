import Link from "next/link";
import { Task } from "@/lib/mock";
import { formatMUSD } from "@/lib/constants";
import { Badge, TierRangeBadge, StatusBadge } from "./Badge";
import Avatar from "./Avatar";
import Countdown from "./Countdown";
import { IconMegaphone } from "@/components/icons";

const TERMINAL_STATUSES = ["FUNDS_RELEASED", "CANCELLED", "GRANT_REJECTED"];

export default function TaskCard({ task, creatorAvatarUrl, reserveActionSpace = false }: { task: Task; creatorAvatarUrl?: string; reserveActionSpace?: boolean }) {
  return (
    <Link href={`/tasks/${task.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      <div className="card-hover" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <StatusBadge status={task.status} />
          <div style={{ display: "flex", gap: 6 }}>
            {task.kind === "community" && <Badge color="blue"><IconMegaphone size={12} /> Community</Badge>}
            {task.fundingType === "grant" && <Badge color="purple">Grant</Badge>}
          </div>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 8px", lineHeight: 1.4 }}>{task.title}</h3>
        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.description}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Badge color="orange"><span className="figure">{formatMUSD(task.amount)}</span> {task.token}</Badge>
          {task.kind === "community"
            ? <Badge color="gray">Up to {task.maxWinners ?? 1} winner{(task.maxWinners ?? 1) !== 1 ? "s" : ""}</Badge>
            : <TierRangeBadge min={task.experienceMin} max={task.experienceMax} />}
          {task.tags?.slice(0, 2).map((tag) => <Badge key={tag} color="gray">{tag}</Badge>)}
        </div>

        {(() => {
          const count =
            task.kind === "community"
              ? { n: task.submissionCount ?? task.submissions?.length ?? 0, noun: "participant" }
              : task.applicantCount !== undefined
              ? { n: task.applicantCount, noun: "applicant" }
              : null;
          const showCountdown = !TERMINAL_STATUSES.includes(task.status);
          return (
            <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)", marginTop: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (count || showCountdown) ? 6 : 0 }}>
                <Avatar src={creatorAvatarUrl} alt={task.creatorUsername} size={26} fontSize={10} gradient="linear-gradient(135deg, var(--primary), var(--secondary))" />
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{task.creatorUsername}</span>
              </div>
              {(count || showCountdown) && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-dim)", paddingRight: reserveActionSpace ? 96 : 0, minHeight: 18 }}>
                  {showCountdown && <Countdown deadline={task.deadline} compact style={{ fontWeight: 600 }} />}
                  {showCountdown && count && <span>·</span>}
                  {count && <span style={{ whiteSpace: "nowrap" }}>{count.n} {count.noun}{count.n !== 1 ? "s" : ""}</span>}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </Link>
  );
}
