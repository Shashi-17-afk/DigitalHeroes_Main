/**
 * getServerUser — Safe server-side user retrieval
 *
 * Wraps supabase.auth.getUser() with error handling so layouts never throw
 * a 500 when Supabase is unavailable (not configured, network error, etc).
 *
 * On error → returns null → layout redirects to /login.
 * This is correct behaviour: an unavailable auth server = treat as unauthenticated.
 *
 * Usage in layouts and Server Components:
 *   const user = await getServerUser();
 *   if (!user) redirect("/login");
 */
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export async function getServerUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Auth] supabase.auth.getUser() failed. Check NEXT_PUBLIC_SUPABASE_URL in .env.local.\n",
        err instanceof Error ? err.message : String(err)
      );
    }
    return null;
  }
}
