/**
 * Supabase Auth Callback Route
 *
 * Handles two flows:
 *   1. Email confirmation: Supabase emails a link → /api/auth/callback?code=xxx
 *      The code is exchanged for a session, and the user is redirected to /dashboard.
 *
 *   2. OAuth (future): Same pattern — Supabase redirects here after OAuth provider.
 *
 * The `next` query parameter preserves the intended destination (e.g. from middleware).
 */
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Validate `next` to prevent open redirect
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[Auth Callback] Code exchange failed:", error.message);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
        );
      }
    } catch (err) {
      console.error("[Auth Callback] Unexpected error:", err);
      return NextResponse.redirect(new URL("/login?error=callback_failed", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
