"use client";
import { useActionState } from "react";
import { setAvailability } from "@/app/driver-account/actions";
export function DriverAvailability({
  status,
  availableNow,
}: {
  status: string;
  availableNow: boolean;
}) {
  const [state, action, pending] = useActionState(setAvailability, {});
  return (
    <section className="panel p-5 space-y-3">
      <h2 className="font-semibold">Recorded availability · {status.replaceAll("_", " ")}</h2>
      <p className="text-sm text-muted">
        {availableNow
          ? "Available now based on recorded availability and trips."
          : "Not available now based on recorded availability and trips."}
      </p>
      <form action={action} className="flex flex-wrap gap-3">
        <label>
          Availability
          <select
            name="available"
            defaultValue={status === "unavailable" ? "false" : "true"}
            className="block border rounded-lg p-3 mt-2"
          >
            <option value="true">Available for assignments</option>
            <option value="false">Unavailable</option>
          </select>
        </label>
        <button className="button self-end min-h-12" disabled={pending}>
          {pending ? "Saving…" : "Update availability"}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm">
          {state.success}
        </p>
      )}
    </section>
  );
}
