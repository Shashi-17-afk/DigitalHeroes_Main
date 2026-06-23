import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard Layout — Auth Guard + Persistent Top Bar
 *
 * Server Component: runs on every request to /dashboard/**.
 * Renders a persistent top navigation bar with:
 *   - Brand logo + name
 *   - Nav links (Overview, Scores, Draws, Charity)
 *   - Notification bell (client component)
 *   - Subscribe/Logout buttons
 */
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, full_name")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  return (
    <div className="dash-layout">
      {/* ── Persistent Top Bar ──────────────────────────────────────────── */}
      <header className="dash-topbar">
        {/* Left: brand */}
        <a href="/dashboard" className="dash-topbar__brand">
          <span className="dash-topbar__logo">⛳</span>
          <span className="dash-topbar__brand-name">Digital Heroes</span>
        </a>

        {/* Centre: nav links */}
        <nav className="dash-topbar__nav" aria-label="Dashboard navigation">
          <a href="/dashboard" className="dash-topbar__link">Overview</a>
          <a href="/dashboard/scores" className="dash-topbar__link">Scores</a>
          <a href="/dashboard/draws" className="dash-topbar__link">Draws</a>
          <a href="/dashboard/charity" className="dash-topbar__link">Charity</a>
          {isAdmin && (
            <a href="/admin" className="dash-topbar__link dash-topbar__link--admin">
              ⚙️ Admin
            </a>
          )}
        </nav>

        {/* Right: actions */}
        <div className="dash-topbar__actions">
          <NotificationBell />
          <a href="/pricing" className="dash-topbar__plan-btn">
            Subscription
          </a>
          <LogoutButton />
        </div>
      </header>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="dash-content">
        {children}
      </main>
    </div>
  );
}
