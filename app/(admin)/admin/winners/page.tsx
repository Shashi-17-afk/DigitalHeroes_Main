import type { Metadata } from "next";

import { AdminWinnersManager } from "@/components/admin/admin-winners-manager";

export const metadata: Metadata = {
  title: "Winners | Admin | Digital Heroes",
  description: "Manage prize verifications, approve or reject winner submissions, and track payments.",
};

export default function AdminWinnersPage(): React.JSX.Element {
  return (
    <div className="scores-page">
      <header className="scores-page__header">
        <div>
          <h1 className="scores-page__title">🏆 Winners</h1>
          <p className="scores-page__subtitle">
            Review prize verification submissions, approve or reject claims, and
            track payment status across all draws.
          </p>
        </div>
      </header>
      <AdminWinnersManager />
    </div>
  );
}
