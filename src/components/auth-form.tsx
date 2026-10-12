"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { login, resetPassword, updatePassword } from "@/app/auth/actions";
export function AuthForm({
  mode,
  configured = true,
}: {
  mode: "login" | "reset" | "update";
  configured?: boolean;
}) {
  const [state, action, pending] = useActionState(
    mode === "login" ? login : mode === "reset" ? resetPassword : updatePassword,
    {},
  );
  return (
    <form action={action} className="space-y-5">
      {!configured && (
        <p className="notice">
          Admin access is not available yet. Please contact the business owner.
        </p>
      )}
      {state.error && (
        <p role="alert" className="notice error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="notice">
          {state.success}
        </p>
      )}
      {mode !== "update" && (
        <label className="field">
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@company.com"
          />
        </label>
      )}
      {mode !== "reset" && (
        <label className="field">
          {mode === "update" ? "New password" : "Password"}
          <input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "update" ? 12 : undefined}
            maxLength={128}
          />
        </label>
      )}
      {mode === "update" && (
        <>
          <label className="field">
            Confirm password
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <p className="text-sm text-muted">Use at least 12 characters and a unique password.</p>
        </>
      )}
      <button className="button w-full" disabled={pending || !configured}>
        {pending
          ? "Please wait…"
          : mode === "login"
            ? "Sign in securely"
            : mode === "reset"
              ? "Send reset link"
              : "Save password"}
        <ArrowRight size={18} />
      </button>
      {mode === "login" ? (
        <Link className="text-sm text-muted hover:text-ink" href="/reset-password">
          Forgot your password?
        </Link>
      ) : (
        <Link className="text-sm text-muted hover:text-ink" href="/login">
          Back to sign in
        </Link>
      )}
      <p className="flex items-center gap-2 text-xs text-muted">
        <LockKeyhole size={14} /> Access is reserved for authorized staff.
      </p>
    </form>
  );
}
