-- =============================================================================
-- Digital Heroes — Charity Seed Data
-- Migration: 004_charity_seed.sql
-- Run AFTER 003_seed.sql
-- =============================================================================
--
-- Seeds 5 sample charities with realistic data for testing.
-- These can be managed (edited/deactivated) via the admin dashboard.
-- =============================================================================

INSERT INTO public.charities (name, slug, description, short_description, logo_url, banner_url, website_url, is_featured, is_active) VALUES
(
  'Golf for Good Foundation',
  'golf-for-good',
  'Golf for Good Foundation uses the power of golf to transform lives. We provide access to the sport for underprivileged youth, fund junior coaching programmes across the UK, and use golf as a vehicle for mental health support and community building. Every donation helps us bring the game to those who need it most.',
  'Bringing golf to underprivileged youth and communities across the UK.',
  NULL,
  NULL,
  'https://example.com/golf-for-good',
  TRUE,
  TRUE
),
(
  'Fairway Hearts Charity',
  'fairway-hearts',
  'Fairway Hearts partners with golf clubs nationwide to raise funds for cardiac research. Our annual charity golf days have raised over £2 million since 2018. We believe that staying active through sport is the best prevention, and we fund both research and community fitness programmes.',
  'Raising funds for cardiac research through the golfing community.',
  NULL,
  NULL,
  'https://example.com/fairway-hearts',
  TRUE,
  TRUE
),
(
  'Green Planet Initiative',
  'green-planet',
  'The Green Planet Initiative works with golf courses to implement sustainable practices, restore biodiversity, and reduce environmental impact. We plant trees, restore wetlands, and help courses become sanctuaries for local wildlife — all while keeping the fairways pristine.',
  'Sustainability and biodiversity on golf courses worldwide.',
  NULL,
  NULL,
  'https://example.com/green-planet',
  FALSE,
  TRUE
),
(
  'The Caddie Project',
  'the-caddie-project',
  'The Caddie Project provides mentoring and career development for young people through caddie programmes at top golf clubs. Our participants learn discipline, communication, and business skills while earning an income. Many go on to pursue careers in hospitality, finance, and sports management.',
  'Mentoring young people through caddie programmes at golf clubs.',
  NULL,
  NULL,
  'https://example.com/caddie-project',
  FALSE,
  TRUE
),
(
  'Swing for Veterans',
  'swing-for-veterans',
  'Swing for Veterans uses adaptive golf programmes to support the physical and mental rehabilitation of military veterans. Our weekly sessions at partner courses provide therapeutic benefit, social connection, and a renewed sense of purpose for those who have served.',
  'Adaptive golf for veteran rehabilitation and mental health.',
  NULL,
  NULL,
  'https://example.com/swing-for-veterans',
  FALSE,
  TRUE
)
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- Sample Charity Events
-- =============================================================================

INSERT INTO public.charity_events (charity_id, title, description, event_date, location, event_url, is_active)
SELECT
  c.id,
  'Annual Charity Golf Day 2026',
  'Join us for our flagship charity golf day. Teams of four, shotgun start, with prizes for longest drive, nearest the pin, and best team score. All proceeds go to the foundation.',
  '2026-08-15',
  'Royal Links Golf Club, London',
  'https://example.com/events/annual-golf-day',
  TRUE
FROM public.charities c
WHERE c.slug = 'golf-for-good'
ON CONFLICT DO NOTHING;

INSERT INTO public.charity_events (charity_id, title, description, event_date, location, event_url, is_active)
SELECT
  c.id,
  'Heart & Soul Tournament',
  'A two-day tournament raising awareness for cardiac health. Includes a gala dinner, silent auction, and pro-am round. Registration includes all meals and a goodie bag.',
  '2026-09-20',
  'St Andrews Links, Scotland',
  'https://example.com/events/heart-soul',
  TRUE
FROM public.charities c
WHERE c.slug = 'fairway-hearts'
ON CONFLICT DO NOTHING;

INSERT INTO public.charity_events (charity_id, title, description, event_date, location, event_url, is_active)
SELECT
  c.id,
  'Veterans Open Day',
  'An open day for veterans and their families. Free coaching, refreshments, and a chance to meet fellow veterans who have found a new passion through golf.',
  '2026-07-04',
  'Wentworth Club, Surrey',
  NULL,
  TRUE
FROM public.charities c
WHERE c.slug = 'swing-for-veterans'
ON CONFLICT DO NOTHING;
