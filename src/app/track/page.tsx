import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
export default async function TrackRide({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string }>;
}) {
  const { trip } = await searchParams;
  if (trip && z.uuid().safeParse(trip).success) redirect(`/track/${trip}`);
  return (
    <main className="max-w-xl mx-auto px-5 py-16 space-y-6">
      <BrandLogo />
      <h1 className="text-3xl font-semibold">Track Your Ride</h1>
      <p>
        Open tracking from your verified booking. Driver location is private and available only
        during an eligible trip with location sharing enabled.
      </p>
      <Link className="button" href="/passenger">
        Open your bookings
      </Link>
      <form action="/track" className="panel p-5 space-y-4">
        <label className="field">
          Booking tracking ID
          <input
            name="trip"
            required
            maxLength={36}
            placeholder="ID from your booking tracking link"
          />
        </label>
        {trip && (
          <p role="alert" className="notice error">
            Enter the valid tracking ID from your booking link.
          </p>
        )}
        <button className="button">Open protected tracking</button>
      </form>
      <p className="text-sm text-muted">
        Your account must be authorized for the selected booking. A tracking ID alone does not grant
        access.
      </p>
    </main>
  );
}
