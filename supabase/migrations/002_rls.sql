-- =============================================================================
-- Digital Heroes — Row Level Security Policies
-- Migration: 002_rls.sql  (Supabase-compatible version)
-- Run AFTER 001_schema.sql
-- =============================================================================
--
-- Security model:
--   • Users can only read/write their own rows
--   • Admins can read/write everything
--   • Service role (Razorpay webhook, draw engine) bypasses RLS entirely
--   • Public (unauthenticated) can only read active charities + charity events
--
-- CHANGE vs original:
--   auth.is_admin() → public.is_admin()
--
--   Reason: Supabase restricts CREATE FUNCTION in the auth schema
--   (auth is owned by supabase_admin, not the postgres role).
--   The function is identical — just lives in public instead of auth.
--   All auth.uid() / auth.role() calls are KEPT — those are Supabase
--   built-ins that ARE callable from public schema.
-- =============================================================================


-- =============================================================================
-- HELPER FUNCTION: public.is_admin()
-- Returns TRUE if the currently authenticated user has role = 'admin'.
-- SECURITY DEFINER: runs as function owner to bypass profiles RLS.
-- STABLE: result is cached within a single transaction (performance).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns TRUE if the current user has admin role. SECURITY DEFINER bypasses profiles RLS.';


-- =============================================================================
-- ENABLE RLS
-- Must be enabled on every table before policies take effect.
-- =============================================================================
ALTER TABLE public.app_config            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_results          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_verifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_pool_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE: app_config
-- All authenticated users can read (needed for UI display).
-- Only admins can write (values affect business logic).
-- =============================================================================
CREATE POLICY "app_config_select_authenticated"
  ON public.app_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "app_config_all_admin"
  ON public.app_config FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: profiles
-- =============================================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read ALL profiles (for user management — PRD §11)
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Users can update their own profile
-- Security: cannot self-promote by changing their own role column
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Role must remain unchanged — prevents self-promotion to admin
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update any profile (including role assignment — PRD §11)
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- INSERT handled exclusively by handle_new_user() trigger (SECURITY DEFINER)
-- No direct user INSERT policy needed.


-- =============================================================================
-- TABLE: subscriptions
-- Users: read own. Admins: full access.
-- Writes: via Razorpay webhook handler using service role key (bypasses RLS).
-- =============================================================================

CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_all_admin"
  ON public.subscriptions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: charities
-- Public: read active charities (no auth required — PRD §03 Public Visitor).
-- Admins: full CRUD (PRD §11 Charity Management).
-- =============================================================================

-- Public (including unauthenticated) can read active charities
CREATE POLICY "charities_select_public"
  ON public.charities FOR SELECT
  USING (is_active = TRUE);

-- Admins can read ALL charities (including inactive)
CREATE POLICY "charities_select_admin"
  ON public.charities FOR SELECT
  USING (public.is_admin());

CREATE POLICY "charities_insert_admin"
  ON public.charities FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "charities_update_admin"
  ON public.charities FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "charities_delete_admin"
  ON public.charities FOR DELETE
  USING (public.is_admin());


-- =============================================================================
-- TABLE: charity_events
-- PRD §08: Public read of active events on charity profiles.
-- =============================================================================

-- Public can read active events
CREATE POLICY "charity_events_select_public"
  ON public.charity_events FOR SELECT
  USING (is_active = TRUE);

-- Admins can manage all events
CREATE POLICY "charity_events_all_admin"
  ON public.charity_events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: charity_contributions
-- Users: read own, insert own independent donations.
-- Subscription contributions inserted by webhook via service role.
-- =============================================================================

CREATE POLICY "contributions_select_own"
  ON public.charity_contributions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only submit independent donations for themselves
-- Subscription contributions are inserted by webhook (service role — bypasses RLS)
CREATE POLICY "contributions_insert_own_independent"
  ON public.charity_contributions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND contribution_type = 'independent'
  );

CREATE POLICY "contributions_all_admin"
  ON public.charity_contributions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: scores
-- PRD §05: Full CRUD for own scores. Admins can manage all (PRD §11).
-- =============================================================================

CREATE POLICY "scores_select_own"
  ON public.scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "scores_insert_own"
  ON public.scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scores_update_own"
  ON public.scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scores_delete_own"
  ON public.scores FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can edit scores (PRD §11: "Edit golf scores")
CREATE POLICY "scores_all_admin"
  ON public.scores FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: draws
-- Published draws: readable by all authenticated users.
-- Pending/simulated draws: admin only.
-- Writes: admin only (PRD §11 Draw Management).
-- =============================================================================

-- Authenticated users can only read PUBLISHED draws
CREATE POLICY "draws_select_published"
  ON public.draws FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND status = 'published'
  );

-- Admins can read ALL draws regardless of status (simulation mode)
CREATE POLICY "draws_select_admin"
  ON public.draws FOR SELECT
  USING (public.is_admin());

-- Only admins can create/modify/delete draws
CREATE POLICY "draws_all_admin"
  ON public.draws FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: draw_results
-- Users: read own results. Admins: full access.
-- Results inserted by draw engine via service role.
-- =============================================================================

CREATE POLICY "draw_results_select_own"
  ON public.draw_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "draw_results_all_admin"
  ON public.draw_results FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: winners
-- Users: read own winner records. Admins: full access (PRD §11).
-- Inserted by draw engine via service role.
-- =============================================================================

CREATE POLICY "winners_select_own"
  ON public.winners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "winners_all_admin"
  ON public.winners FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: winner_verifications
-- PRD §09: Winners upload proof. Admins approve/reject.
-- =============================================================================

-- Winners can read their own verification status
CREATE POLICY "verifications_select_own"
  ON public.winner_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Winners can submit their own proof screenshot
CREATE POLICY "verifications_insert_own"
  ON public.winner_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can review all verifications and update status
CREATE POLICY "verifications_all_admin"
  ON public.winner_verifications FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: prize_pool_history
-- All authenticated users can view historical prize pool data.
-- Writes: service role only (draw engine inserts on publish).
-- =============================================================================

CREATE POLICY "prize_pool_select_authenticated"
  ON public.prize_pool_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "prize_pool_all_admin"
  ON public.prize_pool_history FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- TABLE: notifications
-- Users read their own + broadcast notifications (NULL user_id).
-- Users can mark their own notifications as read (not unread — one-way).
-- =============================================================================

-- Users read: their own notifications + broadcast (NULL user_id)
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (
    user_id IS NULL         -- broadcast notification
    OR auth.uid() = user_id -- personal notification
  );

-- Users can only mark notifications as READ — not revert to unread
CREATE POLICY "notifications_update_mark_read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_read = TRUE  -- can only set TRUE, not revert to FALSE
  );

-- Admins can manage all notifications (create, broadcast, delete)
CREATE POLICY "notifications_all_admin"
  ON public.notifications FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
