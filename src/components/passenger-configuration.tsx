"use client";
import { useActionState } from "react";
import { savePlatform, saveRoute } from "@/app/admin/passenger-platform/actions";
export function PlatformConfiguration({
  settings,
}: {
  settings: { bookings_enabled: boolean; privacy_policy: string; terms: string } | null;
}) {
  const [state, action, pending] = useActionState(savePlatform, {});
  return (
    <form action={action} className="panel p-5 space-y-4">
      <h2 className="font-semibold">Booking policies and enablement</h2>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
      <label className="field">
        Approved privacy policy
        <textarea
          required
          name="privacy"
          maxLength={8000}
          defaultValue={settings?.privacy_policy ?? ""}
        />
      </label>
      <label className="field">
        Approved terms
        <textarea required name="terms" maxLength={8000} defaultValue={settings?.terms ?? ""} />
      </label>
      <label className="flex gap-3">
        <input type="checkbox" name="enabled" defaultChecked={settings?.bookings_enabled} />
        Enable verified passenger booking requests
      </label>
      <p>
        Existing Business Settings booking and cancellation policies must also be published. This
        does not enable payments or email delivery.
      </p>
      <button className="button" disabled={pending}>
        Save policies
      </button>
    </form>
  );
}
export function RouteConfiguration({
  route,
}: {
  route: {
    id: string;
    name: string;
    minutes: number | null;
    return_minutes: number | null;
    enabled: boolean;
  };
}) {
  const [state, action, pending] = useActionState(saveRoute, {});
  return (
    <form action={action} className="panel p-5 space-y-3">
      <h3 className="font-semibold">{route.name}</h3>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
      <input type="hidden" name="id" value={route.id} />
      <label className="field">
        Genuine outbound journey duration (minutes)
        <input
          name="minutes"
          type="number"
          required
          min={1}
          max={10080}
          defaultValue={route.minutes ?? ""}
        />
      </label>
      <label className="field">
        Return duration (minutes, blank disables return)
        <input
          name="return_minutes"
          type="number"
          min={1}
          max={10080}
          defaultValue={route.return_minutes ?? ""}
        />
      </label>
      <label className="flex gap-3">
        <input type="checkbox" name="enabled" defaultChecked={route.enabled} />
        Allow online requests for this route
      </label>
      <button className="button secondary" disabled={pending}>
        Save route
      </button>
    </form>
  );
}
