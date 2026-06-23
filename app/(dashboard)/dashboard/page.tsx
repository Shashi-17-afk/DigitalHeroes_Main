import type { Metadata } from "next";

import Link from "next/link";

import { SubscriptionStatusCard } from "@/components/payment/subscription-status";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscriptions";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard | Digital Heroes",
  description: "Your Digital Heroes golf dashboard — scores, draws, and subscription.",
};

// ─── Quick Stats Card ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string | number;
  href?: string;
}): React.JSX.Element {
  const content = (
    <div className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__body">
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const user = await getServerUser();
  const supabase = await createClient();

  // Fetch subscription
  const subscription = user ? await getUserSubscription(user.id) : null;
  const isActive = isSubscriptionActive(subscription);

  // Fetch scores count
  let scoresCount = 0;
  if (user) {
    const { count } = await supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    scoresCount = count ?? 0;
  }

  // Greet user
  const displayName =
    user?.email?.split("@")[0] ?? "Golfer";

  return (
    <div className="dashboard-overview">
      {/* Header greeting */}
      <header className="dashboard-overview__header">
        <div>
          <h1 className="dashboard-header__greeting">
            Welcome back, <span className="dashboard-header__name">{displayName}</span> 👋
          </h1>
          <p className="dashboard-header__date">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </header>

      {/* Subscription Status */}
      <section aria-label="Subscription status" className="dashboard-section">
        <SubscriptionStatusCard subscription={subscription} />
      </section>

      {/* Quick Stats */}
      <section
        aria-label="Quick stats"
        className="dashboard-section dashboard-stats"
      >
        <StatCard
          icon="⛳"
          label="Scores entered"
          value={scoresCount}
          href="/dashboard/scores"
        />
        <StatCard
          icon="🎯"
          label="Draw entries"
          value={isActive ? scoresCount : 0}
        />
        <StatCard
          icon="🏆"
          label="Draws status"
          value={isActive ? "Active" : "Inactive"}
        />
        <StatCard
          icon="💚"
          label="Charity"
          value={subscription ? "Chosen" : "Not set"}
          href="/dashboard/charity"
        />
      </section>

      {/* Subscription gate banner */}
      {!isActive && (
        <section className="dashboard-gate-banner" aria-label="Subscription required">
          <div className="dashboard-gate-banner__content">
            <h2>🔒 Subscribe to Unlock All Features</h2>
            <p>
              An active subscription gives you 5 monthly draw entries,
              prize pool eligibility, and charity contribution tracking.
            </p>
            <Link href="/pricing" className="dashboard-gate-banner__cta">
              View Plans &amp; Subscribe →
            </Link>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section aria-label="Quick actions" className="dashboard-section">
        <h2 className="dashboard-section__title">Quick Actions</h2>
        <div className="dashboard-actions">
          <Link
            href="/dashboard/scores"
            className={`dashboard-action-card ${!isActive ? "dashboard-action-card--locked" : ""}`}
          >
            <span className="dashboard-action-card__icon">⛳</span>
            <span className="dashboard-action-card__label">Enter Scores</span>
            {!isActive && <span className="dashboard-action-card__lock">🔒</span>}
          </Link>
          <Link
            href="/dashboard/draws"
            className={`dashboard-action-card ${!isActive ? "dashboard-action-card--locked" : ""}`}
          >
            <span className="dashboard-action-card__icon">🎰</span>
            <span className="dashboard-action-card__label">View Draws</span>
            {!isActive && <span className="dashboard-action-card__lock">🔒</span>}
          </Link>
          <Link href="/dashboard/charity" className="dashboard-action-card">
            <span className="dashboard-action-card__icon">💚</span>
            <span className="dashboard-action-card__label">My Charity</span>
          </Link>
          <Link href="/pricing" className="dashboard-action-card">
            <span className="dashboard-action-card__icon">💳</span>
            <span className="dashboard-action-card__label">
              {isActive ? "Manage Plan" : "Subscribe"}
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
