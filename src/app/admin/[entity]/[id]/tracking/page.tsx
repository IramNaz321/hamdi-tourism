import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { LiveTracking } from "@/components/live-tracking";
import { TrackingAccess } from "@/components/tracking-access";
export default async function AdminTracking({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (entity !== "bookings" || !z.uuid().safeParse(id).success) notFound();
  const { supabase, member } = await requireStaff();
  const { data, error } = await supabase
    .from("bookings")
    .select("id,reference")
    .eq("id", id)
    .eq("organization_id", member.organization_id)
    .maybeSingle();
  if (error) throw new Error("Unable to verify journey access.");
  if (!data) notFound();
  const events = await supabase.rpc("driver_trip_audit", { trip_id: id });
  const history = Array.isArray(events.data)
    ? (events.data as {
        id: number;
        event: string;
        created_at: string;
        driver_name: string;
        actor_name: string | null;
      }[])
    : null;
  return (
    <>
      <h1 className="text-3xl font-semibold mb-6">Tracking · {data.reference}</h1>
      <LiveTracking tripId={id} />
      <section className="panel p-5 mt-6">
        <h2 className="font-semibold">Driver trip audit history</h2>
        {events.error || !history ? (
          <p className="notice mt-3">Driver audit history is currently unavailable.</p>
        ) : history.length ? (
          <ol className="divide-y mt-3">
            {history.map((event) => (
              <li key={event.id} className="py-3 text-sm">
                <p>
                  {event.event.replaceAll("_", " ")} · {event.driver_name} ·{" "}
                  {event.actor_name ?? "Actor name not recorded"}
                </p>
                <p className="text-muted">
                  {new Date(event.created_at).toLocaleString("en-AE", { timeZone: "Asia/Dubai" })} ·
                  UAE
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted mt-3">No driver trip actions recorded.</p>
        )}
      </section>
      {member.role === "owner" && <TrackingAccess tripId={id} />}
    </>
  );
}
