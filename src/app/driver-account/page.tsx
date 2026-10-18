import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { driverText } from "@/lib/driver-copy";
import { uaeDay } from "@/lib/tracking";
import { DriverAvailability } from "@/components/driver-availability";
import { logout } from "@/app/auth/actions";
import { requireDriver } from "@/lib/driver";
import { DriverRefresh, DriverTripCard, type DriverTrip } from "@/components/driver-trip";
export const dynamic = "force-dynamic";
export default async function DriverAccount({
  searchParams,
}: {
  searchParams: Promise<{ history_page?: string; trip_page?: string }>;
}) {
  const { supabase, member } = await requireDriver();
  const query = await searchParams;
  const historyPage = Math.min(10000, Math.max(1, parseInt(query.history_page ?? "1", 10) || 1));
  const tripPage = Math.min(10000, Math.max(1, parseInt(query.trip_page ?? "1", 10) || 1));
  const [{ data, error }, profile, history, active] = await Promise.all([
    supabase.rpc("driver_assigned_trips", { page_number: tripPage, trip_scope: "all" }),
    supabase.rpc("driver_profile"),
    supabase.rpc("driver_trip_history", { page_number: historyPage }),
    supabase.rpc("driver_assigned_trips", { page_number: 1, trip_scope: "active" }),
  ]);
  const completed = Array.isArray(history.data)
    ? (history.data as {
        reference: string;
        pickup: string;
        destination: string;
        pickup_at: string;
        completed_at: string | null;
      }[])
    : null;
  const today = uaeDay(new Date());
  const trips =
    !profile.error && profile.data?.version === 2 && Array.isArray(data)
      ? (data as DriverTrip[])
      : null;
  return (
    <main className="max-w-3xl mx-auto px-5 py-10" dir="auto">
      <div className="flex flex-wrap justify-between gap-4 mb-8">
        <div>
          <BrandLogo />
          <h1 className="text-3xl font-semibold mt-3">{driverText.title}</h1>
          <p className="text-muted mt-2">{member.display_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link className="button secondary" href="/">
            Home
          </Link>
          <form action={logout}>
            <button className="button secondary">Sign out</button>
          </form>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <DriverRefresh />
        <Link className="button secondary" href="/reset-password">
          Change password
        </Link>
      </div>
      {!profile.error && profile.data?.availability && (
        <div className="mt-6">
          <DriverAvailability
            status={profile.data.availability}
            availableNow={profile.data.available_now === true}
          />
        </div>
      )}
      {!active.error && Array.isArray(active.data) && active.data.length > 0 && (
        <section className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold">{driverText.active}</h2>
          {(active.data as DriverTrip[]).map((trip) => (
            <DriverTripCard key={trip.id} trip={trip} />
          ))}
        </section>
      )}
      <div className="space-y-6 mt-6">
        {error || !trips ? (
          <section className="panel p-6" role="alert">
            <h2 className="font-semibold">Trips are currently unavailable</h2>
            <p className="text-muted text-sm mt-3">
              Contact your dispatcher for assignments and pickup instructions.
            </p>
          </section>
        ) : trips.length ? (
          [
            { key: "today", title: driverText.today },
            { key: "upcoming", title: driverText.upcoming },
          ].map((group) => {
            const entries = trips.filter((trip) =>
              trip.status === "in_progress" || trip.en_route_at || trip.handover_at
                ? false
                : uaeDay(trip.pickup_at) <= today
                  ? group.key === "today"
                  : group.key === "upcoming",
            );
            return entries.length ? (
              <section key={group.key} className="space-y-4">
                <h2 className="text-xl font-semibold">{group.title}</h2>
                {entries.map((trip) => (
                  <DriverTripCard key={trip.id} trip={trip} />
                ))}
              </section>
            ) : null;
          })
        ) : (
          <section className="panel p-8">
            <h2 className="font-semibold">No assignments on this page</h2>
            <p className="text-muted text-sm mt-3">Your confirmed assignments will appear here.</p>
          </section>
        )}
      </div>
      <div className="flex gap-4 mt-4">
        {tripPage > 1 && (
          <Link
            className="button secondary"
            href={`/driver-account?trip_page=${tripPage - 1}&history_page=${historyPage}`}
          >
            Previous assignments
          </Link>
        )}
        {trips?.length === 100 && tripPage < 10000 && (
          <Link
            className="button secondary"
            href={`/driver-account?trip_page=${tripPage + 1}&history_page=${historyPage}`}
          >
            More assignments
          </Link>
        )}
      </div>
      <section className="panel p-5 mt-6">
        <h2 className="font-semibold">{driverText.history}</h2>
        {history.error || !completed ? (
          <p className="notice mt-3">Trip history is currently unavailable.</p>
        ) : completed.length ? (
          <ul className="divide-y mt-3">
            {completed.map((trip) => (
              <li key={trip.reference} className="py-4 text-sm">
                <p className="font-semibold">
                  {trip.reference} · {trip.pickup} → {trip.destination}
                </p>
                <p>
                  {trip.completed_at
                    ? new Date(trip.completed_at).toLocaleString("en-AE", {
                        timeZone: "Asia/Dubai",
                      }) + " · UAE"
                    : "Completion time not recorded"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mt-3">No completed trips on this page.</p>
        )}
        <div className="flex gap-4 mt-4">
          {historyPage > 1 && (
            <Link
              className="button secondary"
              href={`/driver-account?history_page=${historyPage - 1}`}
            >
              Previous
            </Link>
          )}
          {completed?.length === 20 && historyPage < 10000 && (
            <Link
              className="button secondary"
              href={`/driver-account?history_page=${historyPage + 1}`}
            >
              Next
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
