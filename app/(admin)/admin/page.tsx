import type { Metadata } from "next";

import { AdminOverview } from "@/components/admin/admin-overview";

export const metadata: Metadata = {
  title: "Admin Overview | Digital Heroes",
  description: "Admin dashboard — platform metrics and quick actions.",
};

export default function AdminPage(): React.JSX.Element {
  return (
    <div className="scores-page">
      <header className="scores-page__header">
        <div>
          <h1 className="scores-page__title">📊 Admin Overview</h1>
          <p className="scores-page__subtitle">
            Platform health metrics and quick access to all admin functions.
          </p>
        </div>
      </header>
      <AdminOverview />
    </div>
  );
}
