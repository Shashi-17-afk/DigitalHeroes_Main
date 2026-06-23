/**
 * POST /api/razorpay/webhook
 *
 * Handles Razorpay webhook events. This is the authoritative source of
 * subscription state — all lifecycle changes flow through here.
 *
 * Security:
 *   - Verifies x-razorpay-signature with HMAC-SHA256 (raw body)
 *   - Raw body read before JSON.parse (signature computed over raw bytes)
 *   - Returns 200 immediately after routing to prevent retry storms
 *   - All DB writes use service role (bypasses RLS)
 *
 * Handled events:
 *   subscription.activated  → mark subscription active, link Razorpay IDs
 *   subscription.charged    → renew period dates
 *   subscription.cancelled  → cancel at period end
 *   subscription.completed  → mark inactive
 *   subscription.pending    → mark past_due
 *   payment.captured        → log the payment
 *   payment.failed          → mark past_due
 *
 * Webhook setup:
 *   Razorpay Dashboard → Settings → Webhooks → Add new webhook
 *   URL: https://yourdomain.com/api/razorpay/webhook
 *   Set RAZORPAY_WEBHOOK_SECRET to match the secret set in dashboard
 */
import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/resend";
import { paymentFailedEmail, subscriptionActivatedEmail } from "@/lib/email/templates";
import {
  cancelSubscription,
  deactivateSubscription,
  getSubscriptionByRazorpayId,
  getUserSubscription,
  linkRazorpayIds,
  markPastDue,
  renewSubscription,
} from "@/lib/subscriptions";
import { createServiceClient } from "@/lib/supabase/service";

// ─── Razorpay Webhook Payload Types ──────────────────────────────────────────

interface RazorpaySubscriptionEntity {
  id: string;
  customer_id: string;
  plan_id: string;
  status: string;
  current_start: number | null; // Unix timestamp
  current_end: number | null;   // Unix timestamp
  notes: Record<string, string>;
}

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: string;
  email: string;
}

interface RazorpayWebhookPayload {
  entity: "event";
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
    payment?: { entity: RazorpayPaymentEntity };
  };
  created_at: number;
}

// ─── Signature Verification ───────────────────────────────────────────────────

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || secret === "placeholder_webhook_secret") {
    // Dev mode: skip verification if no real secret configured
    if (process.env.NODE_ENV === "development") {
      console.warn("[Webhook] No webhook secret — skipping verification (dev mode)");
      return true;
    }
    return false;
  }

  const generated = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const genBuf = Buffer.from(generated, "utf-8");
  const recBuf = Buffer.from(signature, "utf-8");
  if (genBuf.length !== recBuf.length) return false;
  return crypto.timingSafeEqual(genBuf, recBuf);
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function onSubscriptionActivated(
  sub: RazorpaySubscriptionEntity
): Promise<void> {
  // Find subscription by razorpay_subscription_id if already linked
  const existing = await getSubscriptionByRazorpayId(sub.id);
  if (!existing) {
    // The subscription was activated via webhook before verify-payment ran
    // (edge case — Razorpay can fire webhook before client verify call)
    // We can't link without user_id at this point — log and skip
    console.warn(
      `[Webhook] subscription.activated — no local record for sub ${sub.id}. ` +
        `Will be linked when verify-payment runs.`
    );
    return;
  }

  // Link Razorpay IDs to the local subscription record
  await linkRazorpayIds(existing.id, {
    razorpayCustomerId: sub.customer_id,
    razorpaySubscriptionId: sub.id,
  });

  // Send subscription activated email
  try {
    const svc = createServiceClient();
    const { data: profile } = await svc
      .from("profiles")
      .select("email, full_name")
      .eq("id", existing.user_id)
      .single();
    if (profile) {
      const { subject, html } = subscriptionActivatedEmail({
        fullName: profile.full_name ?? profile.email ?? "Golfer",
        email: profile.email ?? "",
        planType: existing.plan_type,
        periodEnd: existing.current_period_end ?? new Date().toISOString(),
      });
      void sendEmail({ to: profile.email ?? "", subject, html });
    }
  } catch (e) {
    console.error("[Webhook] Failed to send subscription activated email", e);
  }

  console.info(
    `[Webhook] subscription.activated — linked sub ${sub.id} to local ${existing.id}`
  );
}

async function onSubscriptionCharged(
  sub: RazorpaySubscriptionEntity
): Promise<void> {
  if (!sub.current_start || !sub.current_end) {
    console.warn(`[Webhook] subscription.charged — missing period dates for ${sub.id}`);
    return;
  }

  // Look up by razorpay_subscription_id first
  let existing = await getSubscriptionByRazorpayId(sub.id);

  // Fallback: check notes for user_id (set in create-order)
  if (!existing && sub.notes?.user_id) {
    existing = await getUserSubscription(sub.notes.user_id);
  }

  if (!existing) {
    console.warn(`[Webhook] subscription.charged — no local record for sub ${sub.id}`);
    return;
  }

  await renewSubscription(
    existing.id,
    new Date(sub.current_start * 1000),
    new Date(sub.current_end * 1000)
  );

  console.info(
    `[Webhook] subscription.charged — renewed sub ${existing.id} ` +
      `until ${new Date(sub.current_end * 1000).toISOString()}`
  );
}

