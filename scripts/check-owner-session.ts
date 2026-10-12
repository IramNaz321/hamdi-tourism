/** Read-only acceptance of a genuine existing owner session; never writes records. */
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "../src/lib/supabase/config";
import { loadEnvironment, projectRef, reportError } from "./database/common";
async function main() {
  loadEnvironment();
  const config = publicSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const token = process.env.HAMDI_OWNER_ACCESS_TOKEN;
  if (!config || new URL(config.url).hostname !== `${projectRef}.supabase.co` || !token)
    throw new Error("Configure real owner session securely.");
  const client = createClient(config.url, config.key, {
    accessToken: async () => token,
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const identity = await client.auth.getUser(token);
  if (identity.error || !identity.data.user)
    throw new Error("Invalid or expired real owner session.");
  const membership = await client
    .from("staff_members")
    .select("role,active,organization_id")
    .eq("user_id", identity.data.user.id)
    .single();
  if (membership.error || membership.data.role !== "owner" || !membership.data.active)
    throw new Error("Active owner membership required.");
  if (process.env.HAMDI_ORGANIZATION_ID !== membership.data.organization_id)
    throw new Error("Website organization does not match owner membership.");
  console.log("PASS: genuine authenticated owner and website organization verified.");
  for (const table of [
    "drivers",
    "vehicles",
    "bookings",
    "customers",
    "locations",
    "routes",
    "route_pricing",
    "staff_members",
    "staff_invitations",
    "business_settings",
  ]) {
    const { error } = await client.from(table).select("*", { head: true }).limit(0);
    if (error) throw new Error("Owner read denied.");
    console.log(`PASS: authenticated owner read on ${table}`);
  }
  const { data, error } = await client.rpc("dashboard_summary");
  if (
    error ||
    !data ||
    [
      "total_bookings",
      "today_bookings",
      "active_trips",
      "available_drivers",
      "registered_vehicles",
      "verified_revenue",
    ].some((k) => typeof data[k] !== "number")
  )
    throw new Error("Dashboard query failed.");
  console.log(
    "PASS: dashboard returns actual numeric totals. No business records created or modified.",
  );
  console.log(
    "Browser sign-in/out, recovery delivery and real CRUD writes remain separate acceptance checks.",
  );
}
void main().catch(reportError);
