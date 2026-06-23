import type { Metadata } from "next";

import Link from "next/link";

import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Digital Heroes — Golf · Give · Win",
  description:
    "Subscribe, track your Stableford golf scores, support a charity you love, and enter monthly prize draws. Every subscription contributes to real charity impact.",
};

// ─── Featured Charities (server-side fetch) ───────────────────────────────────

async function getFeaturedCharities(): Promise<
  Array<{ id: string; name: string; description: string | null; logo_url: string | null; slug: string }>
> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("charities")
      .select("id, name, description, logo_url, slug")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("name")
      .limit(3);
    return data ?? [];
  } catch {
    return [];
  }
}

// ─── How It Works steps ───────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "💳",
    title: "Subscribe",
    body: "Choose a monthly or yearly plan. A portion of every subscription goes directly to the prize pool and charity fund.",
  },
  {
    step: "02",
    icon: "⛳",
    title: "Enter Your Scores",
    body: "Log up to 5 Stableford scores (1–45) each month. These become your personal lottery numbers for that month's draw.",
  },
  {
    step: "03",
    icon: "💚",
    title: "Choose Your Charity",
    body: "Pick any charity from our vetted directory. Adjust the percentage you want directed to them every month.",
  },
  {
    step: "04",
    icon: "🎰",
    title: "Win Monthly Prizes",
    body: "Every month, 5 winning numbers are drawn. Match 3, 4, or all 5 to win a share of the prize pool — up to the jackpot.",
  },
];

