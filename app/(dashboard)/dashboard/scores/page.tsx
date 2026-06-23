import type { Metadata } from "next";

import Link from "next/link";

import { ScoreManager } from "@/components/scores/score-manager";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscriptions";
import { getServerUser } from "@/lib/supabase/get-server-user";

export const metadata: Metadata = {
  title: "My Scores | Digital Heroes",
  description:
    "Enter and manage your golf scores in Stableford format. Your last 5 scores become your draw entry numbers.",
};

export default async function ScoresPage(): Promise<React.JSX.Element> {
  const user = await getServerUser();

  // Check subscription status — scores require active subscription
  let isActive = false;
  if (user) {
    const sub = await getUserSubscription(user.id);
    isActive = isSubscriptionActive(sub);
  }

  return (
    <div className="scores-page">
      <header className="scores-page__header">
        <div>
          <h1 className="scores-page__title">⛳ My Scores</h1>
          <p className="scores-page__subtitle">
            Enter your Stableford scores (1–45). Your last 5 scores become your
            monthly draw entry numbers.
          </p>
        </div>
        <Link href="/dashboard" className="scores-page__back">
          ← Dashboard
        </Link>
      </header>

      {/* Info banner */}
      <div className="scores-page__info">
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">📊</span>
          <span>Maximum 5 scores at any time</span>
        </div>
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">🔄</span>
          <span>New score replaces oldest automatically</span>
        </div>
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">📅</span>
          <span>One score per date — edit or delete to change</span>
        </div>
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">🎯</span>
          <span>Scores = draw entry numbers (1–45)</span>
        </div>
      </div>

      {isActive ? (
        <ScoreManager />
      ) : (
        <div className="dashboard-gate-banner">
          <div className="dashboard-gate-banner__content">
            <h2>🔒 Active Subscription Required</h2>
            <p>
              You need an active subscription to enter scores and participate in
              monthly draws.
            </p>
            <Link href="/pricing" className="dashboard-gate-banner__cta">
              View Plans & Subscribe →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
