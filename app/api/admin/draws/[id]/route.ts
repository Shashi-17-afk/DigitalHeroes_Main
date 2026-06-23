/**
 * POST /api/admin/draws/[id]/run     — Run the draw engine (simulate or finalize)
 * POST /api/admin/draws/[id]/publish — Publish results to users
 * GET  /api/admin/draws/[id]         — Get draw details + results
 *
 * PRD §06:
 *   - Admin runs draw (generates numbers, computes matches, identifies winners)
 *   - Admin can simulate before publishing (status: simulated → published)
 *   - On publish: notifications sent, winners table populated
 */
import { type NextRequest, NextResponse } from "next/server";

import {
  drawNumbers,
  computeMatch,
  computeWinnerTiers,
  calculatePrizePool,
  type DrawResultData,
} from "@/lib/draws/draw-engine";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── Admin guard ──────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: user.id };
}

// ─── GET /api/admin/draws/[id] ────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const serviceClient = createServiceClient();

  const { data: draw, error } = await serviceClient
    .from("draws")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !draw) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  const { data: results } = await serviceClient
    .from("draw_results")
    .select("*")
    .eq("draw_id", id)
    .order("match_count", { ascending: false });

  const { data: winners } = await serviceClient
    .from("winners")
    .select("*")
    .eq("draw_id", id);

  return NextResponse.json({ draw, results: results ?? [], winners: winners ?? [] });
}

