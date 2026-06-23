"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";

import { signUp, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AuthActionState = { error: null };

/** Real-time password strength indicator */
function PasswordStrength({ password }: { password: string }): React.JSX.Element | null {
  if (!password) return null;

  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
  ];

  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      {checks.map(({ label, pass }) => (
        <li key={label} className="flex items-center gap-1.5 text-xs">
          {pass ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          )}
          <span className={pass ? "text-green-400" : "text-slate-500"}>{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function SignupForm(): React.JSX.Element {
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Brand header */}
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <span className="text-xl font-bold text-white">DH</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Join Digital Heroes</h1>
        <p className="mt-2 text-sm text-slate-400">
          Play golf, support charity, and win monthly prizes
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        {/* Error alert */}
        {state.error && (
          <Alert
            id="signup-error"
            variant="destructive"
            className="mb-6 border-red-500/50 bg-red-500/10 text-red-400"
            role="alert"
          >
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <form action={formAction} noValidate className="space-y-5">
          {/* Full name */}
          <div className="space-y-2">
            <Label htmlFor="signup-fullname" className="text-sm font-medium text-slate-300">
              Full name
            </Label>
            <Input
              id="signup-fullname"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              defaultValue={state.fields?.fullName ?? ""}
              placeholder="Jane Smith"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
              disabled={isPending}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-sm font-medium text-slate-300">
              Email address
            </Label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state.fields?.email ?? ""}
              placeholder="you@example.com"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
              aria-describedby={state.error ? "signup-error" : undefined}
              disabled={isPending}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-sm font-medium text-slate-300">
              Password
            </Label>
            <div className="relative">
              <Input
                id="signup-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-white/5 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="signup-confirm" className="text-sm font-medium text-slate-300">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="signup-confirm"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className="border-white/10 bg-white/5 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-300"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Charity selection note — completed in Phase 6 */}
          <p className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-300">
            🎯 After signing up, you&apos;ll choose a charity to support with your subscription.
          </p>

          {/* Submit */}
          <Button
            id="signup-submit"
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        {/* Sign in link */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-center text-xs text-slate-600">Play Golf · Change Lives · Win Together</p>
    </div>
  );
}
