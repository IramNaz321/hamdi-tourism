/** Explicitly approved, atomic migration of the verified seven-migration baseline. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { audit, connect, loadEnvironment, projectRef, reference, reportError } from "./common";
const file = "202610120008_driver_tracking.sql";
async function main() {
  loadEnvironment();
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  if (reference(true).migrations[file] !== hash)
    throw new Error("Reviewed driver migration reference does not match.");
  const apply = process.argv.includes("--apply");
  const index = process.argv.indexOf("--approve");
  if (
    apply &&
    (index < 0 || process.argv[index + 1] !== `${projectRef}:driver-tracking:${hash.slice(0, 12)}`)
  )
    throw new Error("Explicit project and migration approval required.");
  const org = z.uuid().parse(process.env.HAMDI_ORGANIZATION_ID);
  const client = await connect();
  try {
    await client.query(apply ? "begin" : "begin read only");
    if (apply)
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended('hamdi-driver-migration',0))",
      );
    await audit(client, false);
    const exists = await client.query(
      "select to_regclass('supabase_migrations.schema_migrations') is not null as exists",
    );
    if (!exists.rows[0].exists) {
      console.error(
        `BLOCKED: Production schema matches the reviewed 001–007 baseline, but its migration ledger is absent. Recording ${projectRef}:baseline requires separate explicit approval; no changes were made.`,
      );
      throw new Error("Approved seven-migration baseline must be recorded first.");
    }
    const versions = (
      await client.query(
        "select version from supabase_migrations.schema_migrations order by version",
      )
    ).rows.map((row) => row.version as string);
    const base = Object.keys(reference(false).migrations)
      .map((name) => name.split("_")[0])
      .sort();
    if (JSON.stringify(versions) !== JSON.stringify(base))
      throw new Error(
        "Migration history must exactly match the verified seven-migration baseline.",
      );
    const owner = await client.query(
      "select 1 from public.staff_members m join auth.users u on u.id=m.user_id where m.organization_id=$1 and m.role='owner' and m.active and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())",
      [org],
    );
    if (!owner.rowCount) throw new Error("Real active confirmed owner must be configured first.");
    if (!apply) {
      console.log(
        `PLAN: apply only ${file} to ${projectRef}. No historical replay or operational seed. Includes scoped driver/GPS/passenger permissions and a private retention worker. Approval target: ${projectRef}:driver-tracking:${hash.slice(0, 12)}`,
      );
      await client.query("rollback");
      return;
    }
    // Outer transaction includes DDL verification and ledger recording atomically.
    await client.query(sql.replace(/^begin;$/m, "").replace(/^commit;$/m, ""));
    await audit(client, true);
    await client.query(
      "insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3)",
      [file.split("_")[0], [], "driver_tracking"],
    );
    await client.query("commit");
    console.log(
      "Approved driver migration verified and committed with its ledger entry. No operational records were seeded.",
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
void main().catch(reportError);
