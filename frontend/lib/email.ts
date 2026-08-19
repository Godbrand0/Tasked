import "server-only";
import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import { join } from "path";

// Generic SMTP transport — works with Gmail (host smtp.gmail.com + an App
// Password), a transactional provider's SMTP endpoint (Resend, SendGrid,
// Postmark, etc.), or a self-hosted mail server. Configure via env vars;
// email sending silently no-ops if they're unset, same pattern as
// supabaseAdmin — a missing integration should never break the request
// that triggered it.

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ?? "587";
  const user = process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE === "true" || Number(port) === 465,
    auth: { user, pass },
  });
  return transporter;
}

// Embedded (not linked) so the logo renders even for recipients whose mail
// client blocks remote images by default — referenced in template HTML via
// `<img src="cid:${LOGO_CID}">`.
export const LOGO_CID = "taskify-logo";
let logoAttachment: { filename: string; path: string; cid: string } | null | undefined;

function getLogoAttachment() {
  if (logoAttachment !== undefined) return logoAttachment;
  try {
    const path = join(process.cwd(), "public", "logo-email.png");
    readFileSync(path); // confirms the asset exists before nodemailer lazily reads it per-send
    logoAttachment = { filename: "logo.png", path, cid: LOGO_CID };
  } catch {
    logoAttachment = null;
  }
  return logoAttachment;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (!t) return;

  const logo = getLogoAttachment();

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USERNAME,
      to,
      subject,
      html,
      attachments: logo ? [logo] : undefined,
    });
  } catch {
    // best-effort — a failed email should never fail the request that
    // triggered the underlying in-app notification
  }
}
