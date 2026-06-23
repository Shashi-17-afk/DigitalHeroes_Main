/**
 * POST /api/admin/verifications/[id]/review
 * Admin approves or rejects a winner verification
 */
import { type NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/resend";
import { verificationApprovedEmail, verificationRejectedEmail } from "@/lib/email/templates";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { VerificationStatus } from "@/types/database.types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { decision, admin_notes } = body as {
    decision: "approved" | "rejected";
    admin_notes?: string;
  };

  if (!["approved", "rejected"].includes(decision)) {
    return NextResponse.json(
      { error: "decision must be 'approved' or 'rejected'" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();
  const now = new Date().toISOString();

  const { data: verification, error: vError } = await serviceClient
    .from("winner_verifications")
    .update({
      verification_status: decision as VerificationStatus,
      admin_notes: admin_notes ?? null,
      reviewed_by: auth.userId,
      reviewed_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (vError || !verification) {
    return NextResponse.json({ error: "Verification not found" }, { status: 404 });
  }

  if (decision === "approved") {
    // Fetch winner to get prize amount for email
    const { data: winner } = await serviceClient
      .from("winners")
      .select("prize_amount_pence")
      .eq("id", verification.winner_id)
      .single();

    await serviceClient
      .from("winners")
      .update({ payment_status: "paid", paid_at: now })
      .eq("id", verification.winner_id);

    await serviceClient.from("notifications").insert({
      user_id: verification.user_id,
      type: "winner_alert" as const,
      title: "🏆 Prize verification approved!",
      body: "Your prize claim has been approved. Payment will be processed shortly.",
    });

    // Send approval email
    try {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", verification.user_id)
        .single();
      if (profile?.email) {
        const { subject, html } = verificationApprovedEmail({
          fullName: profile.full_name ?? profile.email,
          email: profile.email,
          prizePence: winner?.prize_amount_pence ?? 0,
        });
        void sendEmail({ to: profile.email, subject, html });
      }
    } catch (e) {
      console.error("[review] Failed to send approval email", e);
    }
  } else {
    await serviceClient
      .from("winners")
      .update({ payment_status: "rejected" })
      .eq("id", verification.winner_id);

    await serviceClient.from("notifications").insert({
      user_id: verification.user_id,
      type: "payment_reminder" as const,
      title: "⚠️ Prize verification needs resubmission",
      body: admin_notes ?? "Your verification was not approved. Please resubmit with a clearer screenshot.",
    });

    // Send rejection email
    try {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", verification.user_id)
        .single();
      if (profile?.email) {
        const { subject, html } = verificationRejectedEmail({
          fullName: profile.full_name ?? profile.email,
          email: profile.email,
          adminNotes: admin_notes,
        });
        void sendEmail({ to: profile.email, subject, html });
      }
    } catch (e) {
      console.error("[review] Failed to send rejection email", e);
    }
  }

  return NextResponse.json({ verification, decision });
}
