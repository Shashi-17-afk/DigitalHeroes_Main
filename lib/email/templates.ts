/**
 * lib/email/templates.ts
 *
 * All transactional email HTML templates for Digital Heroes.
 * Uses self-contained inline HTML/CSS — no JSX, no build step needed,
 * compatible with all major email clients.
 *
 * PRD §13 email events:
 *   - Welcome (signup)
 *   - Draw result broadcast (monthly draw published)
 *   - Winner alert (you matched numbers)
 *   - Verification approved (payment coming)
 *   - Verification rejected (resubmit)
 *   - Payment failed (subscription past due)
 *   - Subscription activated (welcome to platform)
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://digitalheroes.co.in";
const BRAND_COLOR = "#6366f1";
const GREEN = "#4ade80";
const RED = "#f87171";
const YELLOW = "#fbbf24";
const BG = "#0a0f1e";
const CARD_BG = "#111827";
const TEXT = "#f1f5f9";
const MUTED = "#94a3b8";

// ─── Base Layout ─────────────────────────────────────────────────────────────

function baseLayout(content: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Digital Heroes</title>
  ${previewText ? `<div style="display:none;overflow:hidden;max-height:0;mso-hide:all;">${previewText}&#847;&zwnj;&nbsp;</div>` : ""}
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TEXT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="font-size:28px;">⛳</span>
              <span style="font-size:18px;font-weight:800;color:${TEXT};letter-spacing:-0.02em;margin-left:8px;">Digital Heroes</span>
            </td>
          </tr>
          <!-- Content card -->
          <tr>
            <td style="background-color:${CARD_BG};border-radius:16px;border:1px solid rgba(255,255,255,0.08);padding:40px 36px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:12px;color:${MUTED};line-height:1.6;">
              <p style="margin:0 0 4px;">Digital Heroes · Golf · Give · Win</p>
              <p style="margin:0 0 4px;">
                <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">Visit Website</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/dashboard" style="color:${BRAND_COLOR};text-decoration:none;">Your Dashboard</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:rgba(148,163,184,0.5);">
                You received this email because you have an account on Digital Heroes.<br/>
                Payments secured by Razorpay.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string, color = BRAND_COLOR): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:${color};border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
    </td>
  </tr>
</table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />`;
}

// ─── 1. Welcome Email ─────────────────────────────────────────────────────────

export interface WelcomeEmailData {
  fullName: string;
  email: string;
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const firstName = data.fullName.split(" ")[0];
  return {
    subject: "Welcome to Digital Heroes ⛳",
    html: baseLayout(
      `<h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:${TEXT};">Welcome, ${firstName}! 👋</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">
        You've joined Digital Heroes — where golf meets giving. Here's what to do next:
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${[
          ["💳", "Subscribe to a plan", "Choose monthly or yearly to unlock draw entries."],
          ["⛳", "Log your Stableford scores", "Your 5 most recent scores become your monthly draw numbers."],
          ["💚", "Pick a charity", "Choose where a portion of your subscription goes each month."],
          ["🎰", "Win monthly prizes", "Match 3, 4, or all 5 drawn numbers to win a share of the prize pool."],
        ].map(([icon, title, desc]) => `
          <tr>
            <td style="padding:10px 0;vertical-align:top;width:36px;font-size:20px;">${icon}</td>
            <td style="padding:10px 0 10px 12px;vertical-align:top;">
              <div style="font-weight:700;color:${TEXT};font-size:14px;margin-bottom:2px;">${title}</div>
              <div style="color:${MUTED};font-size:13px;line-height:1.5;">${desc}</div>
            </td>
          </tr>`).join("")}
      </table>
      ${divider()}
      ${ctaButton(`${APP_URL}/pricing`, "Choose a Plan →")}
      <p style="margin:0;font-size:13px;color:${MUTED};">
        Questions? Reply to this email and we'll get back to you.
      </p>`,
      `Welcome to Digital Heroes, ${firstName}! Set up your account to start playing.`
    ),
  };
}

// ─── 2. Subscription Activated ────────────────────────────────────────────────

export interface SubscriptionActivatedEmailData {
  fullName: string;
  email: string;
  planType: string; // "monthly" | "yearly"
  periodEnd: string; // ISO date string
}

export function subscriptionActivatedEmail(data: SubscriptionActivatedEmailData): { subject: string; html: string } {
  const firstName = data.fullName.split(" ")[0];
  const plan = data.planType === "yearly" ? "Yearly" : "Monthly";
  const renewalDate = new Date(data.periodEnd).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  return {
    subject: `✅ Subscription activated — ${plan} plan`,
    html: baseLayout(
      `<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${TEXT};">You're in, ${firstName}! ✅</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">
        Your <strong style="color:${TEXT};">${plan} subscription</strong> is now active. You're ready to enter monthly draws and support your chosen charity.
      </p>
      <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(99,102,241,0.08);border-radius:12px;padding:20px;border:1px solid rgba(99,102,241,0.2);">
        <tr>
          <td style="font-size:13px;color:${MUTED};padding-bottom:8px;">Plan</td>
          <td style="font-size:13px;font-weight:700;color:${TEXT};text-align:right;">${plan}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:${MUTED};">Next renewal</td>
          <td style="font-size:13px;font-weight:700;color:${TEXT};text-align:right;">${renewalDate}</td>
        </tr>
      </table>
      ${divider()}
      ${ctaButton(`${APP_URL}/dashboard/scores`, "Enter Your Scores →")}`,
      `Your ${plan} Digital Heroes subscription is now active.`
    ),
  };
}

// ─── 3. Draw Result Broadcast ─────────────────────────────────────────────────

export interface DrawResultEmailData {
  email: string;
  drawMonth: number;
  drawYear: number;
  drawnNumbers: number[];
  prizePoolPence: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function drawResultEmail(data: DrawResultEmailData): { subject: string; html: string } {
  const monthName = MONTH_NAMES[(data.drawMonth ?? 1) - 1];
  const pool = `₹${(data.prizePoolPence / 100).toFixed(0)}`;
  const balls = data.drawnNumbers
    .map((n) => `<span style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:50%;background:linear-gradient(135deg,${BRAND_COLOR},#8b5cf6);color:white;font-weight:800;font-size:14px;text-align:center;margin:3px;">${n}</span>`)
    .join(" ");

  return {
    subject: `🎰 ${monthName} ${data.drawYear} Draw Results — Check Your Numbers!`,
    html: baseLayout(
      `<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${TEXT};">The ${monthName} Draw is Live! 🎰</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">
        This month's winning numbers have been drawn. Head to your dashboard to see if your Stableford scores matched.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${MUTED};margin-bottom:12px;">Winning Numbers</p>
        ${balls}
      </div>
      <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:${MUTED};">Total prize pool</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:${GREEN};">${pool}</p>
      </div>
      ${divider()}
      ${ctaButton(`${APP_URL}/dashboard/draws`, "View My Results →")}
      <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">
        Winners can claim prizes directly from the draws page. Claims are reviewed within 2–3 business days.
      </p>`,
      `The ${monthName} ${data.drawYear} draw results are out — check your numbers!`
    ),
  };
}

// ─── 4. Winner Alert ──────────────────────────────────────────────────────────

export interface WinnerAlertEmailData {
  fullName: string;
  email: string;
  drawMonth: number;
  drawYear: number;
  matchType: string; // "3_match" | "4_match" | "5_match"
  prizePence: number;
}

export function winnerAlertEmail(data: WinnerAlertEmailData): { subject: string; html: string } {
  const firstName = data.fullName.split(" ")[0];
  const monthName = MONTH_NAMES[(data.drawMonth ?? 1) - 1];
  const prize = `₹${(data.prizePence / 100).toFixed(0)}`;
  const matchLabel = data.matchType.replace("_", " ").replace("match", "number match");
  const tierEmoji = data.matchType === "5_match" ? "🏆" : data.matchType === "4_match" ? "🥈" : "🥉";

  return {
    subject: `${tierEmoji} You won ₹${(data.prizePence / 100).toFixed(0)} in the ${monthName} Draw!`,
    html: baseLayout(
      `<div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:56px;">${tierEmoji}</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:${TEXT};text-align:center;">
        Congratulations, ${firstName}!
      </h1>
      <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;text-align:center;">
        You matched <strong style="color:${TEXT};">${matchLabel}</strong> in the <strong style="color:${TEXT};">${monthName} ${data.drawYear}</strong> draw.
      </p>
      <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));border:1px solid rgba(99,102,241,0.3);border-radius:14px;padding:24px;text-align:center;margin:0 0 24px;">
        <p style="margin:0;font-size:13px;color:${MUTED};">Your prize</p>
        <p style="margin:6px 0 0;font-size:40px;font-weight:900;color:${TEXT};">${prize}</p>
      </div>
      <p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.6;">
        To claim your prize, go to your Draws dashboard and submit a screenshot of your score record for verification.
        Our team reviews claims within 2–3 business days.
      </p>
      ${ctaButton(`${APP_URL}/dashboard/draws`, "Claim My Prize →", GREEN)}
      ${divider()}
      <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.6;">
        Prize claims require screenshot verification. Claims not submitted within 14 days may forfeit the prize.
      </p>`,
      `You won ${prize} in the ${monthName} ${data.drawYear} Digital Heroes draw!`
    ),
  };
}

// ─── 5. Verification Approved ────────────────────────────────────────────────

export interface VerificationApprovedEmailData {
  fullName: string;
  email: string;
  prizePence: number;
}

export function verificationApprovedEmail(data: VerificationApprovedEmailData): { subject: string; html: string } {
  const firstName = data.fullName.split(" ")[0];
  const prize = `₹${(data.prizePence / 100).toFixed(0)}`;
  return {
    subject: "✅ Prize claim approved — payment processing",
    html: baseLayout(
      `<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${TEXT};">Great news, ${firstName}! ✅</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">
        Your prize claim for <strong style="color:${TEXT};">${prize}</strong> has been approved by our team.
        Payment will be processed to your registered account within 3–5 business days.
      </p>
      <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:${MUTED};">Prize amount approved</p>
        <p style="margin:6px 0 0;font-size:32px;font-weight:800;color:${GREEN};">${prize}</p>
      </div>
      <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">
        If you don't receive payment within 5 business days, please reply to this email with your claim reference.
      </p>`,
      `Your ${prize} prize claim has been approved. Payment processing now.`
    ),
  };
}

// ─── 6. Verification Rejected ────────────────────────────────────────────────

export interface VerificationRejectedEmailData {
  fullName: string;
  email: string;
  adminNotes?: string;
}

export function verificationRejectedEmail(data: VerificationRejectedEmailData): { subject: string; html: string } {
  const firstName = data.fullName.split(" ")[0];
  return {
    subject: "⚠️ Prize claim needs resubmission",
    html: baseLayout(
      `<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${TEXT};">Action Required, ${firstName}</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">
        Unfortunately, your recent prize claim could not be verified. Please resubmit with a clearer screenshot.
      </p>
      ${data.adminNotes ? `
      <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${YELLOW};margin-bottom:6px;">Review note</p>
        <p style="margin:0;font-size:14px;color:${TEXT};line-height:1.5;">${data.adminNotes}</p>
      </div>` : ""}
      <p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.6;">
        Please ensure your screenshot clearly shows your score history with dates and point values visible.
      </p>
      ${ctaButton(`${APP_URL}/dashboard/draws`, "Resubmit Claim →", YELLOW)}
      <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.6;">
        If you believe this is a mistake, please reply to this email.
      </p>`,
      "Your prize claim needs resubmission — see details inside."
    ),
  };
}

// ─── 7. Payment Failed ────────────────────────────────────────────────────────

export interface PaymentFailedEmailData {
  fullName: string;
  email: string;
  renewalDate?: string; // ISO date
}

export function paymentFailedEmail(data: PaymentFailedEmailData): { subject: string; html: string } {
  const firstName = data.fullName.split(" ")[0];
  const dateStr = data.renewalDate
    ? new Date(data.renewalDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "soon";
  return {
    subject: "⚠️ Payment failed — update your payment method",
    html: baseLayout(
      `<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${TEXT};">Payment Issue, ${firstName}</h1>
      <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">
        We were unable to process your subscription payment. Your account is currently <strong style="color:${RED};">past due</strong>.
      </p>
      <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.25);border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:${RED};font-weight:600;">
          ⚠️ Action required by ${dateStr}
        </p>
        <p style="margin:8px 0 0;font-size:13px;color:${MUTED};line-height:1.5;">
          Update your payment method to avoid losing access to draws, scores, and charity contributions.
        </p>
      </div>
      ${ctaButton(`${APP_URL}/pricing`, "Update Payment Method →", RED)}
      <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.6;">
        If you've already updated your payment method, please allow a few minutes for the system to reflect this.
        Reply to this email if you need further assistance.
      </p>`,
      "Your Digital Heroes payment failed — update your payment method to keep access."
    ),
  };
}
