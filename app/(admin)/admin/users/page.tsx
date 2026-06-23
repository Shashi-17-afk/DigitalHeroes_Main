import type { Metadata } from "next";

import { AdminUserManager } from "@/components/admin/admin-user-manager";

export const metadata: Metadata = {
  title: "Users | Admin | Digital Heroes",
  description: "View all registered users, subscription status, and activity.",
};

export default function AdminUsersPage(): React.JSX.Element {
  return (
    <div className="scores-page">
      <header className="scores-page__header">
        <div>
          <h1 className="scores-page__title">👥 Users</h1>
          <p className="scores-page__subtitle">
            All registered accounts with subscription and activity data.
          </p>
        </div>
      </header>
      <AdminUserManager />
    </div>
  );
}
