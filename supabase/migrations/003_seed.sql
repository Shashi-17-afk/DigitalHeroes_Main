-- =============================================================================
-- Digital Heroes — Seed Data
-- Migration: 003_seed.sql
-- Run AFTER 002_rls.sql
-- =============================================================================
--
-- Contents:
--   1. app_config  — configurable runtime values (PRD requirements + placeholders)
--
-- NOT included here (handled elsewhere):
--   • Admin user   — created via Supabase Auth API in Phase 3 seed script
--   • Charities    — populated via admin dashboard or separate charity seed script (Phase 6)
--
-- Unresolved values are seeded as 0 with explicit descriptions.
-- They MUST be updated before the first draw is run.
-- =============================================================================


-- =============================================================================
-- app_config: Initial configurable business rule values
-- =============================================================================
INSERT INTO public.app_config (key, value, description) VALUES

  -- -------------------------------------------------------------------------
  -- PRD-defined constants (values from PRD §07 and §08)
  -- -------------------------------------------------------------------------
  (
    'jackpot_pool_percent',
    '40',
    'PRD §07: Percentage of prize pool allocated to 5-match jackpot tier. DO NOT change without updating draw engine.'
  ),
  (
    'four_match_pool_percent',
    '35',
    'PRD §07: Percentage of prize pool allocated to 4-match tier. DO NOT change without updating draw engine.'
  ),
  (
    'three_match_pool_percent',
    '25',
    'PRD §07: Percentage of prize pool allocated to 3-match tier. DO NOT change without updating draw engine.'
  ),
  (
    'charity_min_percentage',
    '10.00',
    'PRD §08: Minimum percentage of subscription fee that goes to charity. Users cannot set below this value.'
  ),

  -- -------------------------------------------------------------------------
  -- Unresolved items — MUST be set before launch (Phase 4)
  -- -------------------------------------------------------------------------
  (
    'prize_pool_contribution_percent',
    '50',
    'Resolved Phase 3: 50% of subscription revenue goes to prize pool. Adjustable at runtime.'
  ),
  (
    'subscription_currency',
    'gbp',
    'ISO 4217 lowercase currency code for subscriptions. Razorpay supports GBP, INR, USD etc. Update before launch.'
  ),

  -- -------------------------------------------------------------------------
  -- Draw configuration
  -- -------------------------------------------------------------------------
  (
    'draw_number_pool_min',
    '1',
    'Minimum value in the draw number pool. Matches Stableford score range minimum (PRD §05). Confirm before Phase 7.'
  ),
  (
    'draw_number_pool_max',
    '45',
    'Maximum value in the draw number pool. Matches Stableford score range maximum (PRD §05). Confirm before Phase 7.'
  )

ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- Storage Bucket Configuration (reference — applied via Supabase Dashboard)
-- =============================================================================
-- The following storage buckets must be created in Supabase Storage:
--
--   Bucket: winner-proofs
--   Purpose: Winner verification screenshot uploads (PRD §09)
--   Access: Private (signed URLs only — users access own files, admin all)
--   Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--   Max file size: 10MB
--
--   Bucket: charity-assets
--   Purpose: Charity logos, banners (admin-uploaded — PRD §08)
--   Access: Public read, admin write
--   Allowed MIME types: image/jpeg, image/png, image/webp, image/svg+xml
--   Max file size: 5MB
--
-- Apply these via Supabase Dashboard → Storage → Create Bucket,
-- or via Supabase CLI in a later migration.
-- =============================================================================
