/**
 * GET /api/draws — Authenticated user's draw history + results
 *
 * PRD §06: Users can see their draw participation history.
 * Returns published draws with the user's match results.
 */
import { NextResponse } from "next/server";

import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Fetch published draws
  const { data: draws, error } = await supabase
    .from("draws")
    .select("*")
    .eq("status", "published")
    .order("draw_year", { ascending: false })
    .order("draw_month", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch draws" }, { status: 500 });
  }

  if (!draws || draws.length === 0) {
    return NextResponse.json({ draws: [], results: [], winners: [] });
  }

  const drawIds = draws.map((d) => d.id);

  // Fetch user's draw results
  const { data: results } = await supabase
    .from("draw_results")
    .select("*")
    .eq("user_id", user.id)
    .in("draw_id", drawIds);

  // Fetch user's winnings
  const { data: winners } = await supabase
    .from("winners")
    .select("*")
    .eq("user_id", user.id)
    .in("draw_id", drawIds);

  return NextResponse.json({
    draws,
    results: results ?? [],
    winners: winners ?? [],
  });
}
