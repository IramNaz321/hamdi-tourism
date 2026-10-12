import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dateTime } from "@/lib/entities";
import { OperationsMap } from "@/components/operations-map";
import { OperationsUpdates } from "@/components/operations-updates";
export default async function Operations() {
  const { supabase, member } = await requireStaff();
  const { data, count, error } = await supabase
    .from("bookings")
    .select(
      "id,reference,status,pickup_at,end_at,driver_id,vehicle_id,pickup_location_id,dropoff_location_id,flight_number,flight_status,drivers(name,account_status,status),vehicles(name),pickup:locations!bookings_organization_id_pickup_location_id_fkey(id,name,latitude,longitude),dropoff:locations!bookings_organization_id_dropoff_location_id_fkey(id,name,latitude,longitude)",
      { count: "exact" },
    )
    .eq("organization_id", member.organization_id)
    .eq("archived", false)
    .in("status", ["pending", "confirmed", "in_progress"])
    .order("pickup_at")
    .limit(100);
  if (error) throw new Error("Unable to load live operations.");
  // FK-specific aliases disambiguate the two location relationships.
  const records = (data ?? []) as unknown as {
    id: string;
    reference: string;
    status: string;
    pickup_at: string;
    end_at: string | null;
    flight_number: string | null;
    flight_status: string;
    drivers: { name: string; account_status: string; status: string } | null;
    vehicles: { name: string } | null;
    pickup: { id: string; name: string; latitude: number | null; longitude: number | null };
    dropoff: { id: string; name: string; latitude: number | null; longitude: number | null };
  }[];
  const points = [
    ...new Map(
      records
        .flatMap((b) => [b.pickup, b.dropoff])
        .filter((l) => l && l.latitude !== null && l.longitude !== null)
        .map((l) => [
          l.id,
          { id: l.id, name: l.name, latitude: Number(l.latitude), longitude: Number(l.longitude) },
        ]),
    ).values(),
  ];
  return (
    <>
      <p className="eyebrow mb-3">OPERATIONS</p>
      <h1 className="text-3xl font-semibold mb-3">Live operations</h1>
      <p className="text-sm text-muted mb-6">
        Follow real journey statuses and assignments. Flight statuses are manually recorded. No
        driver GPS positions are shown.
      </p>
      <OperationsUpdates organizationId={member.organization_id} />
      <section className="panel overflow-hidden mt-6">
        {records.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Journey</th>
                  <th>Route</th>
                  <th>Scheduled interval · UAE</th>
                  <th>Assignment</th>
                  <th>Status</th>
                  <th>Flight · manual</th>
                </tr>
              </thead>
              <tbody>
                {records.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/admin/bookings/${b.id}`} className="font-semibold">
                        {b.reference}
                      </Link>
                    </td>
                    <td>
                      {b.pickup.name} → {b.dropoff.name}
                    </td>
                    <td>
                      {dateTime(b.pickup_at)}
                      <br />
                      {b.end_at ? dateTime(b.end_at) : "End time not recorded"}
                    </td>
                    <td>
                      {b.drivers?.name ?? "Driver unassigned"}
                      {b.drivers?.account_status === "inactive" && (
                        <p className="text-xs text-red-700">
                          Driver access inactive · review assignment
                        </p>
                      )}
                      <br />
                      {b.vehicles?.name ?? "Vehicle unassigned"}
                    </td>
                    <td>
                      <span className="badge">{b.status.replaceAll("_", " ")}</span>
                    </td>
                    <td>
                      {b.flight_number ?? "—"}
                      <br />
                      {b.flight_status.replaceAll("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <h2 className="font-semibold">No open journeys</h2>
            <p className="text-sm text-muted mt-3">
              Confirmed bookings and active trips will appear here.
            </p>
          </div>
        )}
      </section>
      <p className="text-xs text-muted mt-4">
        Showing {records.length} of {count ?? 0} open journeys. Use Bookings for the complete
        searchable list.
      </p>
      <OperationsMap points={points} />
    </>
  );
}
