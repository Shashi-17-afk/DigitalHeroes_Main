import { PublicFooter } from "@/components/common/public-footer";
import { PublicNavbar } from "@/components/common/public-navbar";

/**
 * Public route group layout.
 * Wraps the homepage and any future public pages (how-it-works, about etc.)
 * with the site-wide navbar and footer.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <>
      <PublicNavbar />
      {children}
      <PublicFooter />
    </>
  );
}
