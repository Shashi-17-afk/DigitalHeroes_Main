import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin Layout — Auth + Role Guard + Admin Sidebar Navigation
 *
 * Two-step server-side check:
 *   1. Is the user authenticated?
 *   2. Is the user an admin?
 *
 * Wraps all admin pages with a persistent sidebar nav.
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const navLinks = [
    { href: "/admin", label: "Overview", icon: "📊" },
    { href: "/admin/draws", label: "Draws", icon: "🎰" },
    { href: "/admin/charities", label: "Charities", icon: "💚" },
    { href: "/admin/users", label: "Users", icon: "👥" },
    { href: "/admin/winners", label: "Winners", icon: "🏆" },
  ];

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__logo">⚙️</span>
          <span className="admin-sidebar__brand-name">Admin Panel</span>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Admin navigation">
          {navLinks.map(({ href, label, icon }) => (
            <a key={href} href={href} className="admin-sidebar__link">
              <span className="admin-sidebar__link-icon">{icon}</span>
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <span className="admin-sidebar__user-role">ADMIN</span>
            <span className="admin-sidebar__user-email">{profile.email}</span>
          </div>
          <LogoutButton />
          <a href="/dashboard" className="admin-sidebar__back">
            ← User Dashboard
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">{children}</main>
    </div>
  );
}
