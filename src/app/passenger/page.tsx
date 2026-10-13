import Link from "next/link";
import { requirePassenger, type PassengerBooking } from "@/lib/passenger";
import { PassengerProfileForm } from "@/components/passenger-forms";
import { passengerLogout } from "./actions";
export const dynamic = "force-dynamic";
export default async function PassengerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { supabase, organizationId } = await requirePassenger();
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  const [profileResult, bookingResult, notices] = await Promise.all([
    supabase.rpc("passenger_profile", { business_id: organizationId }),
    supabase.rpc("passenger_bookings", { business_id: organizationId, page_number: page }),
    supabase.rpc("passenger_notifications"),
  ]);
  const bookings = (bookingResult.data ?? []) as PassengerBooking[];
  const future = bookings.filter((b) => !["completed", "cancelled"].includes(b.status));
  const history = bookings.filter((b) => ["completed", "cancelled"].includes(b.status));
  return (
    <main className="max-w-5xl mx-auto p-5 py-10 space-y-8" dir="auto">
      <header className="flex justify-between gap-4 flex-wrap">
        <div>
          <Link href="/" className="brand">
            HAMDI<span>TOURISM</span>
          </Link>
          <h1 className="text-3xl font-semibold mt-6">Your journeys</h1>
        </div>
        <form action={passengerLogout}>
          <button className="button secondary">Sign out</button>
        </form>
      </header>
      <Link href="/book" className="button">
        Book a transfer
      </Link>
      {(profileResult.error || bookingResult.error || notices.error) && (
        <p role="alert" className="notice error">
          Your account information could not be fully loaded. Retry or contact support.
        </p>
      )}
      <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
        <PassengerProfileForm profile={profileResult.data} />
        <div className="space-y-6">
          {[
            ["Upcoming and active journeys", future],
            ["Completed and cancelled journeys", history],
          ].map(([title, rows]) => (
            <section key={String(title)} className="panel p-5 space-y-4">
              <h2 className="text-xl font-semibold">{String(title)}</h2>
              {!bookingResult.error && (rows as PassengerBooking[]).length === 0 && (
                <p className="text-muted">No journeys in this part of your history.</p>
              )}
              {(rows as PassengerBooking[]).map((b) => (
                <Link
                  className="block border rounded-lg p-4"
                  key={b.id}
                  href={`/passenger/bookings/${b.id}`}
                >
                  <p className="font-semibold">
                    {b.reference} · {b.status.replaceAll("_", " ")}
                  </p>
                  <p>
                    {b.pickup} → {b.destination}
                  </p>
                  <p>
                    {new Date(b.pickup_at).toLocaleString("en-AE", { timeZone: "Asia/Dubai" })} UAE
                    · AED {Number(b.price_aed).toFixed(2)}
                  </p>
                </Link>
              ))}
            </section>
          ))}
          <div className="flex gap-5">
            {page > 1 && <Link href={`/passenger?page=${page - 1}`}>Previous</Link>}
            {bookings.length === 20 && page < 10000 && (
              <Link href={`/passenger?page=${page + 1}`}>More journeys</Link>
            )}
          </div>
        </div>
      </div>
      <section className="panel p-5 space-y-3">
        <h2 className="font-semibold">Updates</h2>
        {!notices.error && !notices.data?.length && <p>No booking updates yet.</p>}
        {(notices.data ?? []).map(
          (n: {
            kind: string;
            at: string;
            booking_id: string;
            reference: string;
            email_status: string;
          }) => (
            <p key={`${n.booking_id}:${n.kind}:${n.at}`}>
              <Link href={`/passenger/bookings/${n.booking_id}`}>{n.reference}</Link> ·{" "}
              {n.kind.replaceAll("_", " ")} ·{" "}
              {new Date(n.at).toLocaleString("en-AE", { timeZone: "Asia/Dubai" })} · Email:{" "}
              {n.email_status}
            </p>
          ),
        )}
      </section>
    </main>
  );
}
