"use client";
import { useActionState, useState } from "react";
import { changeTrackingAccess } from "@/app/admin/tracking-actions";
export function TrackingAccess({ tripId }: { tripId: string }) {
  const [state, action, pending] = useActionState(changeTrackingAccess, {});
  const [enabled, setEnabled] = useState("true");
  return (
    <section className="panel p-5 mt-6 space-y-4">
      <h2 className="font-semibold">Passenger tracking access</h2>
      <p className="text-sm text-muted">
        Grant access only to the confirmed Auth account of this booking’s verified passenger.
        Sharing expires within seven days. Revocation immediately blocks subsequent location reads,
        including already-open tracking pages.
      </p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="trip" value={tripId} />
        <label className="field">
          Confirmed passenger Auth ID
          <input name="passenger" required maxLength={36} />
        </label>
        <label className="field">
          Access
          <select name="enabled" value={enabled} onChange={(e) => setEnabled(e.target.value)}>
            <option value="true">Grant verified access</option>
            <option value="false">Revoke access</option>
          </select>
        </label>
        {enabled === "true" && (
          <label className="field">
            Expiry · UAE
            <input name="expiry" type="datetime-local" required />
          </label>
        )}
        <label className="flex gap-3 text-sm">
          <input type="checkbox" name="confirmed" required />I verified this passenger and authorize
          this access change.
        </label>
        <button className="button" disabled={pending}>
          {pending ? "Saving…" : "Update tracking access"}
        </button>
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
      </form>
      <a
        className="text-sm underline"
        href={`/track/${tripId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open booking tracking page
      </a>
    </section>
  );
}
