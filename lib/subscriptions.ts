/**
 * Subscription Management Library
 * Digital Heroes — Phase 4
 *
 * All DB writes use the SERVICE ROLE client (bypasses RLS).
 * All DB reads for user-facing APIs use the anon/session client.
 *
 * Functions:
 *   getUserSubscription     — fetch current subscription for a user
 *   activateSubscription    — create or update subscription to 'active'
 *   renewSubscription       — extend subscription period (webhook: charged)
 *   cancelSubscription      — set status to 'cancelled'
 *   deactivateSubscription  — set status to 'inactive' (plan completed)
 *   markPastDue             — set status to 'past_due' (payment failed)
 *   linkRazorpayIds         — store customer/subscription IDs from webhook
 */

import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionRow =
  Database["public"]["Tables"]["subscriptions"]["Row"];

export type SubscriptionStatus =
  Database["public"]["Tables"]["subscriptions"]["Row"]["status"];

// ─── Period calculation ────────────────────────────────────────────────────────

function calcPeriodEnd(
  from: Date,
  plan: "monthly" | "yearly"
): Date {
  const end = new Date(from);
  if (plan === "monthly") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns the most recent subscription row for a user, or null if none exists.
 * Uses service client so it can be called from webhook context.
 */
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionRow | null> {
  const db = createServiceClient();

  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`[Subscriptions] getUserSubscription: ${error.message}`);
  return data;
}

/**
 * Looks up a subscription by Razorpay subscription ID.
 * Used in webhook handlers where we have razorpay_subscription_id but not user_id.
 */
export async function getSubscriptionByRazorpayId(
  razorpaySubscriptionId: string
): Promise<SubscriptionRow | null> {
  const db = createServiceClient();

  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("razorpay_subscription_id", razorpaySubscriptionId)
    .maybeSingle();

  if (error) {
    throw new Error(`[Subscriptions] getSubscriptionByRazorpayId: ${error.message}`);
  }
  return data;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Activates a subscription after successful payment verification.
 * Creates a new subscription record if none exists; updates if one does.
 *
 * Called by: POST /api/razorpay/verify-payment (after HMAC check)
 */
export async function activateSubscription(
  userId: string,
  planType: "monthly" | "yearly"
): Promise<SubscriptionRow> {
  const db = createServiceClient();
  const now = new Date();
  const periodEnd = calcPeriodEnd(now, planType);

  // Check for existing subscription
  const existing = await getUserSubscription(userId);

  if (existing) {
    // Update existing record
    const { data, error } = await db
      .from("subscriptions")
      .update({
        plan_type: planType,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(`[Subscriptions] activateSubscription (update): ${error.message}`);
    return data;
  } else {
    // Create new record
    const { data, error } = await db
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_type: planType,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      })
      .select()
      .single();

    if (error) throw new Error(`[Subscriptions] activateSubscription (insert): ${error.message}`);
    return data;
  }
}

/**
 * Renews subscription period (called on subscription.charged webhook).
 * Updates period dates and resets status to 'active'.
 */
export async function renewSubscription(
  subscriptionId: string,
  currentStart: Date,
  currentEnd: Date
): Promise<void> {
  const db = createServiceClient();

  const { error } = await db
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: currentStart.toISOString(),
      current_period_end: currentEnd.toISOString(),
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) throw new Error(`[Subscriptions] renewSubscription: ${error.message}`);
}

/**
 * Marks subscription as cancelled (called on subscription.cancelled webhook).
 * cancel_at_period_end = true means access continues until period_end.
 */
export async function cancelSubscription(
  subscriptionId: string,
  atPeriodEnd = true
): Promise<void> {
  const db = createServiceClient();

  const { error } = await db
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancel_at_period_end: atPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) throw new Error(`[Subscriptions] cancelSubscription: ${error.message}`);
}

/**
 * Marks subscription as inactive/completed (subscription.completed webhook).
 */
export async function deactivateSubscription(
  subscriptionId: string
): Promise<void> {
  const db = createServiceClient();

  const { error } = await db
    .from("subscriptions")
    .update({
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) throw new Error(`[Subscriptions] deactivateSubscription: ${error.message}`);
}

/**
 * Marks subscription as past_due (payment.failed webhook).
 */
export async function markPastDue(subscriptionId: string): Promise<void> {
  const db = createServiceClient();

  const { error } = await db
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) throw new Error(`[Subscriptions] markPastDue: ${error.message}`);
}

/**
 * Links Razorpay customer and subscription IDs to a subscription record.
 * Called when webhook payload includes these IDs (subscription.activated).
 */
export async function linkRazorpayIds(
  subscriptionId: string,
  {
    razorpayCustomerId,
    razorpaySubscriptionId,
  }: {
    razorpayCustomerId?: string;
    razorpaySubscriptionId?: string;
  }
): Promise<void> {
  const db = createServiceClient();

  // Build typed update — Supabase typed client rejects Record<string, string>
  type UpdatePayload = Database["public"]["Tables"]["subscriptions"]["Update"];
  const updates: UpdatePayload = {
    updated_at: new Date().toISOString(),
    ...(razorpayCustomerId
      ? { razorpay_customer_id: razorpayCustomerId }
      : {}),
    ...(razorpaySubscriptionId
      ? { razorpay_subscription_id: razorpaySubscriptionId }
      : {}),
  };

  const { error } = await db
    .from("subscriptions")
    .update(updates)
    .eq("id", subscriptionId);

  if (error) throw new Error(`[Subscriptions] linkRazorpayIds: ${error.message}`);
}

// ─── Helper: is subscription active? ─────────────────────────────────────────

/**
 * Returns true if the user has an active or cancelled (grace period) subscription.
 * 'cancelled' subscriptions remain accessible until current_period_end.
 */
export function isSubscriptionActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  if (sub.status === "active") return true;
  if (sub.status === "cancelled" && sub.current_period_end) {
    return new Date(sub.current_period_end) > new Date();
  }
  return false;
}
