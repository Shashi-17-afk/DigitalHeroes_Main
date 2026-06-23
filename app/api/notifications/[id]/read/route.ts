/**
 * POST /api/notifications/[id]/read — Mark a single notification as read
 *
 * PRD §13: User can mark individual notifications read.
 * RLS ensures users can only mark their own or broadcast notifications.
 */
import { type NextRequest, NextResponse } from "next/server";

import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  // Fetch the notification to check ownership
  const { data: notification } = await supabase
    .from("notifications")
    .select("id, user_id, is_read")
    .eq("id", id)
    .single();

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  // Allow marking own notifications or broadcasts (user_id = null)
  if (notification.user_id !== null && notification.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (notification.is_read) {
    return NextResponse.json({ success: true, already_read: true });
  }

  // For personal notifications, update directly
  if (notification.user_id === user.id) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  } else {
    // For broadcasts (user_id = null), use service client to update
    // In production, you'd track per-user read state in a separate table
    // For now: use service client to mark it read system-wide
    const svc = createServiceClient();
    await svc
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
