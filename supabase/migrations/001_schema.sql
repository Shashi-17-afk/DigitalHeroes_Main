-- =============================================================================
-- Digital Heroes — Database Schema
-- Migration: 001_schema.sql
-- =============================================================================
--
-- PRD Requirements implemented:
--   • profiles / subscriptions     → Section 04 (Subscription & Payment)
--   • scores                       → Section 05 (Score Management)
--   • draws / draw_results         → Section 06 (Draw & Reward)
--   • winners / winner_verifications → Section 09 (Winner Verification)
--   • charities / charity_events   → Section 08 (Charity System)
--   • charity_contributions        → Section 08 (Contribution Model)
--   • prize_pool_history           → Section 07 (Prize Pool Logic)
--   • notifications                → Section 13 (Email Notifications)
--
-- Architectural decisions (NOT PRD requirements):
--   • app_config table             → Configurable runtime values, avoids hardcoding
--   • Monetary values in pence     → Smallest currency unit avoids float precision issues
--   • draw_results.entry_data JSONB → Flexible pending draw-entry mechanics decision
--   • handle_new_user() trigger    → Supabase Auth integration pattern
--   • updated_at triggers          → Standard housekeeping
--
-- Unresolved items (schema kept flexible):
--   • Prize pool contribution %     → stored in app_config, set to 50%
--   • Draw-entry mechanics          → draw_results.entry_data is JSONB, format TBD
--   • Subscription pricing          → managed in Razorpay + env vars, not in DB
-- =============================================================================


-- =============================================================================
-- EXTENSION
-- Note: pgcrypto is enabled by default on Supabase — included for completeness
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- FUNCTIONS
-- Must be created BEFORE triggers that reference them.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- update_updated_at()
-- Generic trigger function — sets updated_at = NOW() before every UPDATE.
-- Architectural decision: standardised housekeeping across all mutable tables.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------------------
-- handle_new_user()
-- Fires AFTER INSERT on auth.users.
-- Automatically creates a profiles row for every new Supabase Auth user.
-- SECURITY DEFINER: runs with function owner's privileges to bypass RLS on insert.
-- Architectural decision: Supabase Auth integration pattern.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- enforce_max_scores()
-- Fires AFTER INSERT on scores.
-- PRD requirement: "Only the latest 5 scores are retained at any time.
-- A new score replaces the oldest stored score automatically."
-- Deletes the single oldest score (by score_date ASC, then created_at ASC as
-- tiebreaker) when a user's total exceeds 5.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_max_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_score_count INT;
  v_oldest_id   UUID;
BEGIN
  SELECT COUNT(*)
  INTO v_score_count
  FROM public.scores
  WHERE user_id = NEW.user_id;

  IF v_score_count > 5 THEN
    SELECT id
    INTO v_oldest_id
    FROM public.scores
    WHERE user_id = NEW.user_id
    ORDER BY score_date ASC, created_at ASC
    LIMIT 1;

    DELETE FROM public.scores WHERE id = v_oldest_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TABLE: app_config
