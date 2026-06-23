/**
 * lib/email/resend.ts
 *
 * Resend client singleton and safe send wrapper.
 *
 * Design decisions:
 *   - Email sending is NON-BLOCKING: errors are logged but never thrown.
 *     This prevents email failures from breaking the primary user action
 *     (e.g. a signup should succeed even if the welcome email fails).
 *   - In development without a real RESEND_API_KEY, all sends are no-ops
 *     with a console.log so you can see what would be sent.
 *   - The sender address is configurable via EMAIL_FROM env var.
 */
import { Resend } from "resend";

// ─── Client ──────────────────────────────────────────────────────────────────

let _client: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_placeholder" || apiKey.startsWith("re_placeholder")) {
    return null; // placeholder — dev mode
  }
  if (!_client) {
    _client = new Resend(apiKey);
  }
  return _client;
}

// ─── Send helper ─────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * sendEmail — Fire-and-forget safe wrapper.
 * Returns true if the send was attempted (real API call made).
 * Returns false if running in placeholder/dev mode.
 * NEVER throws — all errors are logged.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const client = getResendClient();
  const from = process.env.EMAIL_FROM ?? "Digital Heroes <noreply@digitalheroes.co.in>";

  if (!client) {
    // Dev mode placeholder — log what would be sent
    console.log("[Email:DEV] Would send email:", {
      from,
      to: options.to,
      subject: options.subject,
    });
    return false;
  }

  try {
    const { error } = await client.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });

    if (error) {
      console.error("[Email] Resend API error:", error);
      return false;
    }

    console.info("[Email] Sent:", options.subject, "→", options.to);
    return true;
  } catch (err) {
    console.error("[Email] Unexpected send error:", err);
    return false;
  }
}
