/** Apply only the reviewed additive manual-enquiry migration after explicit owner approval. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { audit, connect, loadEnvironment, projectRef, reference, reportError } from "./common";

const file = "202610120011_unpriced_transfer_enquiries.sql";

async function main() {
  loadEnvironment();
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  if (reference(true, true, true, true).migrations[file] !== hash)
    throw new Error("Reviewed unpriced-enquiry migration reference does not match.");
  const apply = process.argv.includes("--apply");
  const index = process.argv.indexOf("--approve");
  if (
    apply &&
    (index < 0 ||
      process.argv[index + 1] !== `${projectRef}:unpriced-enquiries:${hash.slice(0, 12)}`)
  )
    throw new Error("Explicit project and migration approval required.");

  const client = await connect();
  try {
    await client.query(apply ? "begin" : "begin read only");
    if (apply)
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended('hamdi-unpriced-enquiry-migration',0))",
      );
    await audit(client, true, true, true);
    const exists = await client.query(
      "select to_regclass('supabase_migrations.schema_migrations') is not null as exists",
    );
    if (!exists.rows[0].exists)
      throw new Error("Approved ten-migration baseline must be recorded first.");
    const versions = (
      await client.query(
        "select version from supabase_migrations.schema_migrations order by version",
      )
    ).rows.map((row) => row.version as string);
    const baseline = Object.keys(reference(true, true, true).migrations)
      .map((name) => name.split("_")[0])
      .sort();
    if (JSON.stringify(versions) !== JSON.stringify(baseline))
      throw new Error("Migration history must exactly match the verified 001–010 baseline.");
    if (!apply) {
      console.log(
        `PLAN: apply only ${file} to ${projectRef}. Exact SHA-256: ${hash}. No booking, location, fare, vehicle, driver, seed or email data will be created. Approval target: ${projectRef}:unpriced-enquiries:${hash.slice(0, 12)}`,
      );
      await client.query("rollback");
      return;
    }
    await client.query(sql.replace(/^begin;$/m, "").replace(/^commit;$/m, ""));
    await audit(client, true, true, true, true);
    await client.query(
      "insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3)",
      [file.split("_")[0], [], "unpriced_transfer_enquiries"],
    );
    await client.query("commit");
    console.log("Approved unpriced-enquiry migration verified and recorded. No emails were sent.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch(reportError);
