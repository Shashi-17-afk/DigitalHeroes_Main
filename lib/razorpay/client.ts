/**
 * Razorpay Server-Side Client — Lazy Initialization
 *
 * Uses lazy initialization instead of throwing at module load time.
 * Next.js evaluates route modules during `next build` (page data collection),
 * so top-level throws crash the build even when credentials are present in
 * .env.local. Lazy init defers the check to the first actual API request.
 *
 * ENV VARS:
 *   NEXT_PUBLIC_RAZORPAY_KEY_ID  — public Key ID (safe for frontend too)
 *   RAZORPAY_KEY_SECRET          — private Key Secret (server-side only)
 *
 * Import ONLY in Server Components, API Routes, and Server Actions.
 * NEVER import in Client Components — RAZORPAY_KEY_SECRET must never
 * reach the browser bundle.
 *
 * Usage:
 *   import { getRazorpay } from "@/lib/razorpay/client";
 *   const razorpay = getRazorpay();
 *   const order = await razorpay.orders.create({ ... });
 */
import Razorpay from "razorpay";

/** Singleton instance — created once on first API call */
let _instance: Razorpay | null = null;

/**
 * Returns the shared Razorpay SDK instance.
 * Validates credentials on first call — throws at request time, not build time.
 */
export function getRazorpay(): Razorpay {
  if (_instance) return _instance;

  // NEXT_PUBLIC_ prefix exposes the key to the browser bundle (Key ID is safe to expose).
  // We reuse it here server-side to avoid duplicating the env var.
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "[Razorpay] Missing credentials. " +
        "Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local."
    );
  }

  _instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _instance;
}
