"use client";
import { vehicleCategoryLabel, vehicleCategories } from "@/lib/vehicle-categories";
import { VehiclePhoto } from "./vehicle-photo";
import { useActionState, useState } from "react";
import Link from "next/link";
import { quotePassenger, createPassengerBooking, type BookingState } from "@/app/passenger/actions";
import type { PublicLocation, PublicVehicle } from "@/lib/website";
export function PassengerBookingForm({
  locations,
  fleet,
  profile,
  preferredVehicle,
}: {
  locations: PublicLocation[];
  fleet: PublicVehicle[];
  preferredVehicle?: string;
  profile?: { name: string; email: string; phone: string } | null;
}) {
  const [vehicleId, setVehicle] = useState(
    fleet.find((v) => v.id === preferredVehicle)?.id ?? fleet[0]?.id ?? "",
  );
  const vehicle = fleet.find((v) => v.id === vehicleId);
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState("one_way");
  const [dirty, setDirty] = useState(true);
  const [journey, setJourney] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({
    passengers: "1",
    luggage: "0",
  });
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [requestId, setRequestId] = useState("");
  const [quoteState, quoteAction, quoting] = useActionState(
    async (prev: BookingState, form: FormData) => {
      setRequestId(crypto.randomUUID());
      setDirty(false);
      setJourney(
        Object.fromEntries(
          [...form.entries()].filter(([k]) => k !== "extras").map(([k, v]) => [k, String(v)]),
        ),
      );
      return quotePassenger(prev, form);
    },
    {},
  );
  const quote = !dirty ? quoteState.quote : undefined;
  const [bookingState, bookAction, submitting] = useActionState(createPassengerBooking, {});
  if (bookingState.bookings)
    return (
      <section className="panel p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Booking request received</h2>
        <p>
          Your reservation is pending review and availability confirmation. No driver is assigned
          automatically.
        </p>
        {bookingState.bookings.map((b) => (
          <Link key={b.id} className="button" href={`/passenger/bookings/${b.id}`}>
            View {b.reference} · {b.status}
          </Link>
        ))}
      </section>
    );
  return (
    <div className="space-y-6">
      <ol aria-label="Booking progress" className="flex flex-wrap gap-4 text-sm">
        <li>1. Journey</li>
        <li>2. Vehicle and fare</li>
        <li>3. Passenger profile</li>
        <li>4. Review and request</li>
      </ol>
      <form
        action={quoteAction}
        className="panel p-6 space-y-6"
        onChange={(event) => {
          setDirty(true);
          const target = event.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
          if (target.name && target.type !== "checkbox")
            setFormValues((previous) => ({ ...previous, [target.name]: target.value }));
        }}
      >
        <h2 className="text-xl font-semibold">Journey and vehicle</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ["pickup_id", "Pickup location"],
            ["dropoff_id", "Drop-off location"],
          ].map(([name, label]) => (
            <label key={name} className="field">
              {label}
              <select name={name} required value={formValues[name] ?? ""} onChange={() => {}}>
                <option value="">Choose a published location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.airport_code ? ` (${l.airport_code})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="field">
            Pickup date (UAE)
            <input
              type="date"
              name="pickup_date"
              required
              value={formValues.pickup_date ?? ""}
              onChange={() => {}}
            />
          </label>
          <label className="field">
            Pickup time (UAE)
            <input
              type="time"
              name="pickup_time"
              required
              value={formValues.pickup_time ?? ""}
              onChange={() => {}}
            />
          </label>
          <label className="field">
            Passengers
            <input
              type="number"
              name="passengers"
              min={1}
              max={1000}
              value={formValues.passengers}
              onChange={() => {}}
              required
            />
          </label>
          <label className="field">
            Luggage
            <input
              type="number"
              name="luggage"
              min={0}
              max={1000}
              value={formValues.luggage}
              onChange={() => {}}
              required
            />
          </label>
          <label className="field">
            Journey type
            <select name="transfer_type" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="one_way">One way</option>
              <option value="return">Return (subject to published pricing)</option>
            </select>
          </label>
          {kind === "return" && (
            <label className="field">
              Return pickup (UAE)
              <input
                type="datetime-local"
                name="return_at"
                required
                value={formValues.return_at ?? ""}
                onChange={() => {}}
              />
            </label>
          )}
          <label className="field">
            Flight number, if applicable
            <input
              name="flight"
              maxLength={200}
              value={formValues.flight ?? ""}
              onChange={() => {}}
            />
          </label>
        </div>
        <p className="text-sm text-muted">
          Airport terminal and additional stops must be confirmed with our team. Additional stops
          are not quoted without approved pricing.
        </p>
        <label className="field">
          Vehicle category
          <select
            value={category}
            onChange={(event) => {
              const code = event.target.value;
              setCategory(code);
              setVehicle(fleet.find((v) => !code || v.category === code)?.id ?? "");
            }}
          >
            <option value="">All four categories</option>
            {vehicleCategories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} · {c.capacity}
              </option>
            ))}
          </select>
        </label>
        {category && !fleet.some((v) => v.category === category) && (
          <p className="notice">
            No owner-published vehicle in this category is available for selection.
          </p>
        )}
        <fieldset className="grid sm:grid-cols-2 gap-4">
          <legend className="font-semibold mb-3">
            Published vehicles · Availability pending dispatch
          </legend>
          {fleet
            .filter((v) => !category || v.category === category)
            .map((v) => (
              <label key={v.id} className="border rounded-xl p-4 space-y-2 cursor-pointer">
                <VehiclePhoto src={v.image_url} name={v.name} />
                <span className="flex gap-3 items-center">
                  <input
                    type="radio"
                    required
                    name="vehicle_id"
                    value={v.id}
                    checked={vehicleId === v.id}
                    onChange={() => setVehicle(v.id)}
                  />
                  <strong>{v.name}</strong>
                </span>
                <p>
                  {vehicleCategoryLabel(v.category)} · {v.capacity} passengers ·{" "}
                  {v.luggage_capacity == null
                    ? "Luggage capacity not published"
                    : `${v.luggage_capacity} luggage`}
                </p>
                {v.description && (
                  <p dir="auto" className="text-sm">
                    {v.description}
                  </p>
                )}
              </label>
            ))}
        </fieldset>
        <input type="hidden" name="category" value={vehicle?.category ?? ""} />
        {quoteState.quote?.pricing.extras?.length ? (
          <fieldset className="space-y-3">
            <legend>Published optional extras · Recalculate after changing</legend>
            {quoteState.quote.pricing.extras.map((e) => (
              <label key={e.id} className="flex gap-3">
                <input
                  type="checkbox"
                  name="extras"
                  value={e.id}
                  checked={selectedExtras.includes(e.id)}
                  onChange={(event) =>
                    setSelectedExtras((previous) =>
                      event.target.checked
                        ? [...previous, e.id]
                        : previous.filter((id) => id !== e.id),
                    )
                  }
                />
                {e.name} · AED {Number(e.price_aed).toFixed(2)} (
                {e.charge_basis.replaceAll("_", " ")})
              </label>
            ))}
          </fieldset>
        ) : null}
        {quoteState.error && (
          <p role="alert" className="notice error">
            {quoteState.error}
          </p>
        )}
        <button className="button" disabled={quoting || submitting || !vehicle}>
          {quoting ? "Calculating…" : "Calculate fare"}
        </button>
      </form>
      {quote && (
        <form action={bookAction} className="panel p-6 space-y-5">
          <h2 className="text-xl font-semibold">Review your booking request</h2>
          <p>
            {locations.find((l) => l.id === journey.pickup_id)?.name} →{" "}
            {locations.find((l) => l.id === journey.dropoff_id)?.name}
          </p>
          <p>
            {journey.pickup_date} at {journey.pickup_time} UAE
            {journey.return_at ? ` · Return ${journey.return_at.replace("T", " ")} UAE` : ""}
          </p>
          <p>
            {vehicle?.name} · {journey.passengers} passengers · {journey.luggage} luggage
          </p>
          <p>
            Base: AED {Number(quote.pricing.base_fare).toFixed(2)} · Charges: AED{" "}
            {Number(quote.pricing.additional_charges).toFixed(2)}
          </p>
          <p>
            Outbound: AED {Number(quote.pricing.outbound_aed).toFixed(2)}
            {quote.pricing.return_aed !== null
              ? ` · Return: AED ${Number(quote.pricing.return_aed).toFixed(2)}`
              : ""}
          </p>
          <p className="text-2xl font-semibold">
            Total AED {Number(quote.pricing.total_aed).toFixed(2)}
          </p>
          <p className="text-sm">
            Quote expires {new Date(quote.expires_at).toLocaleTimeString()}. Fares and policies are
            checked again before submission. Availability and exact assigned vehicle are pending
            dispatch.
          </p>
          {profile && (
            <section className="border rounded-lg p-4">
              <h3 className="font-semibold">Passenger contact</h3>
              <p>
                {profile.name} · {profile.email} · {profile.phone}
              </p>
            </section>
          )}
          <p className="notice">
            Your verified account and saved{" "}
            <Link href="/passenger" className="underline">
              passenger profile
            </Link>{" "}
            provide contact details. Update these before submitting. Payment is available only after
            our team confirms the booking.
          </p>
          <label className="field">
            Terminal, pickup instructions and accessibility requests
            <textarea name="notes" maxLength={4000} />
          </label>
          {Object.entries(quote.terms).map(([key, value]) => (
            <details key={key}>
              <summary className="cursor-pointer font-semibold">{key.replaceAll("_", " ")}</summary>
              <p className="whitespace-pre-wrap text-sm mt-3" dir="auto">
                {value}
              </p>
            </details>
          ))}
          <label className="flex gap-3 items-start">
            <input type="checkbox" name="acknowledged" required />I agree to the terms, privacy,
            booking and cancellation policies shown above.
          </label>
          <input type="hidden" name="quote_id" value={quote.id} />
          <input type="hidden" name="request_id" value={requestId} />
          {bookingState.error && (
            <p role="alert" className="notice error">
              {bookingState.error}
            </p>
          )}
          <button
            className="button"
            disabled={submitting || quoting}
            onClick={() => {
              if (!requestId) setRequestId(crypto.randomUUID());
            }}
          >
            {submitting ? "Submitting…" : "Request booking"}
          </button>
        </form>
      )}
    </div>
  );
}
