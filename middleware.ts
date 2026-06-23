/**
 * Middleware runtime: nodejs (not edge)
 *
 * @supabase/ssr uses process.version for environment detection — a Node.js API
 * not available in the Edge Runtime. Explicitly targeting Node.js runtime
 * eliminates the Next.js static-analysis warning and ensures full compatibility.
 * Trade-off: slightly higher cold-start vs Edge, acceptable for this use case.
 */
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Route classification
 * Keep these in sync with the app/ route group structure.
 */
const PROTECTED_PREFIXES = ["/dashboard"] as const;
const ADMIN_PREFIXES = ["/admin"] as const;
const AUTH_PREFIXES = ["/login", "/signup"] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Next.js Middleware — runs on every matched request
 *
 * Responsibilities:
 *   1. Refresh Supabase auth session tokens (via updateSession)
 *   2. Redirect unauthenticated users away from protected/admin routes → /login
 *   3. Redirect authenticated users away from /login and /signup → /dashboard
 *
 * Role check (admin vs subscriber) is handled in the (admin) layout.tsx
 * Server Component — avoids a second DB call in middleware while still
 * preventing unauthorized access server-side.
 *
 * Graceful degradation: if Supabase is not configured (placeholder credentials),
 * all requests pass through without auth enforcement.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // --- Graceful degradation when Supabase is not yet configured ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const isConfigured = supabaseUrl.length > 0 && supabaseUrl !== "https://your-project.supabase.co";

  if (!isConfigured) {
    // Pass all requests through without auth enforcement in unconfigured state
    return NextResponse.next();
  }

  // --- Refresh session and get current user ---
  let supabaseResponse: NextResponse;
  let user: { id: string } | null;

  try {
    const result = await updateSession(request);
    supabaseResponse = result.supabaseResponse;
    user = result.user;
  } catch {
    // Network error (e.g. invalid Supabase URL) — fail open in development
    if (process.env.NODE_ENV === "development") {
      console.warn("[Middleware] Supabase session refresh failed. Check .env.local.");
    }
    return NextResponse.next();
  }

  const isAuthenticated = user !== null;

  // --- Route protection ---

  // 1. Protected/admin routes: unauthenticated → redirect to /login
  if (
    !isAuthenticated &&
    (matchesPrefix(pathname, PROTECTED_PREFIXES) || matchesPrefix(pathname, ADMIN_PREFIXES))
  ) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    // Preserve the intended destination for post-login redirect
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Auth pages: authenticated → redirect to /dashboard
  if (isAuthenticated && matchesPrefix(pathname, AUTH_PREFIXES)) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  // --- Return the Supabase response (contains refreshed cookies) ---
  // IMPORTANT: always return supabaseResponse, not a new NextResponse,
  // so that cookie updates are correctly propagated to the browser.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (Next.js image optimisation)
     * - favicon.ico   (browser default)
     * - Public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
