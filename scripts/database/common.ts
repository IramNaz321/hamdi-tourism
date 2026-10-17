import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { Client } from "pg";
export const projectRef = "hzcupgjphowrzvrdffrf";
export function loadEnvironment() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
}
export function verifiedDatabaseUrl() {
  const value = process.env.SUPABASE_DB_URL;
  if (!value)
    throw new Error(
      "Set SUPABASE_DB_URL securely in this environment; Codespaces secrets are separate.",
    );
  const uri = new URL(value);
  const direct = uri.hostname === `db.${projectRef}.supabase.co`;
  const pooler =
    /^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(uri.hostname) &&
    decodeURIComponent(uri.username).endsWith(`.${projectRef}`);
  if (
    !["postgres:", "postgresql:"].includes(uri.protocol) ||
    (!direct && !pooler) ||
    uri.pathname !== "/postgres"
  )
    throw new Error(
      "Database connection must identify the confirmed Supabase project and postgres database.",
    );
  // Reject URI query overrides of certificate verification / connection routing.
  if ([...uri.searchParams.keys()].some((k) => !["sslmode"].includes(k)))
    throw new Error("Remove database URI query overrides; TLS is enforced by this command.");
  uri.search = "";
  return uri.toString();
}
export async function connect() {
  const client = new Client({
    connectionString: verifiedDatabaseUrl(),
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 15000,
    statement_timeout: 15000,
  });
  await client.connect();
  return client;
}
export type Catalog = Record<string, unknown>;
export type Reference = { migrations: Record<string, string>; catalog: Catalog };
export function reference(
  withDriver = process.argv.includes("--with-driver"),
  withPassenger = process.argv.includes("--with-passenger"),
) {
  const result = JSON.parse(
    readFileSync(
      withPassenger
        ? "supabase/schema-reference-passenger.json"
        : withDriver
          ? "supabase/schema-reference-driver.json"
          : "supabase/schema-reference.json",
      "utf8",
    ),
  ) as Reference;
  const currentFiles = readdirSync("supabase/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort();
  const recordedFiles = Object.keys(result.migrations).sort();
  const extraFiles = currentFiles.filter((file) => !recordedFiles.includes(file));
  if (
    recordedFiles.some((file) => !currentFiles.includes(file)) ||
    extraFiles.some(
      (file) => file.split("_")[0] <= recordedFiles[recordedFiles.length - 1].split("_")[0],
    )
  )
    throw new Error(
      "Migration file set differs from the reviewed reference; update the migration strategy before applying changes.",
    );
  for (const [name, hash] of Object.entries(result.migrations)) {
    if (
      createHash("sha256")
        .update(readFileSync(`supabase/migrations/${name}`))
        .digest("hex") !== hash
    )
      throw new Error(
        "Migration files changed since the schema reference was generated. Review and refresh the local reference first.",
      );
  }
  return result;
}
export async function catalog(client: Client): Promise<Catalog> {
  const result = await client.query(readFileSync("scripts/database/catalog.sql", "utf8"));
  return result.rows[0].catalog;
}
export function compareCatalog(expected: Catalog, actual: Catalog) {
  const mismatches: string[] = [];
  const normalize = (v: unknown) =>
    JSON.stringify(v, (_k, item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
        : item,
    );
  for (const [key, value] of Object.entries(expected))
    if (normalize(actual[key]) !== normalize(value)) mismatches.push(key);
  // Extra permissive policies can broaden access even when all expected policies exist.
  const protectedTables = Object.keys(expected)
    .filter((k) => k.startsWith("table:"))
    .map((k) => `policy:public.${k.slice(6)}.`);
  protectedTables.push("policy:storage.objects.", "policy:realtime.messages.");
  for (const key of Object.keys(actual))
    if (
      key.startsWith("policy:") &&
      !expected[key] &&
      protectedTables.some((t) => key.startsWith(t))
    )
      mismatches.push(key);
  for (const key of Object.keys(actual)) {
    if (!expected[key] && (key.startsWith("function:") || key.startsWith("table:")))
      mismatches.push(key);
  }
  return [...new Set(mismatches)].sort();
}
export async function audit(
  client: Client,
  withDriver = process.argv.includes("--with-driver"),
  withPassenger = process.argv.includes("--with-passenger"),
) {
  const mismatches = compareCatalog(
    reference(withDriver, withPassenger).catalog,
    await catalog(client),
  );
  if (mismatches.length) {
    for (const name of mismatches) console.log(`REVIEW REQUIRED: ${name}`);
    throw new Error(
      "Schema differs from the selected reviewed migration reference. No migration or bootstrap was applied.",
    );
  }
  const bucket = await client.query(
    "select public,file_size_limit,allowed_mime_types from storage.buckets where id='business-media'",
  );
  if (
    bucket.rows.length !== 1 ||
    bucket.rows[0].public !== false ||
    Number(bucket.rows[0].file_size_limit) !== 5242880 ||
    JSON.stringify(bucket.rows[0].allowed_mime_types) !== JSON.stringify(["image/webp"])
  )
    throw new Error("Private media bucket configuration requires review.");
  const realtime = await client.query(
    "select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=any($1::text[]) order by tablename",
    [["bookings", "drivers", "vehicles", "booking_enquiries"]],
  );
  if (realtime.rowCount !== 4) throw new Error("Realtime publication requires review.");
  if (withDriver || withPassenger) {
    const cron = await client.query("select to_regclass('cron.job') is not null as exists");
    if (!cron.rows[0].exists) throw new Error("Tracking retention worker requires configuration.");
    const job = await client.query(
      "select 1 from cron.job where jobname='hamdi-private-tracking-retention' and active and schedule='* * * * *' and command='select public.purge_expired_tracking()' and database=current_database()",
    );
    if (job.rowCount !== 1) throw new Error("Tracking retention worker requires configuration.");
  }
  console.log(
    `PASS: ${projectRef} schema matches ${Object.keys(reference(withDriver, withPassenger).catalog).length} expected catalog objects; private storage and Realtime verified.`,
  );
}
export function reportError() {
  // Driver errors can contain SQL parameters, connection strings or personal data.
  console.error(
    "Operation did not complete. Check secure connection settings, TLS/network access and any REVIEW REQUIRED identifiers above. No automatic retry or migration is performed.",
  );
  process.exitCode = 1;
}