// ─── POST /api/admin/draws/[id]/run ──────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const url = new URL(request.url);
  const action = url.pathname.endsWith("/publish") ? "publish" : "run";

  const serviceClient = createServiceClient();

  // Fetch the draw
  const { data: draw, error: drawError } = await serviceClient
    .from("draws")
    .select("*")
    .eq("id", id)
    .single();

  if (drawError || !draw) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  // ── PUBLISH action ──────────────────────────────────────────────────────────
  if (action === "publish") {
    if (draw.status !== "simulated") {
      return NextResponse.json(
        { error: "Draw must be in 'simulated' status before publishing" },
        { status: 400 }
      );
    }

    // Update draw status to published
    const { data: published, error: pubError } = await serviceClient
      .from("draws")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (pubError) {
      console.error("[publish draw]", pubError.message);
      return NextResponse.json({ error: "Failed to publish draw" }, { status: 500 });
    }

    // Notify winners
    const { data: winners } = await serviceClient
      .from("winners")
      .select("user_id, match_type, prize_amount_pence")
      .eq("draw_id", id);

    if (winners && winners.length > 0) {
      const MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const monthName = MONTH_NAMES[draw.draw_month - 1];

      const notifications = winners.map((w) => ({
        user_id: w.user_id,
        type: "winner_alert" as const,
        title: `🎉 You won the ${monthName} ${draw.draw_year} draw!`,
        body: `Congratulations! You matched ${w.match_type.replace("_", " ")} and won ₹${(w.prize_amount_pence / 100).toFixed(0)}. Submit your verification to claim your prize.`,
      }));

      await serviceClient.from("notifications").insert(notifications);
    }

    // Broadcast draw result notification to all users
    await serviceClient.from("notifications").insert({
      user_id: null,
      type: "draw_result" as const,
      title: `Draw results: ${draw.draw_month}/${draw.draw_year}`,
      body: `The draw for this month has been completed. Check your results in the draws section!`,
    });

    return NextResponse.json({ draw: published, published: true });
  }

  // ── RUN action ──────────────────────────────────────────────────────────────
  if (draw.status === "published") {
    return NextResponse.json(
      { error: "Cannot re-run a published draw" },
      { status: 400 }
    );
  }

  // Fetch all active subscribers with their latest 5 scores
  const { data: subscribers } = await serviceClient
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active");

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json(
      { error: "No active subscribers found" },
      { status: 400 }
    );
  }

  const userIds = subscribers.map((s) => s.user_id);

  // Get scores for all active subscribers
  const { data: allScores } = await serviceClient
    .from("scores")
    .select("user_id, score_value, score_date")
    .in("user_id", userIds)
    .order("score_date", { ascending: false });

  // Group scores by user (max 5 per user — already enforced by DB trigger)
  const scoresByUser = new Map<string, { score_value: number; score_date: string }[]>();
  for (const score of allScores ?? []) {
    const existing = scoresByUser.get(score.user_id) ?? [];
    if (existing.length < 5) {
      scoresByUser.set(score.user_id, [...existing, score]);
    }
  }

  // Build flat array of all scores for algorithmic mode
  const allScoreValues = Array.from(scoresByUser.values())
    .flatMap((scores) => scores.map((s) => s.score_value));

  // Draw the numbers
  const drawnNumbers = drawNumbers(draw.draw_mode, allScoreValues);

  // Compute matches for each user
  const results: DrawResultData[] = [];
  for (const userId of userIds) {
    const userScores = scoresByUser.get(userId) ?? [];
    const entryNumbers = userScores.map((s) => s.score_value);
    const scoreDates = userScores.map((s) => s.score_date);

    if (entryNumbers.length === 0) continue; // Skip users with no scores

    const { matched, count } = computeMatch(entryNumbers, drawnNumbers);

    results.push({
      user_id: userId,
      entry_data: { scores: entryNumbers, score_dates: scoreDates },
      matched_numbers: matched,
      match_count: count,
      is_winner: count >= 3,
    });
  }

  // Prize pool calculation
  const { data: monthlySubs } = await serviceClient
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .eq("plan_type", "monthly");

  const { data: yearlySubs } = await serviceClient
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .eq("plan_type", "yearly");

  const prizePool = calculatePrizePool(
    (monthlySubs as unknown as { count: number })?.count ?? 0,
    (yearlySubs as unknown as { count: number })?.count ?? 0,
    draw.jackpot_carried_in_pence
  );

  // Determine winner tiers
  const winnerTiers = computeWinnerTiers(
    results,
    prizePool.pool_5_match_pence,
    prizePool.pool_4_match_pence,
    prizePool.pool_3_match_pence
  );

  const hasJackpotWinner = winnerTiers.some((t) => t.match_type === "5_match");

  // Clear any previous simulation results
  await serviceClient.from("draw_results").delete().eq("draw_id", id);
  await serviceClient.from("winners").delete().eq("draw_id", id);

  // Insert draw results
  if (results.length > 0) {
    await serviceClient.from("draw_results").insert(
      results.map((r) => ({
        draw_id: id,
        user_id: r.user_id,
        entry_data: r.entry_data as unknown as Record<string, unknown>,
        matched_numbers: r.matched_numbers,
        match_count: r.match_count,
        is_winner: r.is_winner,
      }))
    );
  }

  // Insert winners
  for (const tier of winnerTiers) {
    await serviceClient.from("winners").insert(
      tier.winners.map((userId) => ({
        draw_id: id,
        user_id: userId,
        match_type: tier.match_type,
        prize_amount_pence: tier.prize_per_winner_pence,
        payment_status: "pending" as const,
      }))
    );
  }

  // Update draw record
  const { data: updatedDraw, error: updateError } = await serviceClient
    .from("draws")
    .update({
      status: "simulated",
      drawn_numbers: drawnNumbers,
      total_prize_pool_pence: prizePool.total_pool_pence,
      pool_5_match_pence: prizePool.pool_5_match_pence,
      pool_4_match_pence: prizePool.pool_4_match_pence,
      pool_3_match_pence: prizePool.pool_3_match_pence,
      jackpot_rolled_over: !hasJackpotWinner,
      active_subscriber_count: subscribers.length,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[run draw]", updateError.message);
    return NextResponse.json({ error: "Failed to update draw" }, { status: 500 });
  }

  // Record prize pool history
  await serviceClient.from("prize_pool_history").upsert({
    draw_id: id,
    period_month: draw.draw_month,
    period_year: draw.draw_year,
    total_active_subscriptions: prizePool.total_active_subscriptions,
    subscription_revenue_pence: prizePool.subscription_revenue_pence,
    pool_contribution_percent: prizePool.pool_contribution_percent,
    pool_contribution_pence: prizePool.pool_contribution_pence,
    jackpot_rollover_in_pence: prizePool.jackpot_rollover_in_pence,
    final_pool_5_match_pence: prizePool.pool_5_match_pence,
    final_pool_4_match_pence: prizePool.pool_4_match_pence,
    final_pool_3_match_pence: prizePool.pool_3_match_pence,
  }, { onConflict: "period_month,period_year" });

  return NextResponse.json({
    draw: updatedDraw,
    drawn_numbers: drawnNumbers,
    results_count: results.length,
    winner_tiers: winnerTiers,
    prize_pool: prizePool,
    jackpot_rolled_over: !hasJackpotWinner,
  });
}
