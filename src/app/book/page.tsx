import { VehicleCategories } from "@/components/vehicle-categories";
import { z } from "zod";
import Link from "next/link";
import { websiteContent, publicBusinessId } from "@/lib/website";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { PassengerProfileForm } from "@/components/passenger-forms";
import { PassengerBookingForm } from "@/components/passenger-booking";
export const dynamic = "force-dynamic";
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>;
}) {
  const parsedPreference = z.uuid().safeParse((await searchParams).vehicle);
  const preference = parsedPreference.success ? parsedPreference.data : undefined;
  const content = await websiteContent();
  let ready = false;
  let signedIn = false;
  let profile: { name: string; email: string; phone: string } | null = null;
  if (isConfigured() && publicBusinessId()) {
    const client = await createClient();
    const [{ data: userResult }, { data: config }] = await Promise.all([
      client.auth.getUser(),
      client.rpc("passenger_booking_configuration", { business_id: publicBusinessId() }),
    ]);
    signedIn = !!userResult.user?.email_confirmed_at;
    if (signedIn) {
      const result = await client.rpc("passenger_profile", { business_id: publicBusinessId() });
      profile = result.error ? null : result.data;
    }
    ready = !!config?.enabled && !!config?.routes?.length;
  }
  return (
    <main className="max-w-4xl mx-auto p-5 py-10 space-y-7">
      <Link href="/" className="brand">
        HAMDI TOURISM
      </Link>
      <h1 className="text-3xl font-semibold">Book your airport transfer</h1>
      <p>
        Choose a published journey and vehicle, review your fare and request your transfer.
        Reservations require confirmation from our team.
      </p>
      <nav className="flex gap-5">
        <Link href="/passenger">Your account</Link>
        <Link href="/#transfers">Transfer enquiry</Link>
      </nav>
      <VehicleCategories fleet={content.fleet} />
      {!ready || !content.fleet.length || !content.locations.length ? (
        <section className="panel p-6 space-y-4">
          <h2 className="text-xl font-semibold">Online booking is currently unavailable</h2>
          <p>
            Published routes, fares and booking policies must be available before we can accept an
            online booking. You can request an enquiry or contact our team.
          </p>
          <Link className="button" href="/#transfers">
            Request a transfer enquiry
          </Link>
        </section>
      ) : !signedIn ? (
        <section className="panel p-6 space-y-4">
          <h2 className="text-xl font-semibold">Verify your passenger account to book securely</h2>
          <p>
            Your account keeps bookings and tracking private. Complete your profile before
            requesting a quote.
          </p>
          <Link
            className="button"
            href={`/passenger/login?next=${encodeURIComponent(preference ? `/book?vehicle=${preference}` : "/book")}`}
          >
            Sign in to book
          </Link>
          <Link className="button secondary" href="/passenger/register">
            Create an account
          </Link>
        </section>
      ) : (
        <>
          <PassengerProfileForm profile={profile} />
          <PassengerBookingForm
            locations={content.locations}
            fleet={content.fleet}
            profile={profile}
            preferredVehicle={preference}
          />
        </>
      )}
    </main>
  );
}
