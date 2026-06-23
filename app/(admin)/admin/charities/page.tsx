import type { Metadata } from "next";

import Link from "next/link";

import { AdminCharityManager } from "@/components/admin/admin-charity-manager";

export const metadata: Metadata = {
  title: "Manage Charities | Admin | Digital Heroes",
  description: "Add, edit, and manage charities in the Digital Heroes platform.",
};

export default function AdminCharitiesPage(): React.JSX.Element {
  return (
    <div className="scores-page">
      <header className="scores-page__header">
        <div>
          <h1 className="scores-page__title">🏢 Manage Charities</h1>
          <p className="scores-page__subtitle">
            Add, edit, feature, and deactivate charities. Changes are reflected
            immediately on the public directory.
          </p>
        </div>
        <Link href="/admin" className="scores-page__back">
          ← Admin Panel
        </Link>
      </header>

      <AdminCharityManager />
    </div>
  );
}
