"use client";
import { useActionState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LocationSharing } from "@/components/location-sharing";
import { nextDriverAction, driverActions } from "@/lib/tracking";
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
  luggage: number | null;
  flight_number: string | null;
  flight_status: string;
  instructions: string | null;
  customer_name: string;
  customer_phone: string;
  vehicle: string;
  registration: string;
  accepted_at: string | null;
  en_route_at: string | null;
  handover_at: string | null;
  arrived_at: string | null;
  picked_up_at: string | null;
};
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
export function DriverRefresh() {
  const router = useRouter();
  const online = useOnline();
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden && navigator.onLine) router.refresh();
    }, 20000);
    return () => clearInterval(id);
  }, [router]);
  return (
    <div className="space-y-2">
      <button disabled={!online} className="button secondary" onClick={() => router.refresh()}>
        Refresh trips
      </button>
      {!online && (
        <p role="status" className="text-sm text-muted">
          You are offline. Reconnect before changing trips or sharing location.
        </p>
      )}
    </div>
  );
}
function navigation(name: string, latitude: number | null, longitude: number | null) {
  const destination = latitude !== null && longitude !== null ? `${latitude},${longitude}` : name;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
export function DriverTripCard({ trip }: { trip: DriverTrip }) {
  const online = useOnline();
  const [state, action, pending] = useActionState(updateDriverTrip, {});
  const nextAction = nextDriverAction(trip);
  const next = nextAction ? { value: nextAction, label: driverActions[nextAction] } : null;
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
          {trip.passengers} passengers ·{" "}
          {trip.luggage == null ? "Luggage not recorded" : `${trip.luggage} luggage`}
        </p>
      </div>
      <p>
        {trip.customer_name} ·{" "}
        <a className="underline" href={`tel:${trip.customer_phone.replace(/[^+\d]/g, "")}`}>
          Call passenger
        </a>
      </p>
      {trip.flight_number && <p className="text-sm">Flight: {trip.flight_number}</p>}
      {trip.instructions && (
        <p dir="auto" className="text-sm whitespace-pre-wrap">
          {trip.instructions}
        </p>
      )}
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
      <ol aria-label="Trip progress" className="flex flex-wrap gap-2 text-xs">
        {[
          { label: "Assigned", recorded: true },
          { label: "Accepted", recorded: !!trip.accepted_at },
          { label: "En route", recorded: !!trip.en_route_at },
          { label: "Arrived", recorded: !!trip.arrived_at },
          { label: "Picked up", recorded: !!trip.picked_up_at || !!trip.handover_at },
        ].map((step) => (
          <li key={step.label} className="badge">
            {step.recorded ? "✓ " : ""}
            {step.label}
          </li>
        ))}
      </ol>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {next ? (
        <form action={action}>
          <input type="hidden" name="id" value={trip.id} />
          <input type="hidden" name="action" value={next.value} />
          <button className="button" disabled={pending || !online}>
            {pending ? "Saving…" : next.label}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Contact your dispatcher to review this trip’s progress.
        </p>
      )}
      {(trip.en_route_at || trip.handover_at || trip.status === "in_progress") && (
        <LocationSharing
          tripId={trip.id}
          eligible={
            !!(trip.en_route_at || trip.handover_at) &&
            ["confirmed", "in_progress"].includes(trip.status)
          }
        />
      )}
    </article>
  );
}