-- Architectural decision: key-value store for configurable runtime values.
-- Avoids hardcoding business rules in source code.
-- Admin can update values via the admin dashboard without a redeployment.
-- =============================================================================
CREATE TABLE public.app_config (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.app_config IS
  'Architectural choice: runtime-configurable business rules. Not a PRD requirement.';


-- =============================================================================
-- TABLE: profiles
-- PRD §03, §04, §10: Extends auth.users — one row per authenticated user.
-- Role column supports admin access control (§11 Admin Dashboard).
-- =============================================================================
CREATE TABLE public.profiles (
  id                   UUID           PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT           NOT NULL,
  full_name            TEXT,
  avatar_url           TEXT,
  role                 TEXT           NOT NULL DEFAULT 'subscriber'
                         CONSTRAINT profiles_role_check
                         CHECK (role IN ('subscriber', 'admin')),
  -- FK to charities added after charities table is created (below)
  selected_charity_id  UUID,
  -- PRD §08: Minimum 10%; user may increase voluntarily
  charity_percentage   NUMERIC(5, 2)  NOT NULL DEFAULT 10.00
                         CONSTRAINT profiles_charity_pct_check
                         CHECK (charity_percentage >= 10.00 AND charity_percentage <= 100.00),
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.profiles.role IS
  'subscriber | admin. Architectural decision: admin assigned via seed script.';
COMMENT ON COLUMN public.profiles.selected_charity_id IS
  'PRD §08: Users select a charity at signup.';
COMMENT ON COLUMN public.profiles.charity_percentage IS
  'PRD §08: Min 10%, max 100%, user-configurable.';


-- =============================================================================
-- TABLE: subscriptions
-- PRD §04: Monthly plan, yearly plan, lifecycle management.
-- All writes are performed by the Razorpay webhook handler via service role key.
-- Architectural choice: Razorpay replaces Stripe (Indian payment provider).
-- =============================================================================
CREATE TABLE public.subscriptions (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  razorpay_customer_id       TEXT        UNIQUE,
  razorpay_subscription_id   TEXT        UNIQUE,
  -- PRD §04: Monthly and yearly plans
  plan_type                  TEXT        NOT NULL
                               CONSTRAINT subscriptions_plan_check
                               CHECK (plan_type IN ('monthly', 'yearly')),
  -- PRD §04: Handles renewal, cancellation, and lapsed-subscription states
  status                     TEXT        NOT NULL
                               CONSTRAINT subscriptions_status_check
                               CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing')),
  current_period_start       TIMESTAMPTZ,
  current_period_end         TIMESTAMPTZ,
  cancel_at_period_end       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscriptions IS
  'PRD §04. All writes via Razorpay webhook (service role). Users read-only via RLS.';


-- =============================================================================
-- TABLE: charities
-- PRD §08: Charity directory. Admin-managed. Active/inactive soft-delete.
-- =============================================================================
CREATE TABLE public.charities (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  -- URL-safe identifier for routing: /charities/[slug]
  slug              TEXT        NOT NULL UNIQUE,
  description       TEXT,
  short_description TEXT,
  logo_url          TEXT,
  banner_url        TEXT,
  website_url       TEXT,
  -- PRD §08: Featured/spotlight charity section on homepage
  is_featured       BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Soft delete: admin deactivates rather than hard-deletes
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.charities.is_featured IS
  'PRD §08: Featured/spotlight charity section on homepage.';
COMMENT ON COLUMN public.charities.is_active IS
  'Architectural decision: soft-delete preserves historical contribution records.';


-- =============================================================================
-- TABLE: charity_events
-- PRD §08: "Individual charity profiles: description, images, upcoming events
-- (e.g. golf days)"
-- =============================================================================
CREATE TABLE public.charity_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id  UUID        NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  event_date  DATE        NOT NULL,
  location    TEXT,
  image_url   TEXT,
  event_url   TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.charity_events IS
  'PRD §08: Upcoming events (e.g. golf days) on charity profile pages.';


-- Now that charities exists, add the deferred FK from profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_selected_charity_fkey
  FOREIGN KEY (selected_charity_id)
  REFERENCES public.charities(id)
  ON DELETE SET NULL;


-- =============================================================================
-- TABLE: charity_contributions
-- PRD §08: Tracks every contribution — subscription-based and independent.
-- Monetary amounts stored in smallest currency unit (pence/cents).
-- Architectural decision: avoids floating-point precision errors.
-- =============================================================================
CREATE TABLE public.charity_contributions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  charity_id               UUID        NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
  subscription_id          UUID        REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  -- Architectural decision: smallest currency unit (pence/cents)
  amount_pence             INT         NOT NULL CONSTRAINT contributions_amount_positive CHECK (amount_pence > 0),
  percentage               NUMERIC(5, 2) NOT NULL
                             CONSTRAINT contributions_pct_check
                             CHECK (percentage >= 10.00 AND percentage <= 100.00),
  -- PRD §08: subscription contributions + independent donation option
  contribution_type        TEXT        NOT NULL
                             CONSTRAINT contributions_type_check
                             CHECK (contribution_type IN ('subscription', 'independent')),
  -- Architectural decision: currency stored per-record for future multi-currency support (§14)
  currency                 TEXT        NOT NULL DEFAULT 'gbp',
  -- Period fields: NULL for independent donations
  period_month             INT         CONSTRAINT contributions_month_check CHECK (period_month BETWEEN 1 AND 12),
  period_year              INT         CONSTRAINT contributions_year_check CHECK (period_year >= 2024),
  -- For independent donations processed via Razorpay
  razorpay_payment_id  TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.charity_contributions.amount_pence IS
  'Architectural decision: stored in smallest currency unit to avoid float errors.';
COMMENT ON COLUMN public.charity_contributions.contribution_type IS
  'PRD §08: subscription = automatic % of sub fee. independent = user-initiated donation.';


-- =============================================================================
-- TABLE: scores
-- PRD §05: Stableford format, range 1-45, date required, no duplicate dates.
-- Max 5 retained — enforced by enforce_max_scores() trigger.
-- =============================================================================
CREATE TABLE public.scores (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- PRD §05: Score range 1-45 (Stableford format)
  score_value INT     NOT NULL
                CONSTRAINT scores_value_range CHECK (score_value BETWEEN 1 AND 45),
  -- PRD §05: Each score must include a date
  score_date  DATE    NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- PRD §10: "Only one score entry is permitted per date."
  CONSTRAINT scores_user_date_unique UNIQUE (user_id, score_date)
);

COMMENT ON TABLE public.scores IS
  'PRD §05. Max 5 per user enforced by enforce_max_scores() AFTER INSERT trigger.';
COMMENT ON CONSTRAINT scores_user_date_unique ON public.scores IS
  'PRD §10: Duplicate scores for the same date are not allowed.';


-- =============================================================================
-- TABLE: draws
-- PRD §06: Monthly cadence, admin-controlled, random or algorithmic mode.
-- PRD §07: Prize pool breakdown stored per draw.
-- =============================================================================
CREATE TABLE public.draws (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_month                 INT         NOT NULL CONSTRAINT draws_month_check CHECK (draw_month BETWEEN 1 AND 12),
  draw_year                  INT         NOT NULL CONSTRAINT draws_year_check CHECK (draw_year >= 2024),
  -- PRD §06: Random generation or algorithmic (weighted by score frequency)
  draw_mode                  TEXT        NOT NULL
                               CONSTRAINT draws_mode_check
                               CHECK (draw_mode IN ('random', 'algorithmic')),
  -- PRD §06: Simulation/pre-analysis mode before official publish
  status                     TEXT        NOT NULL DEFAULT 'pending'
                               CONSTRAINT draws_status_check
                               CHECK (status IN ('pending', 'simulated', 'published')),
  -- The 5 drawn numbers.
  -- Architectural decision: JSONB + INT[] both preserved for flexibility.
  -- Exact format TBD pending draw-entry mechanics decision (Phase 7).
  drawn_numbers              INT[],
  -- PRD §07: Prize pool breakdown at time of draw (pence/cents)
  total_prize_pool_pence     INT         NOT NULL DEFAULT 0,
  pool_5_match_pence         INT         NOT NULL DEFAULT 0,  -- PRD §07: 40% of total
  pool_4_match_pence         INT         NOT NULL DEFAULT 0,  -- PRD §07: 35% of total
  pool_3_match_pence         INT         NOT NULL DEFAULT 0,  -- PRD §07: 25% of total
  -- PRD §06: "Jackpot rollover to next month if no 5-match winner"
  jackpot_carried_in_pence   INT         NOT NULL DEFAULT 0,  -- Amount rolled in from previous month
  jackpot_rolled_over        BOOLEAN     NOT NULL DEFAULT FALSE, -- TRUE = no 5-match winner, pool rolls to next month
  -- Metadata
  active_subscriber_count    INT,
  published_at               TIMESTAMPTZ,
  created_by                 UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- PRD §06: One draw per calendar month
  CONSTRAINT draws_month_year_unique UNIQUE (draw_month, draw_year)
);

COMMENT ON COLUMN public.draws.drawn_numbers IS
  'The 5 drawn numbers. Format TBD — draw-entry mechanics unresolved (Phase 7).';
COMMENT ON COLUMN public.draws.jackpot_rolled_over IS
  'PRD §06: TRUE when no 5-match winner — jackpot carries to next month.';


-- =============================================================================
-- TABLE: draw_results
-- PRD §06: Per-user match result for each draw.
-- entry_data JSONB: Architectural decision — flexible pending draw-entry mechanics.
-- =============================================================================
CREATE TABLE public.draw_results (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id         UUID    NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id         UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Architectural decision: JSONB stores entry data in whatever format
  -- draw-entry mechanics require (Phase 7 will determine this).
  -- Could be: user's scores, a separate entry number set, etc.
  entry_data      JSONB,
  -- Computed match results
  matched_numbers INT[],
  match_count     INT     NOT NULL DEFAULT 0
                    CONSTRAINT draw_results_match_count_check CHECK (match_count BETWEEN 0 AND 5),
  is_winner       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT draw_results_draw_user_unique UNIQUE (draw_id, user_id)
);

COMMENT ON COLUMN public.draw_results.entry_data IS
  'Architectural decision: JSONB keeps entry format flexible until draw-entry mechanics are finalised.';


-- =============================================================================
-- TABLE: winners
-- PRD §07: One row per winner per match tier per draw.
-- Prizes split equally among multiple winners in the same tier.
-- =============================================================================
CREATE TABLE public.winners (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id             UUID        NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- PRD §06: 5-Number Match, 4-Number Match, 3-Number Match
  match_type          TEXT        NOT NULL
                        CONSTRAINT winners_match_type_check
                        CHECK (match_type IN ('5_match', '4_match', '3_match')),
  -- Architectural decision: pence to avoid float precision
  prize_amount_pence  INT         NOT NULL CONSTRAINT winners_prize_positive CHECK (prize_amount_pence > 0),
  -- PRD §09: Pending → Paid workflow
  payment_status      TEXT        NOT NULL DEFAULT 'pending'
                        CONSTRAINT winners_payment_status_check
                        CHECK (payment_status IN ('pending', 'paid', 'rejected')),
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One winner record per user per match tier per draw
  CONSTRAINT winners_draw_user_match_unique UNIQUE (draw_id, user_id, match_type)
);

COMMENT ON TABLE public.winners IS
  'PRD §07 + §09. Inserted by draw engine (service role). Users read-only.';


-- =============================================================================
-- TABLE: winner_verifications
-- PRD §09: Screenshot upload → Admin Approve/Reject → Pending → Paid workflow.
-- =============================================================================
CREATE TABLE public.winner_verifications (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id            UUID        NOT NULL REFERENCES public.winners(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- PRD §09: "Screenshot of scores from the golf platform"
  screenshot_url       TEXT        NOT NULL,
  admin_notes          TEXT,
  -- PRD §09: Admin review — Approve or Reject
  verification_status  TEXT        NOT NULL DEFAULT 'pending'
                         CONSTRAINT verifications_status_check
                         CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  reviewed_by          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.winner_verifications IS
  'PRD §09: Screenshot upload and admin review workflow.';


-- =============================================================================
-- TABLE: prize_pool_history
-- PRD §07: Immutable audit snapshot of prize pool calculations.
-- One record per draw period. Never updated after creation.
-- =============================================================================
CREATE TABLE public.prize_pool_history (
  id                            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id                       UUID        REFERENCES public.draws(id) ON DELETE SET NULL,
  period_month                  INT         NOT NULL CONSTRAINT pph_month_check CHECK (period_month BETWEEN 1 AND 12),
  period_year                   INT         NOT NULL CONSTRAINT pph_year_check CHECK (period_year >= 2024),
  total_active_subscriptions    INT         NOT NULL DEFAULT 0,
  subscription_revenue_pence    INT         NOT NULL DEFAULT 0,
  -- Architectural decision: snapshot the % at calculation time for audit trail
  pool_contribution_percent     NUMERIC(5, 2) NOT NULL,
  pool_contribution_pence       INT         NOT NULL DEFAULT 0,
  jackpot_rollover_in_pence     INT         NOT NULL DEFAULT 0,
  -- PRD §07: Final split
  final_pool_5_match_pence      INT         NOT NULL DEFAULT 0,  -- 40%
  final_pool_4_match_pence      INT         NOT NULL DEFAULT 0,  -- 35%
  final_pool_3_match_pence      INT         NOT NULL DEFAULT 0,  -- 25%
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pph_month_year_unique UNIQUE (period_month, period_year)
);

COMMENT ON TABLE public.prize_pool_history IS
  'PRD §07: Immutable audit record. Never updated after insert.';


-- =============================================================================
-- TABLE: notifications
-- PRD §13: System updates, draw results, winner alerts.
-- NULL user_id = broadcast to all authenticated users.
-- =============================================================================
CREATE TABLE public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = broadcast to all users
  user_id    UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- PRD §13: draw results, winner alerts, system updates
  type       TEXT        NOT NULL
               CONSTRAINT notifications_type_check
               CHECK (type IN ('draw_result', 'winner_alert', 'payment_reminder', 'system')),
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.notifications.user_id IS
  'NULL = broadcast notification visible to all authenticated users.';


-- =============================================================================
-- TRIGGERS
-- Applied after all tables exist.
-- =============================================================================

-- profiles: auto-update updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- subscriptions: auto-update updated_at
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- charities: auto-update updated_at
CREATE TRIGGER trg_charities_updated_at
  BEFORE UPDATE ON public.charities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- charity_events: auto-update updated_at
CREATE TRIGGER trg_charity_events_updated_at
  BEFORE UPDATE ON public.charity_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- scores: auto-update updated_at
CREATE TRIGGER trg_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- scores: PRD §05 — enforce max 5 scores per user (fires AFTER INSERT)
CREATE TRIGGER trg_enforce_score_limit
  AFTER INSERT ON public.scores
  FOR EACH ROW EXECUTE FUNCTION enforce_max_scores();

-- auth.users → public.profiles: auto-create profile on new user signup
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- INDEXES
-- Chosen to support the most common query patterns across all phases.
-- =============================================================================

-- profiles
CREATE INDEX idx_profiles_role             ON public.profiles(role);
CREATE INDEX idx_profiles_charity          ON public.profiles(selected_charity_id);

-- subscriptions
CREATE INDEX idx_subs_user_id             ON public.subscriptions(user_id);
CREATE INDEX idx_subs_status              ON public.subscriptions(status);
CREATE INDEX idx_subs_razorpay_customer  ON public.subscriptions(razorpay_customer_id);
CREATE INDEX idx_subs_period_end         ON public.subscriptions(current_period_end);

-- charities
CREATE INDEX idx_charities_active_featured ON public.charities(is_active, is_featured);

-- charity_events
CREATE INDEX idx_charity_events_charity    ON public.charity_events(charity_id, event_date);
CREATE INDEX idx_charity_events_upcoming   ON public.charity_events(event_date) WHERE is_active = TRUE;

-- charity_contributions
CREATE INDEX idx_contributions_user        ON public.charity_contributions(user_id);
CREATE INDEX idx_contributions_charity     ON public.charity_contributions(charity_id);
CREATE INDEX idx_contributions_period      ON public.charity_contributions(period_year, period_month);
CREATE INDEX idx_contributions_type        ON public.charity_contributions(contribution_type);

-- scores — primary access pattern: latest 5 for a user
CREATE INDEX idx_scores_user_date          ON public.scores(user_id, score_date DESC);

-- draws
CREATE INDEX idx_draws_status              ON public.draws(status);
CREATE INDEX idx_draws_period              ON public.draws(draw_year DESC, draw_month DESC);

-- draw_results
CREATE INDEX idx_draw_results_draw         ON public.draw_results(draw_id);
CREATE INDEX idx_draw_results_user         ON public.draw_results(user_id);
-- Partial index: only winners — used by winner lookup queries
CREATE INDEX idx_draw_results_winners      ON public.draw_results(draw_id, user_id) WHERE is_winner = TRUE;

-- winners
CREATE INDEX idx_winners_draw              ON public.winners(draw_id);
CREATE INDEX idx_winners_user              ON public.winners(user_id);
CREATE INDEX idx_winners_payment           ON public.winners(payment_status);

-- winner_verifications
CREATE INDEX idx_verifications_winner      ON public.winner_verifications(winner_id);
CREATE INDEX idx_verifications_status      ON public.winner_verifications(verification_status);

-- notifications
CREATE INDEX idx_notifications_user        ON public.notifications(user_id);
-- Partial index: only unread — primary access pattern for notification badge
CREATE INDEX idx_notifications_unread      ON public.notifications(user_id) WHERE is_read = FALSE;
