"use server";

/**
 * Auth Server Actions
 *
 * All form submissions for login, signup, and logout go through these.
 * Pattern: Server Action → Zod validation → Supabase Auth → redirect or error state.
 *
 * Security notes:
 *   - redirect() is called OUTSIDE try-catch (Next.js requires this)
 *   - Open redirect prevention: only relative URLs accepted for `next` param
 *   - Supabase errors are mapped to user-friendly messages
 *   - Network errors (e.g. unconfigured Supabase) return a generic message
 */

import { redirect } from "next/navigation";

import { sendEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validations/auth.schema";

// Shared return type for all auth actions used with useActionState
export type AuthActionState = {
  error: string | null;
  // Preserve field values on error so the form doesn't clear
  fields?: {
    email?: string;
    fullName?: string;
  };
};

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------
export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // Validate
  const result = signInSchema.safeParse(rawData);
  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Validation failed",
      fields: { email: rawData.email },
    };
  }

  // Authenticate
  let redirectPath = "/dashboard";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(result.data);

    if (error) {
      return {
        error: mapAuthError(error.message),
        fields: { email: rawData.email },
      };
    }

    // Safe redirect: only allow relative URLs (prevent open redirect)
    const next = formData.get("next") as string | null;
    if (next && isValidRelativeUrl(next)) {
      redirectPath = next;
    }
  } catch {
    return {
      error: "Connection error. Please check your configuration and try again.",
      fields: { email: rawData.email },
    };
  }

  // redirect() must be called outside try-catch — throws a special Next.js error
  redirect(redirectPath);
}

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------
export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const rawData = {
    fullName: formData.get("fullName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  // Validate
  const result = signUpSchema.safeParse(rawData);
  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Validation failed",
      fields: { email: rawData.email, fullName: rawData.fullName },
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        // handle_new_user() trigger creates the profile row with full_name
        data: { full_name: result.data.fullName },
        // Supabase sends a confirmation email with this URL
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
    });

    if (error) {
      return {
        error: mapAuthError(error.message),
        fields: { email: rawData.email, fullName: rawData.fullName },
      };
    }

    // Send welcome email — fire-and-forget, never blocks redirect
    const { subject, html } = welcomeEmail({
      fullName: result.data.fullName,
      email: result.data.email,
    });
    void sendEmail({ to: result.data.email, subject, html });
  } catch {
    return {
      error: "Connection error. Please check your configuration and try again.",
      fields: { email: rawData.email, fullName: rawData.fullName },
    };
  }

  // Welcome redirect — charity selection prompted on first dashboard visit (Phase 6)
  redirect("/dashboard?welcome=true");
}

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------
export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Continue with redirect even if signOut fails server-side
  }

  redirect("/login");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps Supabase auth error messages to user-friendly strings.
 * Supabase error messages change — matching is substring-based for resilience.
 */
function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please check your inbox and confirm your email address before signing in.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead?";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 8 characters.";
  }
  if (lower.includes("signup_disabled") || lower.includes("signups not allowed")) {
    return "New registrations are currently closed. Please contact support.";
  }
  if (
    lower.includes("rate_limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (lower.includes("email link is invalid or has expired")) {
    return "This link has expired. Please request a new one.";
  }

  // Fallback: return the original message (safe — Supabase messages are non-sensitive)
  return message;
}

/**
 * Security: only allow relative URLs to prevent open redirect attacks.
 * Rejects absolute URLs, protocol-relative URLs (//), and javascript: URIs.
 */
function isValidRelativeUrl(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\");
}
