/**
 * GET /api/admin/users — Admin: list all users with subscription status
 *
 * Returns paginated user list with their profile + subscription info.
 * Supports ?search=email&page=1 query params.
 *
 * Admin role required.
 */
import { type NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const PAGE_SIZE = 20;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const svc = createServiceClient();

  // Build profiles query
  let query = svc
    .from("profiles")
    .select("id, email, full_name, role, created_at, selected_charity_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("email", `%${search}%`);
  }

  const { data: profiles, count, error } = await query;

  if (error) {
    console.error("[GET /api/admin/users]", error.message);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ users: [], total: 0, page, page_size: PAGE_SIZE });
  }

  // Fetch subscriptions for these users in one query
  const userIds = profiles.map((p) => p.id);
  const { data: subscriptions } = await svc
    .from("subscriptions")
    .select("user_id, status, plan_type, current_period_end")
    .in("user_id", userIds)
    .eq("status", "active");

  const subMap = new Map(
    (subscriptions ?? []).map((s) => [s.user_id, s])
  );

  // Fetch score counts for these users
  const { data: scoreCounts } = await svc
    .from("scores")
    .select("user_id")
    .in("user_id", userIds);

  const scoreCountMap = new Map<string, number>();
  for (const s of scoreCounts ?? []) {
    scoreCountMap.set(s.user_id, (scoreCountMap.get(s.user_id) ?? 0) + 1);
  }

  const users = profiles.map((profile) => ({
    ...profile,
    subscription: subMap.get(profile.id) ?? null,
    score_count: scoreCountMap.get(profile.id) ?? 0,
  }));

  return NextResponse.json({
    users,
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
  });
}
