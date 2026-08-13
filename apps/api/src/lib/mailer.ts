import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

/**
 * Minimal transactional-mail wrapper used directly by Auth for OTP delivery
 * until the full Notifications module (Phase 10) exists with templates,
 * push, and in-app fan-out. Points at Mailhog in dev (docker-compose.dev.yml)
 * so nothing real ever gets emailed while developing.
 */
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transport.sendMail({ from: env.SMTP_FROM, to, subject, html });
  } catch (err) {
    // Email delivery must never fail the request that triggered it — the
    // caller has already committed the OTP/token to the database, so a user
    // who doesn't receive the email can always hit "resend."
    logger.error({ err, to, subject }, "failed to send email");
  }
}

export function otpEmailHtml(code: string): string {
  return `<p>Your FOR YOU verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`;
}
