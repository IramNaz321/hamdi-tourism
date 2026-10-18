/** Explicitly approved, additive owner-email migration after the verified 009 baseline. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { audit, connect, loadEnvironment, projectRef, reference, reportError } from "./common";
const file = "202610120010_owner_booking_notifications.sql";

async function main() {
  loadEnvironment();
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  if (reference(true, true, true).migrations[file] !== hash)
    throw new Error("Reviewed owner-notification migration reference does not match.");
  const apply = process.argv.includes("--apply");
  const index = process.argv.indexOf("--approve");
  if (
    apply &&
    (index < 0 ||
      process.argv[index + 1] !==
        `${projectRef}:owner-booking-notifications:${hash.slice(0, 12)}`)
  )
    throw new Error("Explicit project and migration approval required.");

  const client = await connect();
  try {
    await client.query(apply ? "begin" : "begin read only");
    if (apply)
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended('hamdi-owner-notification-migration',0))",
      );
    await audit(client, true, true);
    const exists = await client.query(
      "select to_regclass('supabase_migrations.schema_migrations') is not null as exists",
    );
    if (!exists.rows[0].exists)
      throw new Error("Approved nine-migration baseline must be recorded first.");
    const versions = (
      await client.query(
        "select version from supabase_migrations.schema_migrations order by version",
      )
    ).rows.map((row) => row.version as string);
    const baseline = Object.keys(reference(true, true).migrations)
      .map((name) => name.split("_")[0])
      .sort();
    if (JSON.stringify(versions) !== JSON.stringify(baseline))
      throw new Error("Migration history must exactly match the verified nine-migration baseline.");
    if (!apply) {
      console.log(
        `PLAN: apply only ${file} to ${projectRef}. Exact SHA-256: ${hash}. No historical replay, existing-booking notification replay, or operational seed. Approval target: ${projectRef}:owner-booking-notifications:${hash.slice(0, 12)}`,
      );
      await client.query("rollback");
      return;
    }
    await client.query(sql.replace(/^begin;$/m, "").replace(/^commit;$/m, ""));
    await audit(client, true, true, true);
    await client.query(
      "insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3)",
      [file.split("_")[0], [], "owner_booking_notifications"],
    );
    await client.query("commit");
    console.log(
      "Approved owner-notification migration verified and committed with its ledger entry. No email was sent during migration.",
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch(reportError);
