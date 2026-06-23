import Link from "next/link";

import { PublicNavActions } from "./public-nav-actions";

/**
 * PublicNavbar — Server Component wrapper
 * Static links rendered server-side; auth-dependent CTA is a client component.
 */
export function PublicNavbar(): React.JSX.Element {
  return (
    <nav className="public-nav" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <Link href="/" className="public-nav__brand">
        <span className="public-nav__logo">⛳</span>
        <span className="public-nav__brand-name">Digital Heroes</span>
      </Link>

      {/* Links */}
      <div className="public-nav__links">
        <Link href="/charities" className="public-nav__link">
          Charities
        </Link>
        <Link href="/#how-it-works" className="public-nav__link">
          How It Works
        </Link>
        <Link href="/pricing" className="public-nav__link">
          Pricing
        </Link>
      </div>

      {/* CTA */}
      <PublicNavActions />
    </nav>
  );
}
