/**
 * GET /api/admin/winners — All winners with draw + user info
 * Admin role required.
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

  const { data, error } = await svc
    .from("winners")
    .select("*, draws(draw_month, draw_year), profiles:user_id(email, full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/admin/winners]", error.message);
    return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 });
  }

  return NextResponse.json({ winners: data ?? [] });
}
