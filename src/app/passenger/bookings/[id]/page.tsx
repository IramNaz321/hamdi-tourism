import { TravelConcierge } from "@/components/travel-concierge";
import Link from "next/link";
import { z } from "zod";
import { requirePassenger, type BookingDetail } from "@/lib/passenger";
import { bookingPaymentState } from "@/lib/passenger-validation";
import { CancellationForm } from "@/components/passenger-forms";
import { LiveTracking } from "@/components/live-tracking";
import { CheckoutForm } from "@/components/passenger-payment";
export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requirePassenger();
  if (!z.uuid().safeParse(id).success) return <main className="p-8">Booking unavailable.</main>;
  const { data, error } = await supabase.rpc("passenger_booking_detail", { trip_id: id });
  if (error || !data)
    return (
      <main className="max-w-4xl mx-auto p-8 space-y-5">
        <h1 className="text-2xl font-semibold">Booking unavailable</h1>
        <p>Your booking could not be verified. Retry or contact support.</p>
        <Link href="/passenger">Your account</Link>
      </main>
    );
  const b = data as BookingDetail;
  return (
    <main className="max-w-4xl mx-auto p-5 py-10 space-y-6" dir="auto">
      <TravelConcierge bookingId={id} />
      <Link href="/passenger">← Your journeys</Link>
      <h1 className="text-3xl font-semibold">{b.reference}</h1>
      <p className="notice">
        {b.status === "pending"
          ? "Booking request pending review. Your reservation is not yet confirmed."
          : `Booking ${b.status.replaceAll("_", " ")}`}
      </p>
      <section className="panel p-6 space-y-3">
        <h2 className="text-xl font-semibold">
          {b.pickup} → {b.destination}
        </h2>
        <p>{new Date(b.pickup_at).toLocaleString("en-AE", { timeZone: "Asia/Dubai" })} UAE</p>
        <p>
          {b.passengers} passengers · {b.luggage} luggage · AED {Number(b.price_aed).toFixed(2)}
        </p>
        <p>
          Vehicle preference: {b.preferred_vehicle} · Assigned: {b.vehicle ?? "Pending dispatch"}
        </p>
        <p>Driver: {b.driver ?? "Pending dispatch"}</p>
        {b.flight_number && (
          <p>
            Flight {b.flight_number} · {b.flight_status.replaceAll("_", " ")} (recorded by our team)
          </p>
        )}
        {b.notes && <p className="whitespace-pre-wrap">{b.notes}</p>}
        {b.pricing.extras.length > 0 && (
          <p>
            Quoted extras:{" "}
            {b.pricing.extras
              .map(
                (e) =>
                  `${e.name} · AED ${Number(e.price_aed).toFixed(2)} (${e.charge_basis.replaceAll("_", " ")})`,
              )
              .join(", ")}
          </p>
        )}
        {Object.entries(b.policies).map(([name, text]) => (
          <details key={name}>
            <summary>{name.replaceAll("_", " ")}</summary>
            <p className="whitespace-pre-wrap mt-3">{text}</p>
          </details>
        ))}
      </section>
      <section className="panel p-6 space-y-3">
        <h2 className="font-semibold">Payment</h2>
        <p>
          {bookingPaymentState(Number(b.paid_aed), Number(b.refunded_aed), Number(b.price_aed))} ·
          Verified paid AED {Number(b.paid_aed).toFixed(2)} · Refunds AED{" "}
          {Number(b.refunded_aed).toFixed(2)}
        </p>
        {b.payment_state && (
          <p>Checkout state: {b.payment_state}. Return links do not confirm payment.</p>
        )}
        {b.status === "confirmed" && Number(b.paid_aed) === 0 && <CheckoutForm id={id} />}
        <p className="text-sm text-muted">
          Only verified provider events confirm payments. Cancellation and refunds require separate
          review.
        </p>
      </section>
      <section className="panel p-6 space-y-3">
        <h2 className="font-semibold">Journey timeline</h2>
        {[
          ...b.timeline.map((t) => ({ label: t.status, at: t.at })),
          ...b.driver_events.map((e) => ({ label: e.action, at: e.at })),
        ]
          .sort((a, c) => a.at.localeCompare(c.at))
          .map((t, i) => (
            <p key={i}>
              {t.label.replaceAll("_", " ")} ·{" "}
              {new Date(t.at).toLocaleString("en-AE", { timeZone: "Asia/Dubai" })}
            </p>
          ))}
      </section>
      {["confirmed", "in_progress"].includes(b.status) && <LiveTracking tripId={id} />}
      <p className="text-sm">
        Tracking is available only for an authorized active trip with driver consent. No location or
        ETA is assumed.
      </p>
      {b.cancellation_request ? (
        <p className="notice">Cancellation review: {b.cancellation_request}</p>
      ) : (
        ["pending", "confirmed"].includes(b.status) && <CancellationForm id={id} />
      )}
    </main>
  );
}
