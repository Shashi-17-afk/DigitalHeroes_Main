import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Join Digital Heroes — subscribe, track your golf scores, support a charity, and enter monthly prize draws. Free to get started.",
};

/**
 * Signup page — Server Component.
 * The interactive form is a Client Component (SignupForm) that handles
 * useActionState and real-time password strength validation.
 */
export default function SignupPage(): React.JSX.Element {
  return <SignupForm />;
}
