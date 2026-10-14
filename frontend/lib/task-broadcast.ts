// Decides whether a task may be broadcast to new-task subscribers, from facts
// read off the contract (never from the client). Pure, so it can be unit-tested.

export const BROADCAST_WINDOW_MS = 15 * 60 * 1000;
const STATUS_OPEN = 1;
const FUNDING_SELF = 0;
const KIND_COMMUNITY = 1;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface ChainTask {
  creator: string;
  title: string;
  amount: bigint;
  token: string;
  status: number;
  fundingType: number;
  kind: number;
  createdAt: bigint;
}

export type BroadcastDecision =
  | { ok: true; type: "new_dev_task" | "new_community_task" }
  | { ok: false; reason: "not_found" | "not_open" | "not_self_funded" | "too_old" };

export function decideBroadcast(task: ChainTask | null, nowMs: number): BroadcastDecision {
  if (!task || task.creator.toLowerCase() === ZERO_ADDRESS) return { ok: false, reason: "not_found" };
  if (task.status !== STATUS_OPEN) return { ok: false, reason: "not_open" };
  // A grant-funded task isn't open for work until its vote passes; announcing it now would be premature.
  if (task.fundingType !== FUNDING_SELF) return { ok: false, reason: "not_self_funded" };
  if (nowMs - Number(task.createdAt) * 1000 > BROADCAST_WINDOW_MS) return { ok: false, reason: "too_old" };
  return { ok: true, type: task.kind === KIND_COMMUNITY ? "new_community_task" : "new_dev_task" };
}
