/**
 * Supabase Middleware Session Helper
 *
 * Called from middleware.ts on every request.
 * Responsibilities:
 *   1. Refresh the Supabase auth session (rotates tokens when near expiry)
 *   2. Propagate refreshed cookies to both the request and response
 *   3. Return the current user (null if unauthenticated)
 *
 * IMPORTANT: supabaseResponse must be returned from middleware — do NOT create
 * a new NextResponse after this call, or cookies will not be propagated.
 *
 * Pattern follows official Supabase + Next.js 15 documentation.
 */
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/database.types";
import type { User } from "@supabase/supabase-js";

export type SessionResult = {
  supabaseResponse: NextResponse;
  user: User | null;
};

export async function updateSession(request: NextRequest): Promise<SessionResult> {
  // Start with a pass-through response — will be replaced if cookies are set
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward refreshed cookies to the request (for downstream Server Components)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Re-create the response to include the new cookies
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getUser() validates the JWT server-side — this is the canonical way to
  // get a trusted user object. Do NOT use getSession() here (client-side only).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