// ─── FAQs ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "How are the winning numbers drawn?",
    a: "Each month, 5 numbers between 1 and 45 are drawn — either randomly or using a weighted algorithmic mode. Your last 5 Stableford scores are your entry numbers.",
  },
  {
    q: "How much of my subscription goes to charity?",
    a: "You choose the percentage — typically between 10% and 90% of your contribution. The remainder goes to the prize pool.",
  },
  {
    q: "What happens if no one wins the jackpot?",
    a: "The jackpot rolls over and compounds into the following month's prize pool, growing until someone matches all 5 numbers.",
  },
  {
    q: "How do I claim a prize?",
    a: "Winners receive a notification and can submit a screenshot of their score record for verification. Once approved by our team, payment is processed.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes — you can cancel anytime. Your current period remains active until its end date, after which no further charges are made.",
  },
  {
    q: "Which charities are available?",
    a: "We curate a directory of verified, active charities. New charities are added regularly. You can browse and switch your chosen charity at any time.",
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "50%", label: "of subscription goes to prizes" },
  { value: "5", label: "winning numbers drawn monthly" },
  { value: "3+", label: "match tiers (3, 4, 5 balls)" },
  { value: "100%", label: "verified charity partners" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage(): Promise<React.JSX.Element> {
  const featuredCharities = await getFeaturedCharities();

  return (
    <div className="home">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="home-hero" aria-label="Hero">
        <div className="home-hero__inner">
          <div className="home-hero__badge">
            ⛳ Golf · 💚 Give · 🏆 Win
          </div>
          <h1 className="home-hero__title">
            Play Golf.{" "}
            <span className="home-hero__accent">Support Charities.</span>
            <br />
            Win Monthly Prizes.
          </h1>
          <p className="home-hero__subtitle">
            Subscribe, log your Stableford scores, support a charity you love,
            and enter our monthly prize draw — all in one place. Every pound
            you spend does good.
          </p>
          <div className="home-hero__actions">
            <Link href="/signup" className="home-hero__cta">
              Start Playing → Free First Week
            </Link>
            <Link href="/#how-it-works" className="home-hero__secondary">
              How It Works ↓
            </Link>
          </div>

          {/* Trust row */}
          <div className="home-hero__trust">
            <span className="home-hero__trust-item">🔒 Razorpay Secured</span>
            <span className="home-hero__trust-item">✅ Verified Charities</span>
            <span className="home-hero__trust-item">🏆 Monthly Jackpots</span>
            <span className="home-hero__trust-item">❌ Cancel Anytime</span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="home-hero__visual" aria-hidden="true">
          <div className="hero-draw-card">
            <div className="hero-draw-card__label">🎰 This Month&apos;s Draw</div>
            <div className="hero-draw-card__balls">
              {[7, 14, 23, 31, 42].map((n) => (
                <div key={n} className="hero-ball">{n}</div>
              ))}
            </div>
            <div className="hero-draw-card__pool">
              Prize Pool: <strong>₹48,500</strong>
            </div>
            <div className="hero-draw-card__status">🟢 Draw Open</div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <section className="home-stats" aria-label="Platform statistics">
        {STATS.map(({ value, label }) => (
          <div key={label} className="home-stat">
            <div className="home-stat__value">{value}</div>
            <div className="home-stat__label">{label}</div>
          </div>
        ))}
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="home-section home-hiw"
        aria-label="How it works"
      >
        <div className="home-section__header">
          <div className="home-section__badge">Simple &amp; Transparent</div>
          <h2 className="home-section__title">How Digital Heroes Works</h2>
          <p className="home-section__subtitle">
            Four steps to playing golf for good — and winning prizes while you do it.
          </p>
        </div>

        <div className="home-hiw__steps">
          {HOW_IT_WORKS.map(({ step, icon, title, body }) => (
            <div key={step} className="hiw-step">
              <div className="hiw-step__number">{step}</div>
              <div className="hiw-step__icon">{icon}</div>
              <h3 className="hiw-step__title">{title}</h3>
              <p className="hiw-step__body">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Prize Tiers ───────────────────────────────────────────────────── */}
      <section className="home-section home-prizes" aria-label="Prize tiers">
        <div className="home-section__header">
          <div className="home-section__badge">Monthly Prize Draw</div>
          <h2 className="home-section__title">Three Ways to Win</h2>
          <p className="home-section__subtitle">
            Match your Stableford scores to the drawn numbers. Three tiers,
            three chances.
          </p>
        </div>

        <div className="home-prizes__grid">
          <div className="prize-tier prize-tier--bronze">
            <div className="prize-tier__icon">🥉</div>
            <div className="prize-tier__match">Match 3</div>
            <div className="prize-tier__name">Bronze Prize</div>
            <div className="prize-tier__pct">25% of pool</div>
            <p className="prize-tier__desc">
              Shared equally among all players who matched exactly 3 of the 5
              drawn numbers.
            </p>
          </div>
          <div className="prize-tier prize-tier--silver">
            <div className="prize-tier__icon">🥈</div>
            <div className="prize-tier__match">Match 4</div>
            <div className="prize-tier__name">Silver Prize</div>
            <div className="prize-tier__pct">35% of pool</div>
            <p className="prize-tier__desc">
              Shared among players who matched 4 out of 5 numbers. Higher odds
              than the jackpot, bigger reward than bronze.
            </p>
          </div>
          <div className="prize-tier prize-tier--gold">
            <div className="prize-tier__icon">🏆</div>
            <div className="prize-tier__match">Match 5</div>
            <div className="prize-tier__name">Jackpot</div>
            <div className="prize-tier__pct">40% of pool</div>
            <p className="prize-tier__desc">
              All 5 numbers matched. The jackpot rolls over each month without a
              winner, growing until it&apos;s claimed.
            </p>
          </div>
        </div>
      </section>

      {/* ── Featured Charities ────────────────────────────────────────────── */}
      {featuredCharities.length > 0 && (
        <section
          className="home-section home-charities"
          aria-label="Featured charities"
        >
          <div className="home-section__header">
            <div className="home-section__badge">Verified Partners</div>
            <h2 className="home-section__title">Charities You Can Support</h2>
            <p className="home-section__subtitle">
              Every charity in our directory is independently verified. You
              choose where your contribution goes.
            </p>
          </div>

          <div className="home-charities__grid">
            {featuredCharities.map((charity) => (
              <Link
                key={charity.id}
                href={`/charities/${charity.slug}`}
                className="home-charity-card"
              >
                <div className="home-charity-card__logo">
                  {charity.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={charity.logo_url}
                      alt={charity.name}
                      className="home-charity-card__logo-img"
                    />
                  ) : (
                    <span>{charity.name.charAt(0)}</span>
                  )}
                </div>
                <h3 className="home-charity-card__name">{charity.name}</h3>
                <p className="home-charity-card__desc">
                  {(charity.description ?? "").slice(0, 100)}
                  {(charity.description ?? "").length > 100 ? "…" : ""}
                </p>
                <span className="home-charity-card__link">View charity →</span>
              </Link>
            ))}
          </div>

          <div className="home-charities__cta">
            <Link href="/charities" className="home-charities__browse-btn">
              Browse All Charities →
            </Link>
          </div>
        </section>
      )}

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="home-section home-faq" aria-label="FAQ">
        <div className="home-section__header">
          <div className="home-section__badge">Got Questions?</div>
          <h2 className="home-section__title">Frequently Asked</h2>
        </div>

        <div className="home-faq__grid">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="home-faq__item">
              <h3 className="home-faq__q">{q}</h3>
              <p className="home-faq__a">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="home-cta-banner" aria-label="Call to action">
        <div className="home-cta-banner__inner">
          <h2 className="home-cta-banner__title">
            Ready to Play Golf for Good?
          </h2>
          <p className="home-cta-banner__sub">
            Join golfers already supporting charities and winning monthly prizes.
            Cancel anytime.
          </p>
          <div className="home-cta-banner__actions">
            <Link href="/signup" className="home-hero__cta">
              Create Free Account
            </Link>
            <Link href="/pricing" className="home-hero__secondary">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
