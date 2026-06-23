/**
 * GET  /api/admin/verifications — List all pending verifications
 * POST /api/admin/verifications/[id]/review — Admin approves or rejects
 *
 * PRD §09: Admin reviews submitted screenshots. On approval, payment_status
 * is updated to 'paid' and winner is notified.
 */
import { type NextRequest, NextResponse } from "next/server";

import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

// ─── GET /api/admin/verifications ─────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient
    .from("winner_verifications")
    .select("*, winners(match_type, prize_amount_pence, draw_id), profiles:user_id(email, full_name)")
    .eq("verification_status", status as "pending" | "approved" | "rejected")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/admin/verifications]", error.message);
    return NextResponse.json(
      { error: "Failed to fetch verifications" },
      { status: 500 }
    );
  }

  return NextResponse.json({ verifications: data });
}


