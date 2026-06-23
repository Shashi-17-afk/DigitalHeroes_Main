"use client";

/**
 * SubscriptionStatusCard
 *
 * Displays the user's current subscription status. Used in the dashboard.
 * Server Component fetches the data, this Client Component renders it.
 *
 * States:
 *   active   — shows plan, renewal date, cancel option
 *   cancelled — shows "cancels on {date}", option to resubscribe
 *   past_due  — urgent banner, retry payment CTA
 *   inactive  — subscribe CTA
 *   none      — no subscription yet, subscribe CTA
 */

import type { SubscriptionRow } from "@/lib/subscriptions";
import { isSubscriptionActive } from "@/lib/subscriptions";

interface SubscriptionStatusCardProps {
  subscription: SubscriptionRow | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SubscriptionStatusCard({
  subscription,
}: SubscriptionStatusCardProps): React.JSX.Element {
  const isActive = isSubscriptionActive(subscription);

  // ── No subscription ─────────────────────────────────────────────────────────
  if (!subscription) {
    return (
      <div className="subscription-card subscription-card--none">
        <div className="subscription-card__icon">🏌️</div>
        <div className="subscription-card__body">
          <h3 className="subscription-card__title">No Active Subscription</h3>
          <p className="subscription-card__sub">
            Subscribe to enter monthly prize draws and support your chosen charity.
          </p>
          <a href="/pricing" className="subscription-card__cta">
            View Plans →
          </a>
        </div>
      </div>
    );
  }

  const planLabel =
    subscription.plan_type === "yearly" ? "Yearly Plan" : "Monthly Plan";

  // ── Past Due ────────────────────────────────────────────────────────────────
  if (subscription.status === "past_due") {
    return (
      <div className="subscription-card subscription-card--past-due">
        <div className="subscription-card__icon">⚠️</div>
        <div className="subscription-card__body">
          <h3 className="subscription-card__title">Payment Failed</h3>
          <p className="subscription-card__sub">
            Your last payment could not be processed. Update your payment method
            to restore access.
          </p>
          <a href="/pricing" className="subscription-card__cta subscription-card__cta--urgent">
            Retry Payment →
          </a>
        </div>
        <span className="subscription-card__badge subscription-card__badge--red">
          Past Due
        </span>
      </div>
    );
  }

  // ── Cancelled (grace period active) ────────────────────────────────────────
  if (subscription.status === "cancelled") {
    return (
      <div className="subscription-card subscription-card--cancelled">
        <div className="subscription-card__icon">📅</div>
        <div className="subscription-card__body">
          <h3 className="subscription-card__title">{planLabel}</h3>
          <p className="subscription-card__sub">
            Your subscription is cancelled. Access continues until{" "}
            <strong>{formatDate(subscription.current_period_end)}</strong>.
          </p>
          <a href="/pricing" className="subscription-card__cta">
            Resubscribe →
          </a>
        </div>
        <span className="subscription-card__badge subscription-card__badge--yellow">
          Cancelling
        </span>
      </div>
    );
  }

  // ── Inactive / Expired ─────────────────────────────────────────────────────
  if (!isActive) {
    return (
      <div className="subscription-card subscription-card--inactive">
        <div className="subscription-card__icon">⏸️</div>
        <div className="subscription-card__body">
          <h3 className="subscription-card__title">Subscription Expired</h3>
          <p className="subscription-card__sub">
            Your {planLabel.toLowerCase()} ended on{" "}
            <strong>{formatDate(subscription.current_period_end)}</strong>.
          </p>
          <a href="/pricing" className="subscription-card__cta">
            Renew Subscription →
          </a>
        </div>
        <span className="subscription-card__badge subscription-card__badge--red">
          Inactive
        </span>
      </div>
    );
  }

  // ── Active ──────────────────────────────────────────────────────────────────
  return (
    <div className="subscription-card subscription-card--active">
      <div className="subscription-card__icon">
        {subscription.plan_type === "yearly" ? "⭐" : "✅"}
      </div>
      <div className="subscription-card__body">
        <h3 className="subscription-card__title">{planLabel}</h3>
        <p className="subscription-card__sub">
          {subscription.cancel_at_period_end
            ? `Cancels on ${formatDate(subscription.current_period_end)}`
            : `Renews on ${formatDate(subscription.current_period_end)}`}
        </p>
        {subscription.plan_type === "monthly" && (
          <a href="/pricing?upgrade=yearly" className="subscription-card__upgrade">
            Upgrade to Yearly (save ~17%) →
          </a>
        )}
      </div>
      <span className="subscription-card__badge subscription-card__badge--green">
        Active
      </span>
    </div>
  );
}
