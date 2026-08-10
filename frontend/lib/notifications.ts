import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";

export type NotificationType =
  | "task_assigned"
  | "work_submitted"
  | "funds_released"
  | "grant_vote_opened"
  | "wave_reward_ready"
  | "task_applied"
  | "community_task_joined";

const EMAIL_COPY: Record<NotificationType, { subject: string; body: string }> = {
  task_assigned: { subject: "You've been assigned a task on Taskify", body: "A creator assigned you to a task." },
  work_submitted: { subject: "Work submitted on your Taskify task", body: "A contributor submitted work on one of your tasks." },
  funds_released: { subject: "MUSD released to your wallet", body: "Your task was approved and funds were released to your wallet." },
  grant_vote_opened: { subject: "A new grant application is open for voting", body: "A grant application just entered its voting window." },
  wave_reward_ready: { subject: "Your wave reward is ready to claim", body: "A wave epoch just ended and you have a reward to claim." },
  task_applied: { subject: "New applicant on your Taskify task", body: "Someone applied to one of your tasks." },
  community_task_joined: { subject: "Someone joined your community task", body: "A new participant joined one of your community tasks." },
};

function emailHtml(body: string, taskId?: number) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const link = taskId !== undefined ? `${base}/tasks/${taskId}` : `${base}/dashboard`;
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 15px; color: #171717; line-height: 1.6;">${body}</p>
      <a href="${link}" style="display: inline-block; margin-top: 12px; background: #E0003F; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 14px;">
        View on Taskify →
      </a>
    </div>
  `;
}

// Creates a notification for `recipient` (and mirrors it by email if they've
// set one), unless they've explicitly turned that type off in
// notification_prefs (missing/unset defaults to enabled, so existing rows
// created before a new type shipped still get it). Never throws — a
// notification failing to send shouldn't fail the request that triggered it.
export async function notify(recipient: string, type: NotificationType, taskId?: number) {
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
      const { subject, body } = EMAIL_COPY[type];
      await sendEmail(profile.email, subject, emailHtml(body, taskId));
    }
  } catch {
    // best-effort — see comment above
  }
}
