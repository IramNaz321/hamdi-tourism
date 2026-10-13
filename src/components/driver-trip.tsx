"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateDriverTrip } from "@/app/driver-account/actions";
export type DriverTrip = {
  id: string;
  reference: string;
  status: string;
  pickup_at: string;
  pickup: string;
  destination: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  passengers: number;
  luggage: number;
  flight_number: string | null;
  instructions: string | null;
  customer_name: string;
  customer_phone: string;
  vehicle: string;
  registration: string;
  accepted_at: string | null;
  arrived_at: string | null;
  picked_up_at: string | null;
};
export function DriverRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 20000);
    return () => clearInterval(id);
  }, [router]);
  return (
    <button className="button secondary" onClick={() => router.refresh()}>
      Refresh trips
    </button>
  );
}
function navigation(name: string, latitude: number | null, longitude: number | null) {
  const destination = latitude !== null && longitude !== null ? `${latitude},${longitude}` : name;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
export function DriverTripCard({ trip }: { trip: DriverTrip }) {
  const [state, action, pending] = useActionState(updateDriverTrip, {});
  const next =
    trip.status === "in_progress"
      ? trip.picked_up_at
        ? { value: "complete", label: "Complete trip" }
        : null
      : !trip.accepted_at
        ? { value: "accept", label: "Accept trip" }
        : !trip.arrived_at
          ? { value: "arrive", label: "Arrived at pickup" }
          : { value: "pickup", label: "Passenger picked up · Start trip" };
  return (
    <article className="panel p-6 space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="font-semibold">{trip.reference}</h2>
        <span className="badge">{trip.status.replaceAll("_", " ")}</span>
      </div>
      <p className="text-sm">
        {new Date(trip.pickup_at).toLocaleString("en-AE", { timeZone: "Asia/Dubai" })} · UAE
      </p>
      <div>
        <p className="font-semibold">
          {trip.pickup} → {trip.destination}
        </p>
        <p className="text-sm text-muted mt-2">
          {trip.passengers} passengers · {trip.luggage} luggage
        </p>
      </div>
      <p>
        {trip.customer_name} ·{" "}
        <a className="underline" href={`tel:${trip.customer_phone.replace(/[^+\d]/g, "")}`}>
          Call passenger
        </a>
      </p>
      {trip.flight_number && <p className="text-sm">Flight: {trip.flight_number}</p>}
      {trip.instructions && <p className="text-sm whitespace-pre-wrap">{trip.instructions}</p>}
      <p className="text-sm">
        Vehicle: {trip.vehicle || "Details unavailable"} ·{" "}
        {trip.registration || "Registration unavailable"}
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          className="button secondary"
          target="_blank"
          rel="noopener noreferrer"
          href={navigation(trip.pickup, trip.pickup_latitude, trip.pickup_longitude)}
        >
          Navigate to pickup
        </a>
        <a
          className="button secondary"
          target="_blank"
          rel="noopener noreferrer"
          href={navigation(trip.destination, trip.destination_latitude, trip.destination_longitude)}
        >
          Navigate to destination
        </a>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {next ? (
        <form action={action}>
          <input type="hidden" name="id" value={trip.id} />
          <input type="hidden" name="action" value={next.value} />
          <button className="button" disabled={pending}>
            {pending ? "Saving…" : next.label}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Contact your dispatcher to review this trip’s progress.
        </p>
      )}
    </article>
  );
}
