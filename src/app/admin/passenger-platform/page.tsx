import { requireStaff } from "@/lib/auth";
import { PlatformConfiguration, RouteConfiguration } from "@/components/passenger-configuration";
export default async function Page() {
  const { supabase, member } = await requireStaff();
  if (!["owner", "manager"].includes(member.role)) return <p>Owner or manager access required.</p>;
  const { data, error } = await supabase.rpc("admin_passenger_configuration");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Passenger booking configuration</h1>
      <p>
        Provide genuine route durations and approved policies. No fleet availability or reservations
        are guaranteed by publishing these settings.
      </p>
      {error ? (
        <p role="alert" className="notice error">
          Passenger configuration is unavailable. Verify the approved database rollout before
          editing.
        </p>
      ) : (
        <>
          {member.role === "owner" && <PlatformConfiguration settings={data.settings} />}
          <div className="grid lg:grid-cols-2 gap-5">
            {data.routes.map(
              (r: {
                id: string;
                name: string;
                minutes: number | null;
                return_minutes: number | null;
                enabled: boolean;
              }) => (
                <RouteConfiguration key={r.id} route={r} />
              ),
            )}
          </div>
          {!data.routes.length && (
            <p>No active routes configured. Create real routes in Route Management first.</p>
          )}
        </>
      )}
    </div>
  );
}
