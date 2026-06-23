/**
 * POST /api/winners/[id]/verify — User submits screenshot URL for verification
 *
 * PRD §09:
 *   - Winner submits screenshot of their golf scores
 *   - Admin reviews and approves/rejects
 *   - On approval: payment_status → paid
 */
import { type NextRequest, NextResponse } from "next/server";

import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── POST /api/winners/[id]/verify ───────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: winnerId } = await context.params;
  const supabase = await createClient();

  // Verify the winner record belongs to this user
  const serviceClient = createServiceClient();
  const { data: winner } = await serviceClient
    .from("winners")
    .select("*")
    .eq("id", winnerId)
    .single();

  if (!winner) {
    return NextResponse.json({ error: "Winner record not found" }, { status: 404 });
  }

  if (winner.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (winner.payment_status !== "pending") {
    return NextResponse.json(
      { error: "This prize has already been processed" },
      { status: 400 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { screenshot_url } = body as { screenshot_url?: string };

  if (!screenshot_url || typeof screenshot_url !== "string") {
    return NextResponse.json(
      { error: "screenshot_url is required" },
      { status: 400 }
    );
  }

  // Validate URL format
  try {
    new URL(screenshot_url);
  } catch {
    return NextResponse.json(
      { error: "screenshot_url must be a valid URL" },
      { status: 400 }
    );
  }

  // Check for existing verification (prevent duplicate submissions)
  const { data: existing } = await supabase
    .from("winner_verifications")
    .select("id, verification_status")
    .eq("winner_id", winnerId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    if (existing.verification_status === "pending") {
      return NextResponse.json(
        { error: "Verification already submitted and under review" },
        { status: 409 }
      );
    }
    if (existing.verification_status === "approved") {
      return NextResponse.json(
        { error: "Verification already approved" },
        { status: 409 }
      );
    }
    // If rejected, allow re-submission by updating the existing record
    const { data: updated } = await serviceClient
      .from("winner_verifications")
      .update({
        screenshot_url,
        verification_status: "pending" as const,
        admin_notes: null,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", existing.id)
      .select()
      .single();

    return NextResponse.json({ verification: updated, resubmitted: true });
  }

  // Insert new verification
  const { data, error } = await serviceClient
    .from("winner_verifications")
    .insert({
      winner_id: winnerId,
      user_id: user.id,
      screenshot_url,
      verification_status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/winners/[id]/verify]", error.message);
    return NextResponse.json(
      { error: "Failed to submit verification" },
      { status: 500 }
    );
  }

  return NextResponse.json({ verification: data }, { status: 201 });
}
