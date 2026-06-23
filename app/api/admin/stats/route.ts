/**
 * GET /api/admin/stats — Admin dashboard metrics
 *
 * Returns a snapshot of platform health metrics for the admin overview:
 *   - Total users, active subscriptions, revenue estimate
 *   - Draw counts by status
 *   - Pending winner verifications count
 *   - Charity contribution summary
 *
 * Admin role required. Uses service client for cross-table queries.
 */
import { NextResponse } from "next/server";

import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const svc = createServiceClient();

  // Run all counts in parallel
  const [
    { count: totalUsers },
    { count: activeSubscriptions },
    { count: pendingDraws },
    { count: publishedDraws },
    { count: pendingVerifications },
    { count: totalCharities },
    { data: recentDraws },
  ] = await Promise.all([
    svc.from("profiles").select("*", { count: "exact", head: true }),
    svc.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    svc.from("draws").select("*", { count: "exact", head: true }).eq("status", "pending"),
    svc.from("draws").select("*", { count: "exact", head: true }).eq("status", "published"),
    svc.from("winner_verifications").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
    svc.from("charities").select("*", { count: "exact", head: true }).eq("is_active", true),
    svc.from("draws").select("draw_month, draw_year, status, total_prize_pool_pence").order("draw_year", { ascending: false }).order("draw_month", { ascending: false }).limit(3),
  ]);

  // Revenue estimate: active subs × monthly price
  const MONTHLY_PRICE = parseInt(process.env.SUBSCRIPTION_PRICE_MONTHLY_AMOUNT ?? "99900");
  const estimatedMonthlyRevenuePence = (activeSubscriptions ?? 0) * MONTHLY_PRICE;

  return NextResponse.json({
    users: {
      total: totalUsers ?? 0,
    },
    subscriptions: {
      active: activeSubscriptions ?? 0,
      estimated_monthly_revenue_pence: estimatedMonthlyRevenuePence,
    },
    draws: {
      pending: pendingDraws ?? 0,
      published: publishedDraws ?? 0,
      recent: recentDraws ?? [],
    },
    verifications: {
      pending: pendingVerifications ?? 0,
    },
    charities: {
      active: totalCharities ?? 0,
    },
  });
}
