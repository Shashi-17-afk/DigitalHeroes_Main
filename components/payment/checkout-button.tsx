"use client";

/**
 * CheckoutButton — Full Razorpay Standard Checkout integration
 *
 * Handles the complete three-step Razorpay payment flow:
 *   1. POST /api/razorpay/create-order → get order_id
 *   2. Open Razorpay modal with order_id
 *   3. POST /api/razorpay/verify-payment → HMAC-SHA256 verification
 *
 * Props:
 *   amount      — payment amount in PAISE (e.g. 99900 = ₹999.00)
 *   currency    — ISO 4217 currency code (default: "INR")
 *   planType    — "monthly" | "yearly" — recorded in Razorpay notes
 *   buttonText  — custom button label (default: "Subscribe Now")
 *   prefill     — pre-fill name/email in the Razorpay modal
 *   onSuccess   — callback with payment_id when payment + verification succeeds
 *   onError     — callback with error message string
 *
 * Usage:
 *   <CheckoutButton
 *     amount={99900}
 *     planType="yearly"
 *     prefill={{ name: user.name, email: user.email }}
 *     onSuccess={(paymentId) => router.push("/dashboard?subscribed=true")}
 *   />
 */
import React, { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRazorpay } from "@/hooks/use-razorpay";
import type {
  RazorpayPaymentFailedEvent,
  RazorpayPaymentResponse,
} from "@/types/razorpay";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutButtonProps {
  /** Payment amount in PAISE (smallest currency unit). Minimum: 100 paise */
  amount: number;
  /** ISO 4217 currency code. Default: "INR" */
  currency?: string;
  /** Subscription plan type — recorded in Razorpay order notes */
  planType: "monthly" | "yearly";
  /** Button label text */
  buttonText?: string;
  /** Additional CSS classes for the button element */
  className?: string;
  /** Pre-fill user details in the Razorpay checkout modal */
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  /**
   * URL to redirect to after successful payment.
   * Serializable — safe to pass from Server Components.
   * If both successRedirect and onSuccess are provided, onSuccess fires first.
   */
  successRedirect?: string;
  /** Called with payment_id when the payment is verified on the server */
  onSuccess?: (paymentId: string) => void;
  /** Called with an error message string on any failure */
  onError?: (error: string) => void;
}

// ─── Create Order ─────────────────────────────────────────────────────────────

interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
}

async function createOrder(
  amount: number,
  currency: string,
  plan: string
): Promise<CreateOrderResponse> {
  const res = await fetch("/api/razorpay/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, currency, plan }),
  });

  if (!res.ok) {
    const { error } = (await res.json()) as { error?: string };
    throw new Error(error ?? "Failed to create payment order");
  }

  return res.json() as Promise<CreateOrderResponse>;
}

// ─── Verify Payment ───────────────────────────────────────────────────────────

async function verifyPayment(
  response: RazorpayPaymentResponse,
  plan: string
): Promise<void> {
  const res = await fetch("/api/razorpay/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...response, plan_type: plan }),
  });

  if (!res.ok) {
    const { error } = (await res.json()) as { error?: string };
    throw new Error(error ?? "Payment signature verification failed");
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckoutButton({
  amount,
  currency = "INR",
  planType,
  buttonText = "Subscribe Now",
  className,
  prefill,
  successRedirect,
  onSuccess,
  onError,
}: CheckoutButtonProps): React.JSX.Element {
  const { isLoaded, isError } = useRazorpay();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  function handleError(message: string): void {
    setErrorMessage(message);
    onError?.(message);
    setIsPending(false);
  }

  async function handleCheckout(): Promise<void> {
    setIsPending(true);
    setErrorMessage(null);

    try {
      // ── Step 1: Create server-side order ─────────────────────────────────
      const order = await createOrder(amount, currency, planType);

      // ── Step 2: Open Razorpay checkout modal ──────────────────────────────
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        amount: order.amount,
        currency: order.currency,
        name: "Digital Heroes",
        description: `${planType === "monthly" ? "Monthly" : "Yearly"} Golf Subscription`,
        order_id: order.order_id,
        prefill: {
          name: prefill?.name ?? "",
          email: prefill?.email ?? "",
          contact: prefill?.contact ?? "",
        },
        notes: {
          plan: planType,
        },
        theme: {
          // Brand colour: indigo — matches the app's glassmorphism design
          color: "#6366f1",
        },
        modal: {
          escape: true,
          backdropclose: false,
          ondismiss: () => {
            // User closed the modal without paying — reset state, no error
            setIsPending(false);
          },
        },
        retry: {
          // Allow Razorpay to retry failed payments within the modal
          enabled: true,
          max_count: 3,
        },

        // ── Step 3: Payment success → verify on server ───────────────────
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            await verifyPayment(response, planType);
            setIsSuccess(true);
            onSuccess?.(response.razorpay_payment_id);
            if (successRedirect) {
              window.location.href = successRedirect;
            }
          } catch (err) {
            handleError(
              err instanceof Error ? err.message : "Verification failed"
            );
          } finally {
            setIsPending(false);
          }
        },
      });

      // Handle payment failure event (network error, card decline, etc.)
      rzp.on("payment.failed", (response: RazorpayPaymentFailedEvent) => {
        const description =
          response.error.description ||
          "Payment failed. Please try a different payment method.";
        handleError(description);
      });

      rzp.open();
    } catch (err) {
      handleError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    }
  }

  // ── Error state: checkout.js failed to load ─────────────────────────────────
  if (isError) {
    return (
      <p className="text-sm text-red-400" role="alert">
        Payment service unavailable. Please check your connection and refresh.
      </p>
    );
  }

  // ── Success state: show confirmation ───────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        Payment successful! Your subscription is now active.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={() => void handleCheckout()}
        disabled={!isLoaded || isPending}
        className={className}
        aria-busy={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Processing…
          </>
        ) : !isLoaded ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Loading…
          </>
        ) : (
          buttonText
        )}
      </Button>

      {errorMessage && (
        <p className="text-sm text-red-400" role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