async function onSubscriptionCancelled(
  sub: RazorpaySubscriptionEntity
): Promise<void> {
  const existing = await getSubscriptionByRazorpayId(sub.id);
  if (!existing) {
    console.warn(`[Webhook] subscription.cancelled — no local record for sub ${sub.id}`);
    return;
  }

  await cancelSubscription(existing.id, true); // cancel at period end
  console.info(`[Webhook] subscription.cancelled — sub ${existing.id} set to cancel at period end`);
}

async function onSubscriptionCompleted(
  sub: RazorpaySubscriptionEntity
): Promise<void> {
  const existing = await getSubscriptionByRazorpayId(sub.id);
  if (!existing) {
    console.warn(`[Webhook] subscription.completed — no local record for sub ${sub.id}`);
    return;
  }

  await deactivateSubscription(existing.id);
  console.info(`[Webhook] subscription.completed — sub ${existing.id} deactivated`);
}

async function onSubscriptionPending(
  sub: RazorpaySubscriptionEntity
): Promise<void> {
  const existing = await getSubscriptionByRazorpayId(sub.id);
  if (!existing) {
    console.warn(`[Webhook] subscription.pending — no local record for sub ${sub.id}`);
    return;
  }

  await markPastDue(existing.id);
  console.warn(`[Webhook] subscription.pending — sub ${existing.id} marked past_due`);
}

async function onPaymentFailed(payment: RazorpayPaymentEntity): Promise<void> {
  console.warn(
    `[Webhook] payment.failed — payment: ${payment.id}, order: ${payment.order_id}`
  );

  // If linked to a subscription, mark it past_due and email user
  if (payment.subscription_id) {
    const existing = await getSubscriptionByRazorpayId(payment.subscription_id);
    if (existing) {
      await markPastDue(existing.id);
      console.warn(
        `[Webhook] payment.failed — sub ${existing.id} marked past_due`
      );

      // Send payment failed email
      try {
        const svc = createServiceClient();
        const { data: profile } = await svc
          .from("profiles")
          .select("email, full_name")
          .eq("id", existing.user_id)
          .single();
        if (profile) {
          const { subject, html } = paymentFailedEmail({
            fullName: profile.full_name ?? profile.email ?? "Golfer",
            email: profile.email ?? "",
            renewalDate: existing.current_period_end ?? undefined,
          });
          void sendEmail({ to: profile.email ?? "", subject, html });
        }
      } catch (e) {
        console.error("[Webhook] Failed to send payment failed email", e);
      }
    }
  }
}

async function onPaymentCaptured(payment: RazorpayPaymentEntity): Promise<void> {
  // One-time payment captured — subscription activation handled by verify-payment
  // For subscription recurring payments, subscription.charged handles the DB writes
  console.info(
    `[Webhook] payment.captured — payment: ${payment.id}, ₹${payment.amount / 100}`
  );
}

// ─── Main Route Handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Read raw body BEFORE JSON.parse — signature is over raw bytes
  const rawBody = await request.text();

  // Verify signature
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    console.warn("[Webhook] Missing x-razorpay-signature header");
    return new NextResponse("Missing signature", { status: 400 });
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[Webhook] Signature verification FAILED — possible tampering");
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Parse payload
  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return new NextResponse("Invalid JSON payload", { status: 400 });
  }

  console.info(`[Webhook] Event received: ${event.event}`);

  // Route to handler — always return 200 after routing
  // Razorpay retries if it doesn't receive 200 within 5s
  try {
    const sub = event.payload.subscription?.entity;
    const pay = event.payload.payment?.entity;

    switch (event.event) {
      case "subscription.activated":
        if (sub) await onSubscriptionActivated(sub);
        break;
      case "subscription.charged":
        if (sub) await onSubscriptionCharged(sub);
        break;
      case "subscription.cancelled":
        if (sub) await onSubscriptionCancelled(sub);
        break;
      case "subscription.completed":
        if (sub) await onSubscriptionCompleted(sub);
        break;
      case "subscription.pending":
        if (sub) await onSubscriptionPending(sub);
        break;
      case "payment.captured":
        if (pay) await onPaymentCaptured(pay);
        break;
      case "payment.failed":
        if (pay) await onPaymentFailed(pay);
        break;
      default:
        console.info(`[Webhook] Unhandled event: ${event.event}`);
    }
  } catch (err) {
    // Log but still return 200 — avoid Razorpay retry storms
    console.error(`[Webhook] Handler error for ${event.event}:`, err);
  }

  return new NextResponse("OK", { status: 200 });
}
