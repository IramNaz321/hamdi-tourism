import { audit, connect, loadEnvironment, projectRef, reference, reportError } from "./common";
async function main() {
  loadEnvironment();
  const apply = process.argv.includes("--apply");
  const approve = process.argv[process.argv.indexOf("--approve") + 1];
  if (apply && (!process.argv.includes("--approve") || approve !== `${projectRef}:baseline`))
    throw new Error("Explicit baseline approval required.");
  const client = await connect();
  try {
    await client.query(apply ? "begin" : "begin read only");
    if (apply)
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended('hamdi-migration-baseline',0))",
      );
    await audit(client);
    const exists = await client.query(
      "select to_regclass('supabase_migrations.schema_migrations') is not null as exists",
    );
    const existing = exists.rows[0].exists
      ? (await client.query("select version from supabase_migrations.schema_migrations")).rows.map(
          (r) => r.version as string,
        )
      : [];
    const files = Object.keys(reference().migrations).sort();
    const versions = files.map((f) => f.split("_")[0]);
    if (existing.some((v) => !versions.includes(v)))
      throw new Error("Unknown migration history requires review.");
    const pending = files.filter((f) => !existing.includes(f.split("_")[0]));
    if (!apply) {
      console.log(
        `PLAN: ${pending.length} ledger entries need recording for already-matching schema. No migration SQL will be replayed. No changes made.`,
      );
      await client.query("rollback");
      return;
    }
    await client.query("create schema if not exists supabase_migrations");
    await client.query(
      "create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text)",
    );
    for (const file of pending) {
      const [version, ...parts] = file.replace(/\.sql$/, "").split("_");
      await client.query(
        "insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3)",
        [version, [], parts.join("_")],
      );
    }
    await client.query("commit");
    console.log(
      `Recorded ${pending.length} approved baseline entries. Original migration SQL was not replayed; no operational records changed.`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
void main().catch(reportError);
