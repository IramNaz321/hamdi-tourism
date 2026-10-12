import { audit, connect, loadEnvironment, reportError } from "./common";
async function main() {
  loadEnvironment();
  const client = await connect();
  try {
    await client.query("begin read only");
    await audit(client);
    const ledger = await client.query(
      "select to_regclass('supabase_migrations.schema_migrations') is not null as exists",
    );
    if (ledger.rows[0].exists) {
      const versions = await client.query(
        "select version from supabase_migrations.schema_migrations order by version",
      );
      console.log(
        `Migration ledger has ${versions.rowCount} entries. Manual SQL application may require an approved baseline; do not rerun migrations.`,
      );
    } else
      console.log(
        "No CLI migration ledger: manual SQL application requires an approved baseline, not replay.",
      );
    await client.query("rollback");
  } finally {
    await client.end();
  }
}
void main().catch(reportError);
