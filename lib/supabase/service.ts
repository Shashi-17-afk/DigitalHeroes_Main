/**
 * Supabase Service Role Client
 *
 * Uses the SERVICE_ROLE key — bypasses ALL Row Level Security policies.
 * Use ONLY in:
 *   - API Route handlers that run after signature verification (webhooks)
 *   - Server-side admin operations
 *   - Migration/seed scripts
 *
 * NEVER expose this client or its key to the browser.
 * NEVER use this in Client Components or public API routes.
 *
 * The service role key is effectively a superuser key — treat it like
 * a database root password.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Creates a Supabase client authenticated with the service role key.
 * Call this inside the request handler — do not create at module level
 * to avoid init-time failures during Next.js build.
 */
export function createServiceClient(): ReturnType<
  typeof createClient<Database>
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Check your .env.local file."
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
