/**
 * POST /api/admin/draws — Admin: create a new draw
 * GET  /api/admin/draws — Admin: list all draws
 *
 * PRD §06: Admin controls draw creation and scheduling.
 * Security: Admin role required for all operations.
 */
import { type NextRequest, NextResponse } from "next/server";

import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { DrawMode } from "@/types/database.types";

// ─── Admin check ──────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<
  { userId: string } | NextResponse
> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

// ─── GET /api/admin/draws ─────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("draws")
    .select("*")
    .order("draw_year", { ascending: false })
    .order("draw_month", { ascending: false });

  if (error) {
    console.error("[GET /api/admin/draws]", error.message);
    return NextResponse.json({ error: "Failed to fetch draws" }, { status: 500 });
  }

  return NextResponse.json({ draws: data });
}

// ─── POST /api/admin/draws ────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    draw_month,
    draw_year,
    draw_mode = "random",
    jackpot_carried_in_pence = 0,
  } = body as {
    draw_month: number;
    draw_year: number;
    draw_mode?: DrawMode;
    jackpot_carried_in_pence?: number;
  };

  // Validate
  if (!draw_month || !draw_year) {
    return NextResponse.json(
      { error: "draw_month and draw_year are required" },
      { status: 400 }
    );
  }
  if (draw_month < 1 || draw_month > 12) {
    return NextResponse.json(
      { error: "draw_month must be 1–12" },
      { status: 400 }
    );
  }
  if (draw_year < 2024) {
    return NextResponse.json(
      { error: "draw_year must be ≥ 2024" },
      { status: 400 }
    );
  }
  if (!["random", "algorithmic"].includes(draw_mode)) {
    return NextResponse.json(
      { error: "draw_mode must be 'random' or 'algorithmic'" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  // Count active subscribers for prize pool calculation
  const { count: activeCount } = await serviceClient
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { data, error } = await serviceClient
    .from("draws")
    .insert({
      draw_month,
      draw_year,
      draw_mode,
      status: "pending",
      jackpot_carried_in_pence,
      active_subscriber_count: activeCount ?? 0,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `A draw already exists for ${draw_month}/${draw_year}` },
        { status: 409 }
      );
    }
    console.error("[POST /api/admin/draws]", error.message);
    return NextResponse.json({ error: "Failed to create draw" }, { status: 500 });
  }

  return NextResponse.json({ draw: data }, { status: 201 });
}
