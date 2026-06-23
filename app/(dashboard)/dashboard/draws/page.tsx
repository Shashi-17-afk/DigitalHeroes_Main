import type { Metadata } from "next";

import Link from "next/link";

import { DrawHistory } from "@/components/draws/draw-history";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscriptions";
import { getServerUser } from "@/lib/supabase/get-server-user";

export const metadata: Metadata = {
  title: "My Draws | Digital Heroes",
  description:
    "View your monthly draw participation history, match results, and prize winnings.",
};

export default async function DrawsPage(): Promise<React.JSX.Element> {
  const user = await getServerUser();

  let isActive = false;
  if (user) {
    const sub = await getUserSubscription(user.id);
    isActive = isSubscriptionActive(sub);
  }

  return (
    <div className="scores-page">
      <header className="scores-page__header">
        <div>
          <h1 className="scores-page__title">🎰 My Draws</h1>
          <p className="scores-page__subtitle">
            Your monthly draw history. Your 5 Stableford scores are your entry
            numbers — match 3, 4, or 5 drawn numbers to win!
          </p>
        </div>
        <Link href="/dashboard" className="scores-page__back">
          ← Dashboard
        </Link>
      </header>

      {/* How it works */}
      <div className="scores-page__info">
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">🎯</span>
          <span>Your 5 scores = 5 entry numbers</span>
        </div>
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">3️⃣</span>
          <span>Match 3: 25% prize tier</span>
        </div>
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">4️⃣</span>
          <span>Match 4: 35% prize tier</span>
        </div>
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">5️⃣</span>
          <span>Match 5: 40% jackpot</span>
        </div>
      </div>

      {isActive ? (
        <DrawHistory />
      ) : (
        <div className="dashboard-gate-banner">
          <div className="dashboard-gate-banner__content">
            <h2>🔒 Active Subscription Required</h2>
            <p>
              Subscribe to Digital Heroes to participate in monthly draws and
              view your draw history.
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
