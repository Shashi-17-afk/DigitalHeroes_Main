/**
 * Global type declarations for Razorpay Checkout.js (browser SDK)
 *
 * Razorpay Checkout.js is loaded via a CDN <script> tag and attaches a
 * constructor to window.Razorpay. This file teaches TypeScript about that
 * global so Client Components can call `new window.Razorpay(options)`.
 *
 * Server-side Razorpay SDK types come from the 'razorpay' npm package itself.
 *
 * Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
 */

// ─── Razorpay Checkout Response ──────────────────────────────────────────────

/**
 * Returned by the Razorpay modal handler on successful payment.
 * All three fields are required for HMAC-SHA256 signature verification.
 */
export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// ─── Payment Failure ──────────────────────────────────────────────────────────

export interface RazorpayError {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: {
    order_id: string;
    payment_id?: string;
  };
}

export interface RazorpayPaymentFailedEvent {
  error: RazorpayError;
}

// ─── Checkout Options ─────────────────────────────────────────────────────────

export interface RazorpayOptions {
  /** Public Key ID — safe for frontend. NEVER use Key Secret here. */
  key: string;
  /** Amount in smallest currency unit (e.g. paise for INR, pence for GBP) */
  amount: number;
  currency: string;
  /** Business display name shown in the modal */
  name: string;
  description?: string;
  /** Square image URL (recommended: 256x256px) */
  image?: string;
  /** Order ID returned by POST /api/razorpay/create-order */
  order_id: string;
  /**
   * Called when payment completes successfully.
   * Receive razorpay_payment_id, razorpay_order_id, razorpay_signature —
   * send all three to POST /api/razorpay/verify-payment.
   */
  handler: (response: RazorpayPaymentResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    /** Brand accent colour for the modal (hex) */
    color?: string;
    hide_topbar?: boolean;
  };
  modal?: {
    /** Called when the user closes the modal without paying */
    ondismiss?: () => void;
    /** If true, modal can be closed by pressing Escape */
    escape?: boolean;
    /** If true, a backdrop click closes the modal */
    backdropclose?: boolean;
  };
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  remember_customer?: boolean;
}

// ─── Razorpay Checkout Instance ───────────────────────────────────────────────

export interface RazorpayInstance {
  /** Opens the Razorpay payment modal */
  open(): void;
  /** Programmatically closes the modal */
  close(): void;
  /**
   * Attach event listeners.
   * Currently only 'payment.failed' is supported.
   */
  on(
    event: "payment.failed",
    handler: (response: RazorpayPaymentFailedEvent) => void
  ): void;
}

// ─── Window extension ─────────────────────────────────────────────────────────

declare global {
  interface Window {
    /**
     * Razorpay Checkout constructor — available after checkout.js loads.
     * Always check window.Razorpay exists before calling.
     * Usage: const rzp = new window.Razorpay(options);
     */
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export {};
