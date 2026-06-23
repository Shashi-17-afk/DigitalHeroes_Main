/**
 * Supabase Database Types
 *
 * This is a PARTIAL hand-written definition that matches the Phase 2 schema.
 * It will be REPLACED with auto-generated types once Supabase credentials
 * are available:
 *
 *   npx supabase gen types typescript --project-id <your-project-id> \
 *     > types/database.types.ts
 *
 * Structure notes:
 *   - Each table requires Row, Insert, Update, Relationships fields to satisfy
 *     Supabase's GenericTable constraint
 *   - The schema requires CompositeTypes to satisfy GenericSchema
 *   - Values in Records that have no members use Record<string, never>
 */

export type UserRole = "subscriber" | "admin";
export type SubscriptionStatus = "active" | "inactive" | "cancelled" | "past_due" | "trialing";
export type SubscriptionPlan = "monthly" | "yearly";
export type ContributionType = "subscription" | "independent";
export type DrawMode = "random" | "algorithmic";
export type DrawStatus = "pending" | "simulated" | "published";
export type MatchType = "5_match" | "4_match" | "3_match";
export type PaymentStatus = "pending" | "paid" | "rejected";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type NotificationType = "draw_result" | "winner_alert" | "payment_reminder" | "system";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          selected_charity_id: string | null;
          charity_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          selected_charity_id?: string | null;
          charity_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          selected_charity_id?: string | null;
          charity_percentage?: number;
          updated_at?: string;
        };
        // Required by Supabase GenericTable — populated by Supabase CLI auto-gen
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          razorpay_customer_id: string | null;
          razorpay_subscription_id: string | null;
          plan_type: SubscriptionPlan;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          razorpay_customer_id?: string | null;
          razorpay_subscription_id?: string | null;
          plan_type: SubscriptionPlan;
          status: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          razorpay_customer_id?: string | null;
          razorpay_subscription_id?: string | null;
          plan_type?: SubscriptionPlan;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      scores: {
        Row: {
          id: string;
          user_id: string;
          score_value: number;
          score_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score_value: number;
          score_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          score_value?: number;
          score_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      charities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          short_description: string | null;
          logo_url: string | null;
          banner_url: string | null;
          website_url: string | null;
          is_featured: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          short_description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          website_url?: string | null;
          is_featured?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          short_description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          website_url?: string | null;
          is_featured?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      charity_events: {
        Row: {
          id: string;
          charity_id: string;
          title: string;
          description: string | null;
          event_date: string;
          location: string | null;
          image_url: string | null;
          event_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          charity_id: string;
          title: string;
          description?: string | null;
          event_date: string;
          location?: string | null;
          image_url?: string | null;
          event_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          event_date?: string;
          location?: string | null;
          image_url?: string | null;
          event_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      charity_contributions: {
        Row: {
          id: string;
          user_id: string;
          charity_id: string;
          subscription_id: string | null;
          amount_pence: number;
          percentage: number;
          contribution_type: ContributionType;
          currency: string;
          period_month: number | null;
          period_year: number | null;
          razorpay_payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          charity_id: string;
          subscription_id?: string | null;
          amount_pence: number;
          percentage: number;
          contribution_type: ContributionType;
          currency?: string;
          period_month?: number | null;
          period_year?: number | null;
          razorpay_payment_id?: string | null;
          created_at?: string;
        };
        Update: {
          amount_pence?: number;
          percentage?: number;
          contribution_type?: ContributionType;
          currency?: string;
          period_month?: number | null;
          period_year?: number | null;
          razorpay_payment_id?: string | null;
        };
        Relationships: [];
      };
      draws: {
        Row: {
          id: string;
          draw_month: number;
          draw_year: number;
          draw_mode: DrawMode;
          status: DrawStatus;
          drawn_numbers: number[] | null;
          total_prize_pool_pence: number;
          pool_5_match_pence: number;
          pool_4_match_pence: number;
          pool_3_match_pence: number;
          jackpot_carried_in_pence: number;
          jackpot_rolled_over: boolean;
          active_subscriber_count: number | null;
          published_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          draw_month: number;
          draw_year: number;
          draw_mode: DrawMode;
          status?: DrawStatus;
          drawn_numbers?: number[] | null;
          total_prize_pool_pence?: number;
          pool_5_match_pence?: number;
          pool_4_match_pence?: number;
          pool_3_match_pence?: number;
          jackpot_carried_in_pence?: number;
          jackpot_rolled_over?: boolean;
          active_subscriber_count?: number | null;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          draw_mode?: DrawMode;
          status?: DrawStatus;
          drawn_numbers?: number[] | null;
          total_prize_pool_pence?: number;
          pool_5_match_pence?: number;
          pool_4_match_pence?: number;
          pool_3_match_pence?: number;
          jackpot_carried_in_pence?: number;
          jackpot_rolled_over?: boolean;
          active_subscriber_count?: number | null;
          published_at?: string | null;
        };
        Relationships: [];
      };
      draw_results: {
        Row: {
          id: string;
          draw_id: string;
          user_id: string;
          entry_data: Record<string, unknown> | null;
          matched_numbers: number[] | null;
          match_count: number;
          is_winner: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          draw_id: string;
          user_id: string;
          entry_data?: Record<string, unknown> | null;
          matched_numbers?: number[] | null;
          match_count?: number;
          is_winner?: boolean;
          created_at?: string;
        };
        Update: {
          entry_data?: Record<string, unknown> | null;
          matched_numbers?: number[] | null;
          match_count?: number;
          is_winner?: boolean;
        };
        Relationships: [];
      };
      winners: {
        Row: {
          id: string;
          draw_id: string;
          user_id: string;
          match_type: MatchType;
          prize_amount_pence: number;
          payment_status: PaymentStatus;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          draw_id: string;
          user_id: string;
          match_type: MatchType;
          prize_amount_pence: number;
          payment_status?: PaymentStatus;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          prize_amount_pence?: number;
          payment_status?: PaymentStatus;
          paid_at?: string | null;
        };
        Relationships: [];
      };
      winner_verifications: {
        Row: {
          id: string;
          winner_id: string;
          user_id: string;
          screenshot_url: string;
          admin_notes: string | null;
          verification_status: VerificationStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          winner_id: string;
          user_id: string;
          screenshot_url: string;
          admin_notes?: string | null;
          verification_status?: VerificationStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          screenshot_url?: string;
          admin_notes?: string | null;
          verification_status?: VerificationStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      prize_pool_history: {
        Row: {
          id: string;
          draw_id: string | null;
          period_month: number;
          period_year: number;
          total_active_subscriptions: number;
          subscription_revenue_pence: number;
          pool_contribution_percent: number;
          pool_contribution_pence: number;
          jackpot_rollover_in_pence: number;
          final_pool_5_match_pence: number;
          final_pool_4_match_pence: number;
          final_pool_3_match_pence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          draw_id?: string | null;
          period_month: number;
          period_year: number;
          total_active_subscriptions?: number;
          subscription_revenue_pence?: number;
          pool_contribution_percent: number;
          pool_contribution_pence?: number;
          jackpot_rollover_in_pence?: number;
          final_pool_5_match_pence?: number;
          final_pool_4_match_pence?: number;
          final_pool_3_match_pence?: number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          type: NotificationType;
          title: string;
          body: string;
          is_read: boolean;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          type: NotificationType;
          title: string;
          body: string;
          is_read?: boolean;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
          sent_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    // Required by Supabase GenericSchema — empty until custom composite types are defined
    CompositeTypes: Record<string, never>;
  };
};
