/**
 * GET  /api/notifications — Fetch authenticated user's notifications
 * POST /api/notifications/read-all — Mark all as read
 *
 * PRD §13: draw results, winner alerts, payment reminders, system updates.
 * Broadcasts (user_id = NULL) are visible to all authenticated users.
 *
 * Query: merges personal notifications + broadcasts, ordered by created_at DESC.
 * Supabase RLS handles this with an OR policy:
 *   user_id = auth.uid() OR user_id IS NULL
 */
import { type NextRequest, NextResponse } from "next/server";

import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/notifications ───────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const unreadOnly = searchParams.get("unread") === "true";

  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/notifications]", error.message);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }

  const unreadCount = (data ?? []).filter((n) => !n.is_read).length;

  return NextResponse.json({
    notifications: data ?? [],
    unread_count: unreadCount,
  });
}


