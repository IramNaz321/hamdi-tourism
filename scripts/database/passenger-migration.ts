/** Explicitly approved, atomic migration of the verified eight-migration baseline. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { audit, connect, loadEnvironment, projectRef, reference, reportError } from "./common";
const file = "202610120009_passenger_platform.sql";
async function main() {
  loadEnvironment();
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  if (reference(true, true).migrations[file] !== hash)
    throw new Error("Reviewed passenger migration reference does not match.");
  const apply = process.argv.includes("--apply");
  const index = process.argv.indexOf("--approve");
  if (
    apply &&
    (index < 0 ||
      process.argv[index + 1] !== `${projectRef}:passenger-platform:${hash.slice(0, 12)}`)
  )
    throw new Error("Explicit project and migration approval required.");
  const org = z.uuid().parse(process.env.HAMDI_ORGANIZATION_ID);
  const client = await connect();
  try {
    await client.query(apply ? "begin" : "begin read only");
    if (apply)
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended('hamdi-passenger-migration',0))",
      );
    await audit(client, true, false);
    const exists = await client.query(
      "select to_regclass('supabase_migrations.schema_migrations') is not null as exists",
    );
    if (!exists.rows[0].exists)
      throw new Error("Approved eight-migration baseline must be recorded first.");
    const versions = (
      await client.query(
        "select version from supabase_migrations.schema_migrations order by version",
      )
    ).rows.map((row) => row.version as string);
    const base = Object.keys(reference(true, false).migrations)
      .map((name) => name.split("_")[0])
      .sort();
    if (JSON.stringify(versions) !== JSON.stringify(base))
      throw new Error(
        "Migration history must exactly match the verified eight-migration baseline.",
      );
    const owner = await client.query(
      "select 1 from public.staff_members m join auth.users u on u.id=m.user_id where m.organization_id=$1 and m.role='owner' and m.active and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())",
      [org],
    );
    if (!owner.rowCount) throw new Error("Real active confirmed owner must be configured first.");
    if (!apply) {
      console.log(
        `PLAN: apply only ${file} to ${projectRef}. No historical replay or operational seed. Includes scoped passenger booking/payment/notification/concierge permissions; existing driver retention remains required. Approval target: ${projectRef}:passenger-platform:${hash.slice(0, 12)}`,
      );
      await client.query("rollback");
      return;
    }
    // Outer transaction includes DDL verification and ledger recording atomically.
    await client.query(sql.replace(/^begin;$/m, "").replace(/^commit;$/m, ""));
    await audit(client, true, true);
    await client.query(
      "insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3)",
      [file.split("_")[0], [], "passenger_platform"],
    );
    await client.query("commit");
    console.log(
      "Approved passenger migration verified and committed with its ledger entry. No operational records were seeded.",
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
void main().catch(reportError);
