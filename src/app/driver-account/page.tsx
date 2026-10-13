import { logout } from "@/app/auth/actions";
import { requireDriver } from "@/lib/driver";
import { DriverRefresh, DriverTripCard, type DriverTrip } from "@/components/driver-trip";
export const dynamic = "force-dynamic";
export default async function DriverAccount() {
  const { supabase, member } = await requireDriver();
  const { data, error } = await supabase.rpc("driver_assigned_trips");
  const trips = Array.isArray(data) ? (data as DriverTrip[]) : null;
  return (
    <main className="max-w-3xl mx-auto px-5 py-10">
      <div className="flex flex-wrap justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow">HAMDI TOURISM</p>
          <h1 className="text-3xl font-semibold mt-3">Your trips</h1>
          <p className="text-muted mt-2">{member.display_name}</p>
        </div>
        <form action={logout}>
          <button className="button secondary">Sign out</button>
        </form>
      </div>
      <DriverRefresh />
      <div className="space-y-6 mt-6">
        {error || !trips ? (
          <section className="panel p-6" role="alert">
            <h2 className="font-semibold">Trips are currently unavailable</h2>
            <p className="text-muted text-sm mt-3">
              Contact your dispatcher for assignments and pickup instructions.
            </p>
          </section>
        ) : trips.length ? (
          trips.map((trip) => <DriverTripCard key={trip.id} trip={trip} />)
        ) : (
          <section className="panel p-8">
            <h2 className="font-semibold">No assigned trips</h2>
            <p className="text-muted text-sm mt-3">Your confirmed assignments will appear here.</p>
          </section>
        )}
      </div>
    </main>
  );
}
