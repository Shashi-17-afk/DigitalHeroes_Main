"use client";

import { useTransition } from "react";

import { signOut } from "@/lib/actions/auth";

/**
 * LogoutButton — calls the signOut Server Action.
 * Uses useTransition to show a loading state without blocking the UI.
 * Deliberately uses only native elements — no external UI library dependency.
 */
export function LogoutButton(): React.JSX.Element {
  const [isPending, startTransition] = useTransition();

  function handleSignOut(): void {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <button
      id="logout-button"
      onClick={handleSignOut}
      disabled={isPending}
      className="logout-btn"
      aria-label="Sign out of your account"
    >
      {isPending ? "Signing out…" : "⎋ Sign Out"}
    </button>
  );
}
