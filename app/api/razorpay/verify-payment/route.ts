/**
 * POST /api/razorpay/verify-payment
 *
 * Verifies a Razorpay payment signature (HMAC-SHA256) and then activates
 * the user's subscription in the database.
 *
 * Flow:
 *   1. Auth guard → reject if not logged in
 *   2. Validate required payment fields
 *   3. HMAC-SHA256 signature verification (constant-time comparison)
 *   4. Activate subscription in DB (upsert via lib/subscriptions)
 *   5. Return success with subscription details
 *
 * Security:
 *   - Key Secret used server-side only (RAZORPAY_KEY_SECRET)
 *   - timingSafeEqual() prevents timing-based signature attacks
 *   - Signature MUST match before any DB write occurs
 *   - Auth guard prevents unauthenticated subscription activation
 *
 * Request body:
 *   {
 *     razorpay_payment_id: string,
 *     razorpay_order_id: string,
 *     razorpay_signature: string,
 *     plan_type: "monthly" | "yearly"
 *   }
 *
 * Success response:
 *   { success: true, payment_id: string, subscription: SubscriptionRow }
 */
import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { activateSubscription } from "@/lib/subscriptions";
import { getServerUser } from "@/lib/supabase/get-server-user";

type PlanType = "monthly" | "yearly";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Auth guard ───────────────────────────────────────────────────────────
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse and validate request body ─────────────────────────────────────
  let razorpay_payment_id: string;
  let razorpay_order_id: string;
  let razorpay_signature: string;
  let plan_type: PlanType;

  try {
    const body = (await request.json()) as {
      razorpay_payment_id?: unknown;
      razorpay_order_id?: unknown;
      razorpay_signature?: unknown;
      plan_type?: unknown;
    };

    razorpay_payment_id = (body.razorpay_payment_id as string) ?? "";
    razorpay_order_id = (body.razorpay_order_id as string) ?? "";
    razorpay_signature = (body.razorpay_signature as string) ?? "";
    plan_type =
      body.plan_type === "yearly" ? "yearly" : "monthly";
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature",
      },
      { status: 400 }
    );
  }

  // ── 3. HMAC-SHA256 Signature Verification ──────────────────────────────────
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("[verify-payment] RAZORPAY_KEY_SECRET not set");
    return NextResponse.json(
      { error: "Payment service misconfigured" },
      { status: 500 }
    );
  }

  // Razorpay signature format: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generatedSig = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  // Constant-time comparison — prevents timing attacks
  const genBuf = Buffer.from(generatedSig, "utf-8");
  const recBuf = Buffer.from(razorpay_signature, "utf-8");
  const signaturesMatch =
    genBuf.length === recBuf.length && crypto.timingSafeEqual(genBuf, recBuf);

  if (!signaturesMatch) {
    console.warn(
      `[verify-payment] Signature mismatch — order: ${razorpay_order_id}, user: ${user.id}`
    );
    return NextResponse.json(
      { error: "Payment signature verification failed" },
      { status: 400 }
    );
  }

  // ── 4. Activate subscription in DB ─────────────────────────────────────────
  // Signature verified — safe to write to DB
  try {
    const subscription = await activateSubscription(user.id, plan_type);

    console.info(
      `[verify-payment] ✅ Subscription activated — user: ${user.id}, ` +
        `plan: ${plan_type}, payment: ${razorpay_payment_id}`
    );

    // ── 5. Return success ─────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      payment_id: razorpay_payment_id,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan_type: subscription.plan_type,
        current_period_end: subscription.current_period_end,
      },
    });
  } catch (err) {
    // Payment signature verified but DB write failed — log critical error
    console.error(
      `[verify-payment] DB write failed after signature verification — ` +
        `user: ${user.id}, payment: ${razorpay_payment_id}`,
      err
    );
    return NextResponse.json(
      {
        error: "Payment verified but subscription activation failed. Contact support.",
        payment_id: razorpay_payment_id, // Return payment_id so user can reference it
      },
      { status: 500 }
    );
  }
}
