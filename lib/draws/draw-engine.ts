/**
 * Draw Engine — Core Business Logic
 *
 * PRD §06:
 *   - Monthly draw cadence
 *   - Random mode: 5 numbers drawn from pool 1–45
 *   - Algorithmic mode: weighted by score frequency across active subscribers
 *   - 5-Match, 4-Match, 3-Match tiers
 *   - Jackpot rollover if no 5-match winner
 *
 * PRD §07:
 *   - Prize pool = 50% of subscription revenue
 *   - Split: 40% (5-match), 35% (4-match), 25% (3-match)
 *   - Prizes split equally among winners in same tier
 *
 * Entry mechanic (PRD §05):
 *   - User's 5 most recent Stableford scores are their 5 draw entry numbers
 */

import type { DrawMode } from "@/types/database.types";

// ─── Prize pool constants ─────────────────────────────────────────────────────

export const POOL_CONTRIBUTION_PERCENT = 50; // 50% of revenue → prize pool
export const POOL_5_MATCH_PERCENT = 40;
export const POOL_4_MATCH_PERCENT = 35;
export const POOL_3_MATCH_PERCENT = 25;

export const MONTHLY_PRICE_PENCE = parseInt(
  process.env.SUBSCRIPTION_PRICE_MONTHLY_AMOUNT ?? "99900"
);
export const YEARLY_PRICE_PENCE = parseInt(
  process.env.SUBSCRIPTION_PRICE_YEARLY_AMOUNT ?? "999900"
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawEntryData {
  scores: number[];
  score_dates: string[];
}

export interface DrawResultData {
  user_id: string;
  entry_data: DrawEntryData;
  matched_numbers: number[];
  match_count: number;
  is_winner: boolean;
}

export interface PrizePoolCalculation {
  total_active_subscriptions: number;
  subscription_revenue_pence: number;
  pool_contribution_percent: number;
  pool_contribution_pence: number;
  jackpot_rollover_in_pence: number;
  total_pool_pence: number;
  pool_5_match_pence: number;
  pool_4_match_pence: number;
  pool_3_match_pence: number;
}

export interface WinnerTier {
  match_type: "5_match" | "4_match" | "3_match";
  winners: string[]; // user_ids
  prize_per_winner_pence: number;
}

// ─── Random number generation ─────────────────────────────────────────────────

/**
 * Draw 5 unique random numbers from 1–45 (score range)
 */
export function drawRandomNumbers(): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const drawn: number[] = [];

  for (let i = 0; i < 5; i++) {
    const remaining = pool.filter((n) => !drawn.includes(n));
    const idx = Math.floor(Math.random() * remaining.length);
    drawn.push(remaining[idx]);
  }

  return drawn.sort((a, b) => a - b);
}

/**
 * Draw 5 numbers weighted by frequency of score appearances
 * across all active subscribers. Scores that appear more often
 * have a proportionally higher chance of being drawn.
 *
 * @param allScores - Flat array of all score values from active users
 */
export function drawAlgorithmicNumbers(allScores: number[]): number[] {
  if (allScores.length === 0) return drawRandomNumbers();

  // Build frequency map
  const freq = new Map<number, number>();
  for (const score of allScores) {
    freq.set(score, (freq.get(score) ?? 0) + 1);
  }

  // Build weighted pool — each number appears proportionally to its frequency
  const weightedPool: number[] = [];
  for (const [score, count] of freq.entries()) {
    for (let i = 0; i < count; i++) {
      weightedPool.push(score);
    }
  }

  // Shuffle weighted pool and pick 5 unique numbers
  const drawn: number[] = [];
  const shuffled = [...weightedPool].sort(() => Math.random() - 0.5);

  for (const num of shuffled) {
    if (!drawn.includes(num)) {
      drawn.push(num);
    }
    if (drawn.length === 5) break;
  }

  // Pad with random if we didn't get 5 unique (unlikely edge case)
  while (drawn.length < 5) {
    const candidate = Math.floor(Math.random() * 45) + 1;
    if (!drawn.includes(candidate)) drawn.push(candidate);
  }

  return drawn.sort((a, b) => a - b);
}

// ─── Match computation ────────────────────────────────────────────────────────

