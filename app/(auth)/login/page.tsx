import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Digital Heroes account to track your golf scores, support your chosen charity, and enter monthly prize draws.",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

/**
 * Login page — Server Component.
 * Reads the `next` query param (set by middleware when redirecting
 * unauthenticated users) and passes it to the form for post-login redirect.
 */
export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.JSX.Element> {
  const { next } = await searchParams;

  return <LoginForm next={next} />;
}
