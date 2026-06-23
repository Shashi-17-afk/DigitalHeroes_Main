import type { Metadata } from "next";

import Link from "next/link";

import { CharitySelector } from "@/components/charity/charity-selector";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Charity | Digital Heroes",
  description:
    "Choose your supported charity and manage your contribution percentage.",
};

export default async function CharityPage(): Promise<React.JSX.Element> {
  const user = await getServerUser();

  let charityId: string | null = null;
  let charityPercentage = 10;

  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("selected_charity_id, charity_percentage")
      .eq("id", user.id)
      .single();

    if (profile) {
      charityId = profile.selected_charity_id;
      charityPercentage = profile.charity_percentage;
    }
  }

  return (
    <div className="scores-page">
      <header className="scores-page__header">
        <div>
          <h1 className="scores-page__title">💚 My Charity</h1>
          <p className="scores-page__subtitle">
            Select a charity to support and set your contribution percentage.
            At least 10% of your subscription goes to your chosen cause.
          </p>
        </div>
        <Link href="/dashboard" className="scores-page__back">
          ← Dashboard
        </Link>
      </header>

      <div className="scores-page__info">
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">💚</span>
          <span>Minimum 10% contribution</span>
        </div>
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">📈</span>
          <span>Increase your % anytime</span>
        </div>
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">🔄</span>
          <span>Change charity anytime</span>
        </div>
        <div className="scores-page__info-item">
          <span className="scores-page__info-icon">🏆</span>
          <span>Track your impact</span>
        </div>
      </div>

      <CharitySelector
        currentCharityId={charityId}
        currentPercentage={charityPercentage}
      />
    </div>
  );
}
