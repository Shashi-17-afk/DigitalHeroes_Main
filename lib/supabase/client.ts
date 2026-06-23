/**
 * Supabase Browser Client
 *
 * Use this in Client Components ("use client").
 * Creates a new client instance on each call — memoize at the component level
 * if needed (createBrowserClient handles deduplication internally).
 *
 * Architectural choice: @supabase/ssr package for Next.js App Router.
 * Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */
import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

export function createClient(): ReturnType<typeof createBrowserClient<Database>> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
