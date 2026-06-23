/**
 * POST /api/notifications/read-all — Mark all of user's notifications as read
 */
import { NextResponse } from "next/server";

import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const svc = createServiceClient();

  // Mark all personal notifications read
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  // Mark all broadcast notifications (user_id IS NULL) read via service client
  await svc
    .from("notifications")
    .update({ is_read: true })
    .is("user_id", null)
    .eq("is_read", false);

  return NextResponse.json({ success: true });
}
