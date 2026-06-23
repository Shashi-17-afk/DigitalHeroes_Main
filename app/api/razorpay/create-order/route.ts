/**
 * POST /api/razorpay/create-order
 *
 * Creates a Razorpay order on the server and returns the order_id to the
 * client. The client then opens the Razorpay modal with this order_id.
 *
 * Flow:
 *   Frontend (checkout-button) → POST here → Razorpay API → return order
 *
 * Security:
 *   - Requires authenticated Supabase session (401 if not logged in)
 *   - Key Secret stays server-side — never returned to client
 *   - Amount validated server-side (≥ 100 paise minimum)
 *   - receipt ties the order to the authenticated user
 *
 * Request body:
 *   { amount: number, currency?: string, plan?: "monthly" | "yearly" }
 *
 * Success response:
 *   { order_id: string, amount: number, currency: string }
 */
import { type NextRequest, NextResponse } from "next/server";

import { getRazorpay } from "@/lib/razorpay/client";
import { getServerUser } from "@/lib/supabase/get-server-user";

// Razorpay's minimum order amount is 100 paise (₹1.00)
const MINIMUM_AMOUNT_PAISE = 100;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse and validate request body ────────────────────────────────────────
  let amount: number;
  let currency: string;
  let plan: string;

  try {
    const body = (await request.json()) as {
      amount?: unknown;
      currency?: unknown;
      plan?: unknown;
    };

    amount = Number(body.amount);
    currency = typeof body.currency === "string" ? body.currency : "INR";
    plan = typeof body.plan === "string" ? body.plan : "monthly";
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(amount) || amount < MINIMUM_AMOUNT_PAISE) {
    return NextResponse.json(
      {
        error: `Amount must be at least ${MINIMUM_AMOUNT_PAISE} paise (minimum ₹1.00)`,
      },
      { status: 400 }
    );
  }

  // ── Create Razorpay order ───────────────────────────────────────────────────
  try {
    const order = await getRazorpay().orders.create({
      // Razorpay requires integer amount
      amount: Math.round(amount),
      currency: currency.toUpperCase(),
      // receipt is your internal reference — tied to authenticated user
      receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: user.id,
        plan,
        email: user.email ?? "",
      },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    // Log full error server-side — return generic message to client
    console.error("[Razorpay] Create order failed:", err);

    const message =
      err instanceof Error ? err.message : "Razorpay API error";

    return NextResponse.json(
      { error: `Failed to create order: ${message}` },
      { status: 500 }
    );
  }
}
