/**
 * GET /api/health
 *
 * Production health check endpoint.
 * Used by Vercel, uptime monitors, and load balancers to verify the app is alive.
 *
 * Checks:
 *   - App is responding (always passes if this runs)
 *   - Supabase connectivity (SELECT 1 via service role)
 *   - Environment variable presence (not values — safe to expose)
 *
 * Returns 200 if healthy, 503 if any critical check fails.
 * Vercel will automatically restart unhealthy instances.
 */
import { type NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

// Force dynamic — health checks must never be cached
export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
  checks: {
    app: "ok";
    supabase: "ok" | "error";
    env: {
      supabase: "configured" | "missing";
      razorpay: "configured" | "missing";
      email: "configured" | "placeholder";
    };
  };
  error?: string;
}

export async function GET(_request: NextRequest): Promise<NextResponse<HealthStatus>> {
  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version ?? "0.1.0";

  // ── Environment check (presence only — values never exposed) ──────────────
  const envCheck = {
    supabase:
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
        ? ("configured" as const)
        : ("missing" as const),
    razorpay:
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_KEY_SECRET !== "your_razorpay_key_secret"
        ? ("configured" as const)
        : ("missing" as const),
    email:
      process.env.RESEND_API_KEY &&
      !process.env.RESEND_API_KEY.startsWith("re_placeholder")
        ? ("configured" as const)
        : ("placeholder" as const),
  };

  // ── Supabase connectivity check ───────────────────────────────────────────
  let supabaseStatus: "ok" | "error" = "ok";
  let supabaseError: string | undefined;

  try {
    const svc = createServiceClient();
    // Minimal query — just check the connection is alive
    const { error } = await svc.from("profiles").select("id").limit(1);
    if (error) {
      supabaseStatus = "error";
      supabaseError = error.message;
    }
  } catch (err) {
    supabaseStatus = "error";
    supabaseError = err instanceof Error ? err.message : "Unknown error";
  }

  const isHealthy = supabaseStatus === "ok" && envCheck.supabase === "configured";

  const body: HealthStatus = {
    status: isHealthy ? "ok" : "degraded",
    timestamp,
    version,
    checks: {
      app: "ok",
      supabase: supabaseStatus,
      env: envCheck,
    },
    ...(supabaseError ? { error: supabaseError } : {}),
  };

  return NextResponse.json(body, {
    status: isHealthy ? 200 : 503,
    headers: {
      // Never cache health checks
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
