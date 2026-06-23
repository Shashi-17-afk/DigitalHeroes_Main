"use client";

/**
 * useRazorpay — Razorpay Checkout.js script loader hook
 *
 * Dynamically loads checkout.js from Razorpay's CDN and exposes a
 * loading/error state. Components wait for isLoaded before calling
 * new window.Razorpay(options).
 *
 * Features:
 *   • Idempotent: calling multiple times only loads the script once
 *   • Checks window.Razorpay before injecting a new <script> tag
 *   • Cleans up nothing on unmount (script should stay loaded — modal
 *     may be re-opened without re-downloading checkout.js)
 *
 * Usage:
 *   const { isLoaded, isError } = useRazorpay();
 *   if (!isLoaded) return <Spinner />;
 *   const rzp = new window.Razorpay(options);
 */
import { useEffect, useState } from "react";

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export interface UseRazorpayResult {
  /** true when checkout.js has loaded and window.Razorpay is available */
  isLoaded: boolean;
  /** true if the script failed to load (network error, CSP block, etc.) */
  isError: boolean;
}

export function useRazorpay(): UseRazorpayResult {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    // Already loaded by a previous render / component — skip injection
    if (typeof window !== "undefined" && window.Razorpay) {
      setIsLoaded(true);
      return;
    }

    // Check if script tag already exists (e.g., added by layout)
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_URL}"]`
    );

    if (existingScript) {
      // Script tag exists but may still be loading
      if (window.Razorpay) {
        setIsLoaded(true);
      } else {
        existingScript.addEventListener("load", () => setIsLoaded(true));
        existingScript.addEventListener("error", () => setIsError(true));
      }
      return;
    }

    // Inject new <script> tag
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;

    script.addEventListener("load", () => setIsLoaded(true));
    script.addEventListener("error", () => {
      console.error(
        "[Razorpay] Failed to load checkout.js. Check network connectivity."
      );
      setIsError(true);
    });

    document.body.appendChild(script);

    // Do NOT remove script on cleanup — checkout.js must persist for modals
  }, []);

  return { isLoaded, isError };
}
