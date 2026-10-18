"use client";
import { useActionState, useState, useRef, useEffect } from "react";
import { vehicleCategories } from "@/lib/vehicle-categories";
import Script from "next/script";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { quoteTransfer, submitEnquiry } from "@/app/enquiry-actions";
import { money } from "@/lib/entities";
import type { PublicLocation, PublicVehicle } from "@/lib/website";
import { LocationPicker } from "@/components/location-picker";
type TurnstileAPI = {
  render: (node: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
export function TransferEnquiry({
  locations,
  fleet,
  enabled,
  canSubmit,
}: {
  locations: PublicLocation[];
  fleet: PublicVehicle[];
  enabled: boolean;
  canSubmit: boolean;
}) {
  const [quoteState, quoteAction, quoting] = useActionState(quoteTransfer, {});
  const [submitState, submitAction, sending] = useActionState(submitEnquiry, {});
  const [transfer, setTransfer] = useState("one_way");
  const [category, setCategory] = useState("");
  const [dirty, setDirty] = useState(false);
  const [token, setToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  const captcha = useRef<HTMLDivElement>(null);
  const quote = dirty || quoting ? undefined : quoteState.quote;
  const manualEnquiry = !dirty && !quoting && quoteState.manual;
  const showContactForm = !!quote || manualEnquiry;
  const categories = vehicleCategories.filter((item) =>
    fleet.some((vehicle) => vehicle.category === item.code),
  );
  const selectedCategory = categories.some((item) => item.code === category)
    ? category
    : (categories[0]?.code ?? "");
  const selectedVehicles = fleet.filter((vehicle) => vehicle.category === selectedCategory);
  const maxPassengers = Math.max(0, ...selectedVehicles.map((vehicle) => vehicle.capacity));
  const maxLuggage = Math.max(
    0,
    ...selectedVehicles.map((vehicle) => vehicle.luggage_capacity ?? 0),
  );
  useEffect(() => {
    if (!showContactForm || !captchaReady || !captcha.current || !canSubmit) return;
    const api = (window as unknown as { turnstile?: TurnstileAPI }).turnstile;
    if (!api) return;
    const id = api.render(captcha.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      action: "booking_enquiry",
      size: "compact",
      callback: (value: string) => {
        setToken(value);
        setCaptchaError("");
      },
      "expired-callback": () => setToken(""),
      "error-callback": () => {
        setToken("");
        setCaptchaError("The security check could not load. Please contact our team or try again.");
      },
    });
    return () => {
      api.remove(id);
      setToken("");
    };
  }, [showContactForm, captchaReady, canSubmit, submitState]);
  if (submitState.reference)
    return (
      <div className="panel p-8 text-center" role="status">
        <CheckCircle2 size={40} className="text-brand mx-auto mb-5" />
        <h2 className="text-2xl font-semibold">Your enquiry has been received</h2>
        <p className="text-muted mt-4">
          Reference: {submitState.reference}. Our team will review availability and contact you.
          {submitState.manual ? " No instant price was available; your request is for a manual quote." : ""}{" "}
          Your transfer is not confirmed yet.
        </p>
        <button type="button" className="button mt-6" onClick={() => window.location.reload()}>
          Plan another journey
        </button>
      </div>
    );
  return (
    <form
      action={quoteAction}
      onSubmit={() => setDirty(false)}
      onChange={(event) => {
        const target = event.target;
        if (
          !(target instanceof HTMLInputElement) &&
          !(target instanceof HTMLSelectElement) &&
          !(target instanceof HTMLTextAreaElement)
        )
          return;
        const name = target.name;
        if (
          ![
            "name",
            "email",
            "phone",
            "notes",
            "pickup_address",
            "dropoff_address",
            "website",
            "cf-turnstile-response",
          ].includes(name)
        )
          setDirty(true);
      }}
      className="panel p-6 lg:p-9 shadow-lg relative"
    >
      <div className="flex flex-wrap gap-3 items-start justify-between mb-7">
        <div>
          <p className="eyebrow mb-2">AIRPORT TRANSFERS & CHAUFFEUR SERVICES</p>
          <h2 className="text-2xl font-semibold">Plan your transfer</h2>
        </div>
        <p className="text-xs text-muted max-w-xs">
          Pickup times are in UAE time. Availability is confirmed by our team.
        </p>
      </div>
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted mb-6">
        <ArrowLeft size={16} />
        Back to homepage
      </Link>
      {!enabled && (
        <p className="notice mb-6">
          {!locations.length
            ? "Online transfer enquiries are not set up yet. The business owner needs to publish real pickup and drop-off locations."
            : locations.length < 2
              ? "At least two owner-verified locations must be published before a route can be quoted."
              : !fleet.length
                ? "No real vehicles are published for online transfer enquiries yet."
                : "Online transfer enquiries have not been enabled by the business owner."}{" "}
          Online quotes also require an active, published route and fare.
        </p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <LocationPicker
          label="Pickup location"
          name="pickup_id"
          locations={locations}
          disabled={!enabled}
        />
        <LocationPicker
          label="Drop-off location"
          name="dropoff_id"
          locations={locations}
          disabled={!enabled}
        />
        <label className="field">
          Pickup date
          <input name="pickup_date" type="date" required />
        </label>
        <label className="field">
          Pickup time
          <input name="pickup_time" type="time" required />
        </label>
        <label className="field">
          Passengers
          <input name="passengers" type="number" min={1} max={maxPassengers || 1000} required />
        </label>
        <label className="field">
          Luggage
          <input
            name="luggage"
            type="number"
            min={0}
            max={selectedVehicles.length ? maxLuggage : 1000}
            required
          />
        </label>
        <label className="field">
          Transfer type
          <select
            name="transfer_type"
            value={transfer}
            onChange={(e) => setTransfer(e.target.value)}
          >
            <option value="one_way">One Way</option>
            <option value="return">Return</option>
          </select>
        </label>
        <label className="field">
          Vehicle category
          <select
            name="category"
            value={selectedCategory}
            onChange={(event) => {
              setCategory(event.target.value);
              setDirty(true);
            }}
            required
            disabled={!enabled || categories.length === 0}
          >
            {categories.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {transfer === "return" && (
          <label className="field">
            Return pickup (UAE)
            <input type="datetime-local" name="return_at" required />
          </label>
        )}
        <label className="field">
          Flight number (optional)
          <input name="flight" maxLength={200} />
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-5 mt-5">
        <label className="field">
          Pickup hotel, address, or landmark (optional)
          <input
            name="pickup_address"
            type="text"
            maxLength={500}
            autoComplete="street-address"
            placeholder="Enter a hotel name, street address, or landmark"
          />
        </label>
        <label className="field">
          Drop-off hotel, address, or landmark (optional)
          <input
            name="dropoff_address"
            type="text"
            maxLength={500}
            autoComplete="street-address"
            placeholder="Enter a hotel name, street address, or landmark"
          />
        </label>
      </div>
      <p className="text-xs text-muted mt-2">
        No map service or API key is needed. Specific address details are added to your enquiry for
        the team to review.
      </p>
      {quoteState.quote?.extras.length ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold mb-3">Optional extras</legend>
          <div className="flex flex-wrap gap-4">
            {quoteState.quote.extras.map((extra) => (
              <label key={extra.id} className="text-sm flex gap-2">
                <input name="extras" value={extra.id} type="checkbox" />
                {extra.name} · {money(Number(extra.price_aed))}{" "}
                {extra.charge_basis === "per_leg" ? "per leg" : "per enquiry"}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {quoteState.error && (
        <p className="notice error mt-6" role="alert">
          {quoteState.error}
        </p>
      )}
      <Button className="mt-6" disabled={!enabled || quoting}>
        {quoting ? "Checking route…" : "Get a route quote"}
        <ArrowRight />
      </Button>
      {dirty && quoteState.quote && (
        <p className="text-sm text-muted mt-4">
          Journey details changed. Request a fresh quote before submitting.
        </p>
      )}
      {showContactForm && (
        <section className="mt-7 pt-7 border-t border-stone-200">
          {quote ? (
            <>
              <div className="flex flex-wrap gap-4 justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Your route quote</h3>
                  <p className="text-xs text-muted mt-2">
                    Base fare {money(Number(quote.base_fare))} · Additional charges{" "}
                    {money(Number(quote.additional_charges))} per leg. Optional extras included where
                    selected.
                  </p>
                </div>
                <p className="text-3xl font-semibold">{money(Number(quote.total_aed))}</p>
              </div>
              <p className="text-sm text-muted mt-3">
                This is a route quote, subject to availability and your confirmed journey details.
              </p>
              <input type="hidden" name="expected_total" value={quote.total_aed} />
            </>
          ) : (
            <div className="notice">
              <h3 className="font-semibold">A manual quote is needed</h3>
              <p className="text-sm mt-2">
                No published fare is available for this route or vehicle type. Send your request
                and our team will review it. No price or availability is promised.
              </p>
            </div>
          )}
          {!canSubmit ? (
            <p className="notice mt-5">
              Please contact our team with these journey details to continue your enquiry.
            </p>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-5 mt-6">
                <label className="field">
                  Your name
                  <input name="name" maxLength={200} autoComplete="name" />
                </label>
                <label className="field">
                  Email
                  <input name="email" type="email" maxLength={254} autoComplete="email" />
                </label>
                <label className="field">
                  Phone
                  <input name="phone" type="tel" minLength={7} maxLength={100} autoComplete="tel" />
                </label>
                <label className="field sm:col-span-3">
                  Journey notes (optional)
                  <textarea name="notes" maxLength={4000} />
                </label>
              </div>
              <div className="hidden" aria-hidden="true">
                <input name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <input type="hidden" name="cf-turnstile-response" value={token} />
              <div ref={captcha} className="mt-5" />
              {captchaError && <p className="notice error">{captchaError}</p>}
              {submitState.error && (
                <p className="notice error mt-5" role="alert">
                  {submitState.error}
                </p>
              )}
              <p className="text-xs text-muted mt-4">
                By sending this enquiry, you allow Hamdi Tourism to contact you about this journey.
                No payment is collected here.
              </p>
              <Button formAction={submitAction} disabled={sending || !token} className="mt-5">
                {sending
                  ? "Sending…"
                  : manualEnquiry
                    ? "Request a manual quote"
                    : "Send transfer enquiry"}
                <ArrowRight />
              </Button>
            </>
          )}
        </section>
      )}
      {canSubmit && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          onReady={() => setCaptchaReady(true)}
          onError={() =>
            setCaptchaError("The security check could not load. Please contact our team.")
          }
        />
      )}
    </form>
  );
}
