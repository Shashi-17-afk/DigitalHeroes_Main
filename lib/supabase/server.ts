/**
 * Supabase Server Client
 *
 * Use this in:
 *   - Server Components
 *   - Server Actions ("use server")
 *   - API Routes (route.ts)
 *
 * Uses Next.js `cookies()` from next/headers for session management.
 * The try-catch in setAll is required: Server Components cannot set cookies
 * directly — only Server Actions and Route Handlers can. The middleware
 * handles the actual cookie refresh.
 *
 * Architectural choice: @supabase/ssr for Next.js 15 App Router.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

export async function createClient(): Promise<ReturnType<typeof createServerClient<Database>>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies — middleware handles refresh.
            // This is expected and safe to ignore.
          }
        },
      },
    }
  );
}
