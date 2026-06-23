"use client";

import Link from "next/link";

/**
 * PublicNavActions — Client component for the nav CTA buttons.
 * Intentionally simple: just links to login and signup.
 * No auth-state dependency (keep it static for SSG).
 */
export function PublicNavActions(): React.JSX.Element {
  return (
    <div className="public-nav__actions">
      <Link href="/login" className="public-nav__login">
        Sign In
      </Link>
      <Link href="/signup" className="public-nav__cta">
        Get Started
      </Link>
    </div>
  );
}
