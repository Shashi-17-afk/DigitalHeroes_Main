"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";

import { signIn, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AuthActionState = { error: null };

interface LoginFormProps {
  /** Preserves the intended destination after login (from middleware redirect) */
  next?: string;
}

export function LoginForm({ next }: LoginFormProps): React.JSX.Element {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Brand header */}
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <span className="text-xl font-bold text-white">DH</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to your Digital Heroes account</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        {/* Error alert */}
        {state.error && (
          <Alert
            id="login-error"
            variant="destructive"
            className="mb-6 border-red-500/50 bg-red-500/10 text-red-400"
            role="alert"
          >
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <form action={formAction} noValidate className="space-y-5">
          {/* Hidden next URL for post-login redirect */}
          {next && <input type="hidden" name="next" value={next} />}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-sm font-medium text-slate-300">
              Email address
            </Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state.fields?.email ?? ""}
              placeholder="you@example.com"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
              aria-describedby={state.error ? "login-error" : undefined}
              disabled={isPending}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-sm font-medium text-slate-300">
                Password
              </Label>
              {/* Forgot password — Phase 11 */}
              <span className="text-xs text-slate-500">Forgot password? (coming soon)</span>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="••••••••"
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
          </div>

          {/* Submit */}
          <Button
            id="login-submit"
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Create one for free
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-600">Play Golf · Change Lives · Win Together</p>
    </div>
  );
}
