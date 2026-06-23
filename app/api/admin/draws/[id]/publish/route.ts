/**
 * POST /api/admin/draws/[id]/publish — Publish a simulated draw
 *
 * PRD §06: Admin publishes results after simulation review.
 * Notifies winners (in-app + email) and broadcasts draw_result to all users.
 */
import { type NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/resend";
import { drawResultEmail, winnerAlertEmail } from "@/lib/email/templates";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const serviceClient = createServiceClient();

  const { data: draw } = await serviceClient
    .from("draws")
    .select("*")
    .eq("id", id)
    .single();

  if (!draw) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  if (draw.status !== "simulated") {
    return NextResponse.json(
      { error: "Draw must be in 'simulated' status before publishing" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Publish the draw
  const { data: published, error } = await serviceClient
    .from("draws")
    .update({ status: "published", published_at: now })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[publish draw]", error.message);
    return NextResponse.json({ error: "Failed to publish draw" }, { status: 500 });
  }

  // Fetch winners for this draw
  const { data: winners } = await serviceClient
    .from("winners")
    .select("user_id, match_type, prize_amount_pence")
    .eq("draw_id", id);

  const monthName = MONTH_NAMES[(draw.draw_month ?? 1) - 1];
  const drawMonth = draw.draw_month ?? 1;
  const drawYear = draw.draw_year ?? new Date().getFullYear();

  // ── Winner in-app notifications + emails ─────────────────────────────────
  if (winners && winners.length > 0) {
    // In-app notifications
    await serviceClient.from("notifications").insert(
      winners.map((w) => ({
        user_id: w.user_id,
        type: "winner_alert" as const,
        title: `🎉 You won the ${monthName} ${drawYear} draw!`,
        body: `You matched ${w.match_type.replace("_", " ")} and won ₹${(w.prize_amount_pence / 100).toFixed(0)}. Go to your draws page to claim.`,
      }))
    );

    // Email: fetch winner profiles
    const winnerIds = winners.map((w) => w.user_id);
    const { data: winnerProfiles } = await serviceClient
      .from("profiles")
      .select("id, email, full_name")
      .in("id", winnerIds);

    const profileMap = new Map((winnerProfiles ?? []).map((p) => [p.id, p]));

    for (const winner of winners) {
      const profile = profileMap.get(winner.user_id);
      if (!profile?.email) continue;
      const { subject, html } = winnerAlertEmail({
        fullName: profile.full_name ?? profile.email,
        email: profile.email,
        drawMonth,
        drawYear,
        matchType: winner.match_type,
        prizePence: winner.prize_amount_pence,
      });
      void sendEmail({ to: profile.email, subject, html });
    }
  }

  // ── Broadcast in-app notification to all users ───────────────────────────
  await serviceClient.from("notifications").insert({
    user_id: null,
    type: "draw_result" as const,
    title: `Draw results: ${drawMonth}/${drawYear}`,
    body: "The monthly draw has been published. Check your results!",
  });

  // ── Draw result email to all active subscribers ───────────────────────────
  try {
    const drawnNums = (published.drawn_numbers ?? []) as number[];
    if (drawnNums.length > 0) {
      const { data: subscribers } = await serviceClient
        .from("subscriptions")
        .select("user_id")
        .eq("status", "active");

      if (subscribers && subscribers.length > 0) {
        const subscriberIds = subscribers.map((s) => s.user_id);
        const { data: subProfiles } = await serviceClient
          .from("profiles")
          .select("email")
          .in("id", subscriberIds);

        const emails = (subProfiles ?? [])
          .map((p) => p.email)
          .filter(Boolean) as string[];

        for (const email of emails) {
          const { subject, html } = drawResultEmail({
            email,
            drawMonth,
            drawYear,
            drawnNumbers: drawnNums,
            prizePoolPence: draw.total_prize_pool_pence ?? 0,
          });
          void sendEmail({ to: email, subject, html });
        }
      }
    }
  } catch (e) {
    console.error("[publish draw] Failed to send draw result emails", e);
  }

  return NextResponse.json({ draw: published, published: true });
}
