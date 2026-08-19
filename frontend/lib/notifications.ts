import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail, LOGO_CID } from "@/lib/email";

export type NotificationType =
  | "task_assigned"
  | "work_submitted"
  | "funds_released"
  | "submission_rejected"
  | "grant_vote_opened"
  | "wave_reward_ready"
  | "task_applied"
  | "community_task_joined"
  | "task_comment"
  | "comment_reply";

export interface NotifyMeta {
  taskTitle?: string;
  amount?: string; // human-readable, e.g. "250 MUSD" — already formatted by the caller
  actorAddress?: string; // whoever triggered the event (applicant, contributor, etc.)
}

const COPY: Record<NotificationType, { subject: string; heading: string; verb: string }> = {
  task_assigned:          { subject: "You've been assigned a task",        heading: "You're assigned 🎯",      verb: "assigned you to" },
  work_submitted:         { subject: "Work submitted on your task",        heading: "Work submitted 📤",       verb: "submitted work on" },
  funds_released:         { subject: "Funds released to your wallet",      heading: "Funds released 💸",       verb: "approved and released funds for" },
  submission_rejected:    { subject: "Your submission was not approved",   heading: "Submission rejected 🔁",   verb: "rejected your submission on" },
  grant_vote_opened:      { subject: "A new grant application is open for voting", heading: "Grant vote open 🗳️", verb: "opened voting on" },
  wave_reward_ready:      { subject: "Your wave reward is ready to claim", heading: "Wave reward ready 🌊",     verb: "made a reward claimable for" },
  task_applied:           { subject: "New applicant on your task",         heading: "New applicant 📝",        verb: "applied to" },
  community_task_joined:  { subject: "Someone joined your community task", heading: "New participant 🙋",      verb: "joined" },
  task_comment:           { subject: "New comment on your task",           heading: "New comment 💬",          verb: "commented on" },
  comment_reply:          { subject: "Someone replied to your comment",    heading: "New reply ↩️",            verb: "replied to your comment on" },
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function emailHtml(type: NotificationType, taskId: number | undefined, meta: NotifyMeta) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const link = taskId !== undefined ? `${base}/tasks/${taskId}` : `${base}/dashboard`;
  const { heading, verb } = COPY[type];

  const who = meta.actorAddress ? `<strong>${shortAddr(meta.actorAddress)}</strong>` : "Someone";
  const what = meta.taskTitle ? `<strong>&ldquo;${meta.taskTitle}&rdquo;</strong>` : "your task";
  const sentence = `${who} ${verb} ${what}.`;

  return `
  <div style="background:#F3F0E9; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E3DFD6; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #E0003F, #990070); padding: 20px 28px; display: flex; align-items: center; gap: 10px;">
        <img src="cid:${LOGO_CID}" width="28" height="28" alt="" style="width: 28px; height: 28px; border-radius: 7px; display: block;" />
        <span style="color: #FFFFFF; font-weight: 800; font-size: 18px; letter-spacing: -0.02em;">Taskify</span>
      </div>
      <div style="padding: 28px;">
        <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #171717;">${heading}</h1>
        <p style="margin: 0 0 20px; font-size: 15px; color: #403D37; line-height: 1.6;">${sentence}</p>
        ${meta.amount ? `
        <div style="background: #F1EEE7; border: 1px solid #E3DFD6; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
          <span style="font-size: 12px; color: #6E6B62; text-transform: uppercase; letter-spacing: 0.05em;">Amount</span><br/>
          <span style="font-size: 18px; font-weight: 800; color: #16824F;">${meta.amount}</span>
        </div>` : ""}
        <a href="${link}" style="display: inline-block; background: #E0003F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px;">
          ${taskId !== undefined ? "View Task" : "View Dashboard"} →
        </a>
      </div>
      <div style="border-top: 1px solid #E3DFD6; padding: 16px 28px; background: #F3F0E9;">
        <p style="margin: 0; font-size: 12px; color: #8B877C; line-height: 1.6;">
          You're getting this because it's enabled in your Taskify notification settings.
          <a href="${base}/settings" style="color: #E0003F; text-decoration: none;">Manage preferences</a>
        </p>
      </div>
    </div>
  </div>
  `;
}

// Creates a notification for `recipient` (and mirrors it by email if they've
// set one), unless they've explicitly turned that type off in
// notification_prefs (missing/unset defaults to enabled, so existing rows
// created before a new type shipped still get it). Never throws — a
// notification failing to send shouldn't fail the request that triggered it.
export async function notify(recipient: string, type: NotificationType, taskId?: number, meta: NotifyMeta = {}) {
  if (!supabaseAdmin) return;
  const address = recipient.toLowerCase();

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("notification_prefs, email")
      .eq("address", address)
      .maybeSingle();

    const prefs = (profile?.notification_prefs ?? {}) as Record<string, boolean>;
    if (prefs[type] === false) return;

    // recipient_address has a foreign key into profiles(address).
    await supabaseAdmin.from("profiles").upsert({ address }, { onConflict: "address", ignoreDuplicates: true });

    await supabaseAdmin.from("notifications").insert({
      recipient_address: address,
      type,
      task_id: taskId ?? null,
    });

    if (profile?.email) {
      await sendEmail(profile.email, COPY[type].subject, emailHtml(type, taskId, meta));
    }
  } catch {
    // best-effort — see comment above
  }
}
