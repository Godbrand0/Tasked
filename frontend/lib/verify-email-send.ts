import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail, LOGO_CID } from "@/lib/email";
import { mintVerifyToken, verifySecret } from "@/lib/email-verify";

// At most one confirmation email per address per hour, counted across ALL
// profiles. POST /api/profile is unauthenticated, so without this anyone could
// type a stranger's address into several profiles (or hammer "resend") and use
// our mailbox to pester them.
export const RESEND_COOLDOWN_MS = 60 * 60 * 1000;

function html(link: string) {
  return `
  <div style="background:#F3F0E9; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E3DFD6; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #E0003F, #990070); padding: 20px 28px;">
        <img src="cid:${LOGO_CID}" width="28" height="28" alt="" style="width: 28px; height: 28px; border-radius: 7px; vertical-align: middle;" />
        <span style="color: #FFFFFF; font-weight: 800; font-size: 18px; letter-spacing: -0.02em; margin-left: 10px; vertical-align: middle;">Taskify</span>
      </div>
      <div style="padding: 28px;">
        <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #171717;">Confirm your email</h1>
        <p style="margin: 0 0 20px; font-size: 15px; color: #403D37; line-height: 1.6;">Someone entered this address in their Taskify notification settings. Confirm it to receive Taskify alerts, including new-task alerts if you turn them on.</p>
        <a href="${link}" style="display: inline-block; background: #E0003F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px;">Confirm email →</a>
        <p style="margin: 20px 0 0; font-size: 12px; color: #8B877C; line-height: 1.6;">This link expires in 7 days. If you didn't ask for this, ignore this email and nothing will be sent to you.</p>
      </div>
    </div>
  </div>`;
}

export type SendVerification = "sent" | "cooldown" | "unavailable";

/** Sends the confirmation link for `address`'s current email, unless one went to this inbox within the last hour. */
export async function sendVerificationEmail(address: string, email: string): Promise<SendVerification> {
  const secret = verifySecret();
  if (!supabaseAdmin || !secret) return "unavailable";

  const cutoff = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("profiles")
    .select("address")
    .eq("email", email)
    .gte("email_verification_sent_at", cutoff)
    .limit(1);
  if (recent && recent.length > 0) return "cooldown";

  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const link = `${base}/api/verify-email?token=${encodeURIComponent(mintVerifyToken(secret, address, email))}`;
  await supabaseAdmin
    .from("profiles")
    .update({ email_verification_sent_at: new Date().toISOString() })
    .eq("address", address.toLowerCase());
  await sendEmail(email, "Confirm your email for Taskify", html(link));
  return "sent";
}
