import type { Metadata } from "next";

import { CheckoutButton } from "@/components/payment/checkout-button";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscriptions";
import { getServerUser } from "@/lib/supabase/get-server-user";

export const metadata: Metadata = {
  title: "Pricing | Digital Heroes",
  description:
    "Choose your Digital Heroes subscription. Play golf, win prizes, support charity every month.",
};

// ─── Plan config ──────────────────────────────────────────────────────────────
// Amounts in smallest currency unit (paise for INR, pence for GBP)
const PLANS = {
  monthly: {
    label: "Monthly",
    amount: parseInt(process.env.SUBSCRIPTION_PRICE_MONTHLY_AMOUNT ?? "99900"),
    displayPrice: "₹999",
    period: "per month",
    savingsLabel: null,
    description: "Pay month to month. Cancel anytime.",
    features: [
      "5 draw entries per month (from your Stableford scores)",
      "Monthly prize pool draw",
      "Choose your supported charity",
      "Score tracking & leaderboard",
      "Winner notification & verification",
    ],
  },
  yearly: {
    label: "Yearly",
    amount: parseInt(process.env.SUBSCRIPTION_PRICE_YEARLY_AMOUNT ?? "999900"),
    displayPrice: "₹9,999",
    period: "per year",
    savingsLabel: "Save ~17%",
    description: "Best value. Billed once annually.",
    features: [
      "Everything in Monthly",
      "60 draw entries per year",
      "Priority support",
      "Early access to new features",
      "Yearly trophy for winners",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;

// ─── Plan Card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: PlanKey;
  config: (typeof PLANS)[PlanKey];
  userEmail?: string;
  userName?: string;
  isCurrentPlan?: boolean;
}

function PlanCard({
  plan,
  config,
  userEmail,
  userName,
  isCurrentPlan,
}: PlanCardProps): React.JSX.Element {
  const isYearly = plan === "yearly";

  return (
    <div
      className={`pricing-card ${isYearly ? "pricing-card--featured" : ""}`}
    >
      {isYearly && (
        <div className="pricing-card__popular-badge">Most Popular</div>
      )}
      {config.savingsLabel && (
        <div className="pricing-card__savings-badge">{config.savingsLabel}</div>
      )}

      <div className="pricing-card__header">
        <h2 className="pricing-card__plan-name">{config.label}</h2>
        <div className="pricing-card__price">
          <span className="pricing-card__amount">{config.displayPrice}</span>
          <span className="pricing-card__period">{config.period}</span>
        </div>
        <p className="pricing-card__description">{config.description}</p>
      </div>

      <ul className="pricing-card__features">
        {config.features.map((feature) => (
          <li key={feature} className="pricing-card__feature">
            <svg
              className="pricing-card__check"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <div className="pricing-card__cta">
        {isCurrentPlan ? (
          <div className="pricing-card__current">✅ Your current plan</div>
        ) : userEmail ? (
          <CheckoutButton
            amount={config.amount}
            planType={plan}
            buttonText={`Subscribe ${config.label}`}
            prefill={{ email: userEmail, name: userName }}
            className={`pricing-card__btn ${isYearly ? "pricing-card__btn--primary" : "pricing-card__btn--secondary"}`}
            successRedirect="/dashboard?subscribed=true"
          />
        ) : (
          <a
            href={`/signup?redirect=/pricing`}
            className={`pricing-card__btn ${isYearly ? "pricing-card__btn--primary" : "pricing-card__btn--secondary"}`}
          >
            Get Started →
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PricingPage(): Promise<React.JSX.Element> {
  const user = await getServerUser();

  // Check if user already has an active subscription
  let currentPlan: PlanKey | null = null;
  if (user) {
    const sub = await getUserSubscription(user.id);
    if (isSubscriptionActive(sub) && sub) {
      currentPlan = sub.plan_type as PlanKey;

      // If user already has active subscription, redirect to dashboard
      // (unless they clicked the upgrade link)
      // Allow them to stay on the page to upgrade from monthly → yearly
    }
  }

  return (
    <div className="pricing-page">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <header className="pricing-hero">
        <div className="pricing-hero__badge">⛳ Digital Heroes Golf</div>
        <h1 className="pricing-hero__title">
          Play Golf.{" "}
          <span className="pricing-hero__accent">Win Prizes.</span>
          <br />
          Support Charity.
        </h1>
        <p className="pricing-hero__subtitle">
          Every subscription enters you into the monthly prize draw and
          contributes to your chosen charity. Choose the plan that works for you.
        </p>
      </header>

      {/* ── Plan Cards ──────────────────────────────────────────────────── */}
      <section className="pricing-cards" aria-label="Subscription plans">
        <PlanCard
          plan="monthly"
          config={PLANS.monthly}
          userEmail={user?.email}
          userName={user?.email}
          isCurrentPlan={currentPlan === "monthly"}
        />
        <PlanCard
          plan="yearly"
          config={PLANS.yearly}
          userEmail={user?.email}
          userName={user?.email}
          isCurrentPlan={currentPlan === "yearly"}
        />
      </section>

      {/* ── Trust signals ───────────────────────────────────────────────── */}
      <section className="pricing-trust" aria-label="Trust signals">
        <div className="pricing-trust__item">
          <span className="pricing-trust__icon">🔒</span>
          <span>Payments secured by Razorpay</span>
        </div>
        <div className="pricing-trust__item">
          <span className="pricing-trust__icon">❌</span>
          <span>Cancel anytime</span>
        </div>
        <div className="pricing-trust__item">
          <span className="pricing-trust__icon">🏆</span>
          <span>Monthly prize draws</span>
        </div>
        <div className="pricing-trust__item">
          <span className="pricing-trust__icon">💚</span>
          <span>Charity contributions every month</span>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="pricing-faq" aria-label="Frequently asked questions">
        <h2 className="pricing-faq__title">Common Questions</h2>
        <div className="pricing-faq__grid">
          <div className="pricing-faq__item">
            <h3>How do draw entries work?</h3>
            <p>
              Your 5 Stableford golf scores become your 5 entry numbers for the
              monthly draw. Scores range from 1–45 and map directly to draw
              numbers.
            </p>
          </div>
          <div className="pricing-faq__item">
            <h3>What percentage goes to charity?</h3>
            <p>
              At least 10% of every subscription goes to your chosen charity.
              You control the percentage (up to 50%) from your profile settings.
            </p>
          </div>
          <div className="pricing-faq__item">
            <h3>Can I change my charity?</h3>
            <p>
              Yes — you can change your supported charity at any time from your
              profile. The change takes effect on your next billing cycle.
            </p>
          </div>
          <div className="pricing-faq__item">
            <h3>How are prizes distributed?</h3>
            <p>
              The prize pool is split: 40% to 5-match jackpot, 35% to 4-match
              tier, 25% to 3-match tier. Winners verify their win with a
              screenshot, then payment is processed.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
