/**
 * Global shared TypeScript types
 * More specific types are co-located with their feature modules.
 */

// --- User Roles ---
export type UserRole = "subscriber" | "admin";

// --- Subscription ---
export type SubscriptionPlan = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "inactive" | "cancelled" | "past_due" | "trialing";

// --- Draw ---
export type DrawMode = "random" | "algorithmic";
export type DrawStatus = "pending" | "simulated" | "published";

// --- Match Types ---
export type MatchType = "5_match" | "4_match" | "3_match";

// --- Prize / Payment ---
export type PaymentStatus = "pending" | "paid" | "rejected";
export type VerificationStatus = "pending" | "approved" | "rejected";

// --- Charity Contribution ---
export type ContributionType = "subscription" | "independent";

// --- Notifications ---
export type NotificationType = "draw_result" | "winner_alert" | "payment_reminder" | "system";

// --- API Response wrapper ---
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
