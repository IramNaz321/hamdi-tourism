"use client";
import { PasswordInput } from "@/components/password-input";
import { TurnstileChallenge } from "./turnstile-challenge";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { login, resetPassword, updatePassword } from "@/app/auth/actions";
export function AuthForm({
  mode,
  configured = true,
  returnTo,
}: {
  mode: "login" | "reset" | "update";
  configured?: boolean;
  returnTo?: string;
}) {
  const [captcha, setCaptcha] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const needsCaptcha = mode !== "update" && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [state, action, pending] = useActionState(
    async (previous: import("@/app/auth/actions").AuthState, form: FormData) => {
      const result = await (
        mode === "login" ? login : mode === "reset" ? resetPassword : updatePassword
      )(previous, form);
      setCaptcha("");
      setCaptchaKey((key) => key + 1);
      return result;
    },
    {},
  );
  return (
    <form action={action} className="space-y-5">
      {mode === "login" && returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
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
          <PasswordInput
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "update" ? 12 : undefined}
          />
        </label>
      )}
      {mode === "update" && (
        <>
          <label className="field">
            Confirm password
            <PasswordInput name="confirm" autoComplete="new-password" minLength={12} />
          </label>
          <p className="text-sm text-muted">Use at least 12 characters and a unique password.</p>
        </>
      )}
      {needsCaptcha && configured && (
        <>
          <TurnstileChallenge
            key={captchaKey}
            action={mode === "login" ? "sign_in" : "recovery"}
            onToken={setCaptcha}
          />
          <input type="hidden" name="captcha_token" value={captcha} />
        </>
      )}
      <button
        className="button w-full"
        disabled={pending || !configured || (needsCaptcha && !captcha)}
      >
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
