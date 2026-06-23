import Link from "next/link";

export function PublicFooter(): React.JSX.Element {
  const year = new Date().getFullYear();
  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        {/* Brand col */}
        <div className="public-footer__brand-col">
          <div className="public-footer__brand">
            <span className="public-footer__logo">⛳</span>
            <span className="public-footer__brand-name">Digital Heroes</span>
          </div>
          <p className="public-footer__tagline">
            Golf · Give · Win. Play golf, support charities you love, and win
            monthly prizes.
          </p>
        </div>

        {/* Links */}
        <div className="public-footer__links-col">
          <h4 className="public-footer__col-title">Platform</h4>
          <Link href="/charities" className="public-footer__link">Charities</Link>
          <Link href="/pricing" className="public-footer__link">Pricing</Link>
          <Link href="/#how-it-works" className="public-footer__link">How It Works</Link>
          <Link href="/#faq" className="public-footer__link">FAQ</Link>
        </div>

        <div className="public-footer__links-col">
          <h4 className="public-footer__col-title">Account</h4>
          <Link href="/login" className="public-footer__link">Sign In</Link>
          <Link href="/signup" className="public-footer__link">Create Account</Link>
          <Link href="/dashboard" className="public-footer__link">Dashboard</Link>
        </div>

        <div className="public-footer__links-col">
          <h4 className="public-footer__col-title">Legal</h4>
          <span className="public-footer__link public-footer__link--muted">Privacy Policy</span>
          <span className="public-footer__link public-footer__link--muted">Terms of Service</span>
          <span className="public-footer__link public-footer__link--muted">Cookie Policy</span>
        </div>
      </div>

      <div className="public-footer__bottom">
        <p className="public-footer__copy">
          © {year} Digital Heroes. All rights reserved.
        </p>
        <p className="public-footer__disclaimer">
          Payments secured by Razorpay. Charity distributions audited quarterly.
        </p>
      </div>
    </footer>
  );
}
