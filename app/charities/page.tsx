import type { Metadata } from "next";

import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Charities | Digital Heroes",
  description:
    "Explore the charities supported by Digital Heroes. Choose a charity to receive a portion of your subscription.",
};

export default async function CharitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}): Promise<React.JSX.Element> {
  const { search } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("charities")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%,short_description.ilike.%${search}%`
    );
  }

  const { data: charities } = await query;

  return (
    <div className="charities-page">
      <header className="charities-hero">
        <h1 className="charities-hero__title">
          Our Supported{" "}
          <span className="charities-hero__accent">Charities</span>
        </h1>
        <p className="charities-hero__subtitle">
          Every subscription supports a cause you care about. Choose your
          charity and help make a real difference.
        </p>

        {/* Search bar */}
        <form className="charities-search" action="/charities" method="GET">
          <input
            type="text"
            name="search"
            placeholder="Search charities…"
            defaultValue={search ?? ""}
            className="charities-search__input"
          />
          <button type="submit" className="charities-search__btn">
            🔍 Search
          </button>
        </form>
      </header>

      {charities && charities.length > 0 ? (
        <section className="charities-grid" aria-label="Charity directory">
          {charities.map((charity) => (
            <Link
              key={charity.id}
              href={`/charities/${charity.slug}`}
              className="charity-card"
            >
              {charity.is_featured && (
                <div className="charity-card__badge">⭐ Featured</div>
              )}
              <div className="charity-card__logo-container">
                {charity.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={charity.logo_url}
                    alt={`${charity.name} logo`}
                    className="charity-card__logo"
                  />
                ) : (
                  <div className="charity-card__logo-placeholder">
                    {charity.name.charAt(0)}
                  </div>
                )}
              </div>
              <h2 className="charity-card__name">{charity.name}</h2>
              {charity.short_description && (
                <p className="charity-card__description">
                  {charity.short_description}
                </p>
              )}
              <span className="charity-card__link">Learn more →</span>
            </Link>
          ))}
        </section>
      ) : (
        <div className="charities-empty">
          <div className="charities-empty__icon">💚</div>
          <h2>No Charities Found</h2>
          {search ? (
            <p>
              No charities match &ldquo;{search}&rdquo;.{" "}
              <Link href="/charities">Clear search</Link>
            </p>
          ) : (
            <p>
              Charities will be added by the admin team. Check back soon!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
