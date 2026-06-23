import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: charity } = await supabase
    .from("charities")
    .select("name, short_description")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!charity) {
    return { title: "Charity Not Found | Digital Heroes" };
  }

  return {
    title: `${charity.name} | Digital Heroes`,
    description: charity.short_description ?? `Support ${charity.name} through Digital Heroes.`,
  };
}

export default async function CharityProfilePage({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch charity with events
  const { data: charity } = await supabase
    .from("charities")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!charity) {
    notFound();
  }

  // Fetch upcoming events
  const today = new Date().toISOString().split("T")[0];
  const { data: events } = await supabase
    .from("charity_events")
    .select("*")
    .eq("charity_id", charity.id)
    .eq("is_active", true)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(5);

  return (
    <div className="charity-profile">
      {/* Banner */}
      {charity.banner_url && (
        <div className="charity-profile__banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={charity.banner_url}
            alt={`${charity.name} banner`}
            className="charity-profile__banner-img"
          />
        </div>
      )}

      <div className="charity-profile__content">
        {/* Header */}
        <header className="charity-profile__header">
          <div className="charity-profile__logo-row">
            {charity.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={charity.logo_url}
                alt={`${charity.name} logo`}
                className="charity-profile__logo"
              />
            ) : (
              <div className="charity-profile__logo-placeholder">
                {charity.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="charity-profile__name">{charity.name}</h1>
              {charity.is_featured && (
                <span className="charity-profile__featured-badge">
                  ⭐ Featured Charity
                </span>
              )}
            </div>
          </div>

          {charity.website_url && (
            <a
              href={charity.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="charity-profile__website"
            >
              Visit Website ↗
            </a>
          )}
        </header>

        {/* Description */}
        {charity.description && (
          <section className="charity-profile__description">
            <h2>About</h2>
            <p>{charity.description}</p>
          </section>
        )}

        {/* Upcoming Events (PRD §08) */}
        {events && events.length > 0 && (
          <section className="charity-profile__events">
            <h2>Upcoming Events</h2>
            <div className="charity-events__grid">
              {events.map((event) => (
                <div key={event.id} className="charity-event-card">
                  <div className="charity-event-card__date">
                    {new Date(event.event_date + "T00:00:00Z").toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}
                  </div>
                  <h3 className="charity-event-card__title">{event.title}</h3>
                  {event.location && (
                    <p className="charity-event-card__location">
                      📍 {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="charity-event-card__description">
                      {event.description}
                    </p>
                  )}
                  {event.event_url && (
                    <a
                      href={event.event_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="charity-event-card__link"
                    >
                      More info →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="charity-profile__cta">
          <h2>Support {charity.name}</h2>
          <p>
            Subscribe to Digital Heroes and choose {charity.name} as your
            supported charity. At least 10% of your subscription goes directly
            to them.
          </p>
          <div className="charity-profile__cta-buttons">
            <Link href="/pricing" className="charity-profile__cta-btn">
              Subscribe & Support →
            </Link>
            <Link href="/charities" className="charity-profile__cta-btn-secondary">
              ← Back to Charities
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
