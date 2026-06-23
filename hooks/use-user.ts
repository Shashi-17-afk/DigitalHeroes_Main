"use client";

/**
 * useUser — Client-side current user hook
 *
 * Provides the authenticated user state in Client Components.
 * Listens to Supabase auth state changes (login, logout, token refresh).
 *
 * Usage:
 *   const { user, loading } = useUser();
 *   if (loading) return <Spinner />;
 *   if (!user) return <LoginPrompt />;
 *
 * Note: For Server Components, use the server client directly.
 * This hook is intended for interactive client-side UI (nav bars, etc.).
 */
import { useEffect, useState } from "react";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

type UseUserResult = {
  user: User | null;
  loading: boolean;
};

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get current session immediately
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