/**
 * Compute matches between a user's entry numbers and drawn numbers
 */
export function computeMatch(
  entryNumbers: number[],
  drawnNumbers: number[]
): { matched: number[]; count: number } {
  const matched = entryNumbers.filter((n) => drawnNumbers.includes(n));
  return { matched, count: matched.length };
}

// ─── Prize pool calculation ───────────────────────────────────────────────────

/**
 * Calculate the prize pool for a draw
 *
 * PRD §07:
 *   - 50% of subscription revenue goes to prize pool
 *   - 5-match: 40%, 4-match: 35%, 3-match: 25%
 *   - Previous jackpot rollover added to 5-match pool
 */
export function calculatePrizePool(
  activeMonthlySubscriptions: number,
  activeYearlySubscriptions: number,
  jackpotCarriedInPence: number
): PrizePoolCalculation {
  const monthlyRevenue = activeMonthlySubscriptions * MONTHLY_PRICE_PENCE;
  // Yearly subs contribute monthly equivalent (annual / 12)
  const yearlyMonthlyEquivalent = Math.floor(
    (activeYearlySubscriptions * YEARLY_PRICE_PENCE) / 12
  );
  const totalRevenue = monthlyRevenue + yearlyMonthlyEquivalent;
  const totalActiveSubscriptions =
    activeMonthlySubscriptions + activeYearlySubscriptions;

  const poolContribution = Math.floor(
    (totalRevenue * POOL_CONTRIBUTION_PERCENT) / 100
  );
  const totalPool = poolContribution + jackpotCarriedInPence;

  const pool5 = Math.floor((totalPool * POOL_5_MATCH_PERCENT) / 100);
  const pool4 = Math.floor((totalPool * POOL_4_MATCH_PERCENT) / 100);
  // 3-match gets the remainder to avoid rounding losses
  const pool3 = totalPool - pool5 - pool4;

  return {
    total_active_subscriptions: totalActiveSubscriptions,
    subscription_revenue_pence: totalRevenue,
    pool_contribution_percent: POOL_CONTRIBUTION_PERCENT,
    pool_contribution_pence: poolContribution,
    jackpot_rollover_in_pence: jackpotCarriedInPence,
    total_pool_pence: totalPool,
    pool_5_match_pence: pool5,
    pool_4_match_pence: pool4,
    pool_3_match_pence: pool3,
  };
}

// ─── Winner tier computation ──────────────────────────────────────────────────

/**
 * Determine winners per tier and calculate per-winner prize amounts
 * PRD §07: Prizes split equally among multiple winners in same tier
 */
export function computeWinnerTiers(
  results: DrawResultData[],
  pool5Pence: number,
  pool4Pence: number,
  pool3Pence: number
): WinnerTier[] {
  const match5 = results.filter((r) => r.match_count === 5).map((r) => r.user_id);
  const match4 = results.filter((r) => r.match_count === 4).map((r) => r.user_id);
  const match3 = results.filter((r) => r.match_count === 3).map((r) => r.user_id);

  const tiers: WinnerTier[] = [];

  if (match5.length > 0) {
    tiers.push({
      match_type: "5_match",
      winners: match5,
      prize_per_winner_pence: Math.floor(pool5Pence / match5.length),
    });
  }

  if (match4.length > 0) {
    tiers.push({
      match_type: "4_match",
      winners: match4,
      prize_per_winner_pence: Math.floor(pool4Pence / match4.length),
    });
  }

  if (match3.length > 0) {
    tiers.push({
      match_type: "3_match",
      winners: match3,
      prize_per_winner_pence: Math.floor(pool3Pence / match3.length),
    });
  }

  return tiers;
}

// ─── Number drawing dispatch ──────────────────────────────────────────────────

export function drawNumbers(
  mode: DrawMode,
  allScores: number[]
): number[] {
  if (mode === "algorithmic") {
    return drawAlgorithmicNumbers(allScores);
  }
  return drawRandomNumbers();
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function penceToDisplay(pence: number, currency = "INR"): string {
  const amount = pence / 100;
  if (currency.toUpperCase() === "GBP") {
    return `£${amount.toFixed(2)}`;
  }
  return `₹${amount.toFixed(0)}`;
}
