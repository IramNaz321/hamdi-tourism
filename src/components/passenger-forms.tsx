"use client";
import { useActionState, useState } from "react";
import { TurnstileChallenge } from "./turnstile-challenge";
import Link from "next/link";
import { PasswordInput } from "./password-input";
import {
  passengerLogin,
  passengerRegister,
  passengerRecovery,
  savePassengerProfile,
  requestCancellation,
} from "@/app/passenger/actions";
function Feedback({ state }: { state: { error?: string; success?: string } }) {
  return (
    <>
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
    </>
  );
}
export function PassengerAuthForm({
  mode,
  configured,
  next,
}: {
  mode: "login" | "register" | "recovery";
  configured: boolean;
  next?: string;
}) {
  const [captcha, setCaptcha] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [state, action, pending] = useActionState(
    async (previous: import("@/app/passenger/actions").PassengerState, form: FormData) => {
      const result = await (
        mode === "login"
          ? passengerLogin
          : mode === "register"
            ? passengerRegister
            : passengerRecovery
      )(previous, form);
      setCaptcha("");
      setCaptchaKey((key) => key + 1);
      return result;
    },
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      {!configured && (
        <p className="notice">
          Passenger account access is currently unavailable. Please contact our team.
        </p>
      )}
      <input type="hidden" name="next" value={next ?? "/passenger"} />
      <label className="field">
        Email
        <input required name="email" type="email" maxLength={254} autoComplete="email" />
      </label>
      {mode !== "recovery" && (
        <label className="field">
          Password
          <PasswordInput
            name="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            minLength={mode === "register" ? 12 : undefined}
          />
        </label>
      )}
      {mode === "register" && (
        <>
          <label className="field">
            Confirm password
            <PasswordInput name="confirm" autoComplete="new-password" minLength={12} />
          </label>
          <label className="flex gap-3 items-start">
            <input required type="checkbox" name="acknowledged" />I understand email verification is
            required. Booking policies are shown before submission.
          </label>
          <p className="text-sm text-muted">No payment or reservation is created by registering.</p>
        </>
      )}
      {configured && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <>
          <TurnstileChallenge
            key={captchaKey}
            action={
              mode === "register"
                ? "passenger_registration"
                : mode === "login"
                  ? "sign_in"
                  : "recovery"
            }
            onToken={setCaptcha}
          />
          <input type="hidden" name="captcha_token" value={captcha} />
        </>
      )}
      <button
        className="button w-full"
        disabled={
          pending || !configured || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captcha)
        }
      >
        {pending
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : mode === "register"
              ? "Create passenger account"
              : "Send recovery link"}
      </button>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/passenger/login">Passenger sign in</Link>
        <Link href="/passenger/register">Create an account</Link>
        <Link href="/passenger/login?mode=recovery">Recover password</Link>
      </div>
    </form>
  );
}
export function PassengerProfileForm({
  profile,
}: {
  profile: { name: string; phone: string; email: string } | null;
}) {
  const [state, action, pending] = useActionState(savePassengerProfile, {});
  return (
    <form action={action} className="panel p-5 space-y-4">
      <h2 className="font-semibold">Your profile</h2>
      <Feedback state={state} />
      <p className="text-sm">
        {profile?.email ?? "Your verified account email is used for booking contact."}
      </p>
      <label className="field">
        Full name
        <input
          name="name"
          required
          maxLength={200}
          autoComplete="name"
          defaultValue={profile?.name}
        />
      </label>
      <label className="field">
        Phone
        <input
          name="phone"
          type="tel"
          required
          minLength={7}
          maxLength={100}
          autoComplete="tel"
          defaultValue={profile?.phone}
        />
      </label>
      <button className="button" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
export function CancellationForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(requestCancellation, {});
  return (
    <form action={action} className="panel p-5 space-y-4">
      <h2 className="font-semibold">Request cancellation</h2>
      <Feedback state={state} />
      <input type="hidden" name="id" value={id} />
      <label className="field">
        Reason
        <textarea required name="reason" maxLength={2000} />
      </label>
      <p className="text-sm">
        This requests review under your booking policy. It does not cancel or refund automatically.
      </p>
      <button className="button secondary" disabled={pending}>
        {pending ? "Sending…" : "Request cancellation review"}
      </button>
    </form>
  );
}
