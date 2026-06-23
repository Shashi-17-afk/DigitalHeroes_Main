import type { Metadata } from "next";

import Link from "next/link";

import { AdminDrawManager } from "@/components/admin/admin-draw-manager";

export const metadata: Metadata = {
  title: "Manage Draws | Admin | Digital Heroes",
  description: "Create, run, and publish monthly draws. Review winner verifications.",
};

export default function AdminDrawsPage(): React.JSX.Element {
  return (
    <div className="scores-page">
      <header className="scores-page__header">
        <div>
          <h1 className="scores-page__title">🎰 Manage Draws</h1>
          <p className="scores-page__subtitle">
            Create monthly draws, run the draw engine, publish results, and
            review winner verifications.
          </p>
        </div>
        <Link href="/admin" className="scores-page__back">
          ← Admin Panel
        </Link>
      </header>

      <AdminDrawManager />
    </div>
  );
}
