/** Read-only hosted preflight. Never creates users, writes rows or runs SQL. */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { authPolicy, readOnlyFetch } from "./verification/logic";
import { isServerSupabaseKey } from "../src/lib/supabase/key-validation";
import { publicSupabaseConfig } from "../src/lib/supabase/config";
async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const expected = process.argv[process.argv.indexOf("--project-ref") + 1];
  if (!process.argv.includes("--project-ref") || !/^[a-z]{20}$/.test(expected ?? "")) {
    console.error("Supply --project-ref with the confirmed Supabase project reference.");
    process.exit(1);
  }
  const config = publicSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!config) {
    console.error(
      "Missing or invalid Supabase public environment variables. No hosted checks ran.",
    );
    process.exit(1);
  }
  if (new URL(config.url).hostname !== `${expected}.supabase.co`) {
    console.error("Project reference does not match the configured URL. No hosted checks ran.");
    process.exit(1);
  }
  let failed = false;
  function report(label: string, ok: boolean) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
    if (!ok) failed = true;
  }
  try {
    const response = await readOnlyFetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key },
      signal: AbortSignal.timeout(15000),
    });
    report("Auth endpoint accepts the public key", response.ok);
    if (response.ok) {
      const settings = await response.json();
      const policy = authPolicy(settings, process.env.PASSENGER_AUTH_ENABLED === "true");
      report(
        "Public signup matches the approved application mode",
        policy.signupPolicy === "matches_application_mode",
      );
      report("Email confirmation required", policy.emailConfirmation === "required");
    }
    const publicClient = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: readOnlyFetch },
    });
    // With an anonymous session, even a nonempty organization must expose no private rows.
    for (const table of [
      "drivers",
      "vehicles",
      "bookings",
      "customers",
      "staff_members",
      "business_settings",
    ]) {
      const { data, error } = await publicClient
        .from(table)
        .select(
          table === "staff_members"
            ? "user_id"
            : table === "business_settings"
              ? "organization_id"
              : "id",
        )
        .limit(1);
      report(
        `${table}: anonymous operational reads denied or empty`,
        (!error && data?.length === 0) || error?.code === "42501",
      );
    }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!isServerSupabaseKey(serviceKey)) {
      console.log(
        "NOT VERIFIED: server key, hosted table accessibility, owner membership and private storage (server key missing).",
      );
      failed = true;
    } else {
      const service = createClient(config.url, serviceKey!.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: readOnlyFetch },
      });
      for (const table of [
        "organizations",
        "staff_members",
        "staff_invitations",
        "drivers",
        "vehicles",
        "customers",
        "locations",
        "routes",
        "route_pricing",
        "bookings",
        "business_settings",
        "booking_enquiries",
        "verified_payments",
      ]) {
        const { error } = await service.from(table).select("*", { head: true }).limit(0);
        report(`${table}: table accessible`, !error);
      }
      const org = process.env.HAMDI_ORGANIZATION_ID;
      if (!org || !/^[0-9a-f-]{36}$/i.test(org)) {
        report("Real organization UUID configured", false);
      } else {
        const { data, error } = await service
          .from("staff_members")
          .select("user_id")
          .eq("organization_id", org)
          .eq("role", "owner")
          .eq("active", true)
          .limit(1);
        report(
          "Configured organization has an active owner membership",
          !error && data?.length === 1,
        );
      }
      const { data: bucket, error: bucketError } =
        await service.storage.getBucket("business-media");
      report(
        "Business media storage bucket exists and is private",
        !bucketError && bucket?.public === false,
      );
    }
  } catch {
    console.error(
      "Hosted check could not complete. Verify project availability, credentials and network access.",
    );
    failed = true;
  }
  console.log(
    "This preflight does not verify successful owner sign-in, refresh/logout/recovery, role isolation, RLS definitions, SMTP, Realtime or writes. Complete docs/LAUNCH.md with the real owner.",
  );
  process.exitCode = failed ? 1 : 0;
}
void main();
