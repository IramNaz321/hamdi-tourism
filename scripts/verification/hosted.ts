/** READ ONLY: no apply flag, no hosted DDL/DML, no Auth sign-in/invitations or provider calls. */
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { z } from "zod";
import {
  catalog,
  loadEnvironment,
  projectRef,
  reference,
  verifiedDatabaseUrl,
} from "../database/common";
import { publicSupabaseConfig } from "../../src/lib/supabase/config";
import { isServerSupabaseKey } from "../../src/lib/supabase/key-validation";
import { configuredSiteOrigin } from "../../src/lib/site-origin";
import {
  authPolicy,
  compareStages,
  migrationPlan,
  safeFailure,
  readOnlyFetch,
  safeMembership,
  type Stage,
} from "./logic";
const ownerId = "988e629b-6770-4b93-b9ba-7c1bce325680";
function report(scope: string, findings: unknown) {
  console.log(JSON.stringify({ scope, findings }, null, 2));
}
async function databaseAudit(stages: Stage[]) {
  if (!process.env.SUPABASE_DB_URL) {
    report("database", {
      status: "blocked",
      category: "configuration",
      missing: "SUPABASE_DB_URL",
      reason:
        "A secure PostgreSQL connection for the confirmed project is required. Codespaces secrets do not propagate here.",
    });
    return false;
  }
  let uri: string;
  try {
    uri = verifiedDatabaseUrl();
  } catch {
    report("database", {
      status: "blocked",
      category: "configuration",
      reason:
        "SUPABASE_DB_URL must identify the confirmed project and postgres database without URI overrides. No connection attempted.",
    });
    return false;
  }
  const client = new Client({
    connectionString: uri,
    ssl: { rejectUnauthorized: true },
    options: "-c default_transaction_read_only=on",
    connectionTimeoutMillis: 15000,
    statement_timeout: 15000,
    application_name: "hamdi-read-only-verification",
  });
  try {
    await client.connect();
    await client.query("begin isolation level repeatable read read only");
    const mode = await client.query("show transaction_read_only");
    if (mode.rows[0].transaction_read_only !== "on")
      throw new Error("Read-only enforcement failed");
    const actual = await catalog(client);
    const matches = compareStages(actual, stages);
    const existence = await client.query(
      "select to_regclass('supabase_migrations.schema_migrations') is not null as exists",
    );
    const ledger = existence.rows[0].exists
      ? (
          await client.query(
            "select version from supabase_migrations.schema_migrations order by version",
          )
        ).rows.map((row) => String(row.version))
      : null;
    // Never persist or print raw catalog definitions, Auth contacts or operational rows.
    report("schema", {
      status: "read_only_connection_succeeded",
      publicTables: Object.keys(actual).filter((k) => k.startsWith("table:")).length,
      migrationLedger:
        ledger === null
          ? "absent"
          : ledger.map((version) =>
              /^\d{12,14}$/.test(version) ? version : "unrecognized_version_redacted",
            ),
      comparisons: matches.map((m) => ({
        version: m.version,
        expectedPublicTables: m.tableCount,
        exactMatch: m.differences.length === 0,
        differenceCount: m.differences.length,
      })),
      plan: migrationPlan(matches, ledger, stages),
    });
    const org = z.uuid().safeParse(process.env.HAMDI_ORGANIZATION_ID);
    const user = await client.query(
      "select email_confirmed_at is not null as confirmed,deleted_at is not null as deleted,(banned_until is not null and banned_until>now()) as banned from auth.users where id=$1",
      [ownerId],
    );
    const membership = await client.query(
      "select role,active,case when $2::uuid is null then null else organization_id=$2::uuid end as matches_configured_org from public.staff_members where user_id=$1",
      [ownerId, org.success ? org.data : null],
    );
    const organization = org.success
      ? (
          await client.query(
            "select exists(select 1 from public.organizations where id=$1) as exists,exists(select 1 from public.staff_members m join auth.users u on u.id=m.user_id where m.organization_id=$1 and m.role='owner' and m.active and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())) as has_eligible_owner",
            [org.data],
          )
        ).rows[0]
      : null;
    report("owner", {
      targetUserId: ownerId,
      userExists: user.rowCount === 1,
      authState: user.rows[0] ?? null,
      membership: safeMembership(membership.rows[0]),
      configuredOrganization: organization,
      clientOwnerAuthorization: "still_requires_explicit_client_confirmation",
      permissionChanges: "none",
    });
    const bucket = (
      await client.query(
        "select public,file_size_limit,allowed_mime_types from storage.buckets where id='business-media'",
      )
    ).rows[0];
    const publication = (
      await client.query(
        "select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=any($1::text[]) order by tablename",
        [["bookings", "drivers", "vehicles", "booking_enquiries"]],
      )
    ).rows.map((r) => r.tablename);
    const cronExists = (await client.query("select to_regclass('cron.job') is not null as exists"))
      .rows[0].exists;
    const worker = cronExists
      ? (
          await client.query(
            "select count(*)::int as count from cron.job where jobname='hamdi-private-tracking-retention' and active and schedule='* * * * *' and command='select public.purge_expired_tracking()' and database=current_database()",
          )
        ).rows[0].count === 1
      : false;
    report("infrastructure", {
      privateMediaBucket:
        !!bucket &&
        bucket.public === false &&
        Number(bucket.file_size_limit) === 5242880 &&
        JSON.stringify(bucket.allowed_mime_types) === JSON.stringify(["image/webp"]),
      operationalPublicationTables: publication,
      trackingRetentionWorker: worker,
      hostedSessionAndBrokerBehavior: "not_verified",
    });
    await client.query("rollback");
    const exact = matches.find((m) => m.differences.length === 0);
    const owner = user.rows[0];
    const member = membership.rows[0];
    return (
      !!exact &&
      migrationPlan(matches, ledger, stages).status !== "blocked" &&
      !!owner?.confirmed &&
      !owner.deleted &&
      !owner.banned &&
      member?.role === "owner" &&
      member?.active === true &&
      member?.matches_configured_org === true &&
      !!organization?.exists &&
      !!organization?.has_eligible_owner &&
      !!bucket &&
      bucket.public === false &&
      publication.length === 4 &&
      (exact.version === 7 || worker)
    );
  } catch (error) {
    report("database", { status: "incomplete", ...safeFailure(error) });
    return false;
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end().catch(() => {});
  }
}
async function apiAudit() {
  const config = publicSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!config || new URL(config.url).hostname !== `${projectRef}.supabase.co`) {
    report("api", {
      status: "blocked",
      category: "configuration",
      reason:
        "Valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the confirmed project are unavailable. No API request attempted.",
    });
    return false;
  }
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) {
      report("api", {
        status: "failed",
        category: [401, 403].includes(response.status)
          ? "authentication"
          : response.status >= 500
            ? "provider"
            : "configuration",
        httpStatus: response.status,
      });
      return false;
    }
    const policy = authPolicy(await response.json(), process.env.PASSENGER_AUTH_ENABLED === "true");
    report("auth", {
      publicEndpoint: "reachable",
      ...policy,
      privateSettings:
        "SMTP, Site URL, redirect allowlist, CAPTCHA, password policy and abuse limits require separate authorized configuration verification; public settings do not certify them.",
    });
    const client = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: readOnlyFetch },
    });
    let privateReadsSafe = true;
    for (const table of [
      "drivers",
      "vehicles",
      "bookings",
      "customers",
      "staff_members",
      "business_settings",
      "trip_live_locations",
      "passenger_profiles",
      "passenger_quotes",
      "payment_attempts",
      "passenger_notification_outbox",
    ]) {
      const { data, error } = await client
        .from(table)
        .select(
          table === "staff_members" || table === "passenger_profiles"
            ? "user_id"
            : table === "business_settings"
              ? "organization_id"
              : table === "trip_live_locations"
                ? "booking_id"
                : "id",
        )
        .limit(1);
      const outcome =
        error?.code === "42501"
          ? "denied"
          : !error && data?.length === 0
            ? "empty"
            : !error
              ? "private_rows_exposed"
              : error?.code === "42P01" || error?.code === "PGRST205"
                ? "not_installed_or_not_exposed"
                : "not_verified";
      if (!["denied", "empty"].includes(outcome)) privateReadsSafe = false;
      report("anonymous_privacy", { table, outcome });
    }
    if (isServerSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      const service = createClient(config.url, process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: readOnlyFetch },
      });
      const { data, error } = await service.auth.admin.getUserById(ownerId);
      report("owner_api", {
        targetUserId: ownerId,
        status: error ? "not_verified" : "read_succeeded",
        userExists: !!data?.user,
        confirmed: !!data?.user?.email_confirmed_at,
      });
      const { data: organizations, error: organizationError } = await service
        .from("organizations")
        .select("id")
        .limit(100);
      report("organization_api", {
        status: organizationError ? "not_verified" : "read_succeeded",
        organizationIds: organizationError
          ? null
          : (organizations ?? []).map((row) =>
              z.uuid().safeParse(row.id).success ? row.id : "invalid_identifier_redacted",
            ),
        truncated: organizations?.length === 100,
      });
      const schemaResponse = await readOnlyFetch(config.url + "/rest/v1/", {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
          Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
        },
      });
      if (schemaResponse.ok) {
        const schema = await schemaResponse.json();
        const expectedNames = Object.keys(reference(true, true, true).catalog)
          .filter((key) => key.startsWith("table:"))
          .map((key) => key.slice(6));
        const exposed = Object.keys(schema.definitions ?? {}).filter((name) =>
          expectedNames.includes(name),
        );
        report("exposed_api_schema", {
          recognizedPublicTables: exposed,
          recognizedCount: exposed.length,
          missingExpectedTables: expectedNames.filter((name) => !exposed.includes(name)),
          fullPostgresqlCatalog:
            "not_verified; API definitions cannot prove all SQL constraints, functions, indexes, RLS or migration history",
        });
      }
      const { data: member, error: memberError } = await service
        .from("staff_members")
        .select("role,active")
        .eq("user_id", ownerId)
        .maybeSingle();
      report("membership_api", {
        status: memberError ? "not_verified" : "read_succeeded",
        membership: safeMembership(member),
      });
    } else
      report("owner_api", {
        status: "not_verified",
        reason:
          "Valid server-only Supabase key unavailable; SQL audit is sufficient for inspecting the specified user's database state.",
      });
    return (
      privateReadsSafe &&
      policy.signupPolicy === "matches_application_mode" &&
      policy.emailConfirmation === "required"
    );
  } catch (error) {
    report("api", { status: "incomplete", ...safeFailure(error) });
    return false;
  }
}
async function main() {
  loadEnvironment();
  const stages: Stage[] = [
    { version: 7, reference: reference(false, false) },
    { version: 8, reference: reference(true, false) },
    { version: 9, reference: reference(true, true) },
    { version: 10, reference: reference(true, true, true) },
  ];
  const origin = configuredSiteOrigin(process.env);
  report("configuration", {
    project: projectRef,
    databaseBinding: process.env.SUPABASE_DB_URL ? "present_not_yet_validated" : "missing",
    publicConnection: publicSupabaseConfig(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    )
      ? "structurally_valid"
      : "missing_or_invalid",
    serverKey: isServerSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY)
      ? "structurally_valid"
      : "missing_or_invalid",
    organizationId: z.uuid().safeParse(process.env.HAMDI_ORGANIZATION_ID).success
      ? "valid_identifier_not_yet_verified"
      : "missing_or_invalid",
    siteOrigin: !origin
      ? "invalid_or_missing"
      : origin.startsWith("https://")
        ? "https_configured_not_hosted_verified"
        : "local_development_only",
  });
  const outcomes = await Promise.all([databaseAudit(stages), apiAudit()]);
  report("summary", {
    readOnly: true,
    hostedChecksComplete: outcomes.every(Boolean),
    productionReady: false,
    reason:
      "Connectivity/catalog evidence alone never certifies actual Auth sessions, Owner authority, business workflows or production launch.",
  });
  if (!outcomes.every(Boolean)) process.exitCode = 1;
}
void main().catch((error) => {
  report("verification", { status: "incomplete", ...safeFailure(error) });
  process.exitCode = 1;
});
