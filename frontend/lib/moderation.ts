import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notify, type NotificationType } from "@/lib/notifications";
import { getTaskInfo } from "@/lib/task-onchain";
import { ADMIN_WALLETS } from "@/lib/admins";

export { isAdmin } from "@/lib/admins";

// Task moderation (see supabase/migrations/0020_task_moderation.sql).
//
// Tasks are on-chain and only their creator can cancel them, so all of this
// controls what Taskify *shows*: a task that matches a flagged keyword is held
// for review (hidden from everyone but its creator) until an admin approves
// it, and admins can hide any task. Reports never hide anything on their own;
// they alert the admins.

export async function notifyAdmins(type: NotificationType, taskId: number, meta: { taskTitle?: string; actorAddress?: string } = {}) {
  await Promise.all([...ADMIN_WALLETS].map((admin) => notify(admin, type, taskId, meta)));
}

export type ModerationStatus = "live" | "pending_review" | "approved" | "hidden";

/** Status values that keep a task off Taskify's public lists. */
export const NOT_VISIBLE: readonly ModerationStatus[] = ["pending_review", "hidden"];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Flagged terms that appear in `text` as whole words (case-insensitive; a
 * phrase matches across any run of whitespace, plurals count). "gun" matches
 * "buy guns" but not "begun"; "seed phrase" matches "Seed   Phrase".
 */
export function findFlaggedTerms(text: string, terms: readonly string[]): string[] {
  const haystack = text.toLowerCase();
  const hits: string[] = [];
  for (const term of terms) {
    const pattern = term.split(/\s+/).map(escapeRegex).join("\\s+");
    // Optional "s"/"es" so plurals match too ("casinos", "weapons").
    if (new RegExp(`(^|[^a-z0-9])${pattern}(e?s)?($|[^a-z0-9])`, "i").test(haystack)) hits.push(term);
  }
  return hits;
}

/**
 * Screens a task's on-chain title plus its saved description and tags, and
 * holds it for review if anything matches (or if its creator is blocked).
 * Safe to call repeatedly: an approved task only goes back to review when a
 * new term shows up that the admin hasn't already seen, and a hidden task
 * stays hidden.
 *
 * Returns the task's resulting status.
 */
export async function screenTask(taskId: number): Promise<ModerationStatus> {
  if (!supabaseAdmin) return "live";

  const info = await getTaskInfo(taskId);
  if (!info) return "live";

  const [{ data: content }, { data: keywords }, { data: existing }, { data: standing }] = await Promise.all([
    supabaseAdmin.from("task_content").select("description, tags").eq("task_id", taskId).maybeSingle(),
    supabaseAdmin.from("moderation_keywords").select("term"),
    supabaseAdmin.from("task_moderation").select("status, approved_terms").eq("task_id", taskId).maybeSingle(),
    supabaseAdmin.from("creator_standing").select("status").eq("address", info.creator).maybeSingle(),
  ]);

  if (existing?.status === "hidden") return "hidden";

  const text = [info.title, content?.description ?? "", ...((content?.tags as string[] | null) ?? [])].join("\n");
  const flagged = findFlaggedTerms(text, (keywords ?? []).map((k) => k.term as string));
  const creatorBlocked = standing?.status === "blocked";

  const approvedTerms = new Set((existing?.approved_terms as string[] | null) ?? []);
  const newTerms = flagged.filter((t) => !approvedTerms.has(t));
  const needsReview = newTerms.length > 0 || (creatorBlocked && existing?.status !== "approved");

  if (!needsReview) return existing?.status === "approved" ? "approved" : existing?.status === "pending_review" ? "pending_review" : "live";
  if (existing?.status === "pending_review") {
    await supabaseAdmin.from("task_moderation")
      .update({ flagged_terms: flagged, updated_at: new Date().toISOString() })
      .eq("task_id", taskId);
    return "pending_review";
  }

  await supabaseAdmin.from("task_moderation").upsert({
    task_id: taskId,
    status: "pending_review",
    flagged_terms: flagged,
    note: creatorBlocked && newTerms.length === 0 ? "Posted by a blocked creator" : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "task_id" });
  await notifyAdmins("task_flagged", taskId, { taskTitle: info.title, actorAddress: info.creator });
  return "pending_review";
}
