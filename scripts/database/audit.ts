import { readMigrationHistory } from "./migration-history";
import { audit, connect, loadEnvironment, reportError } from "./common";
async function main() {
  loadEnvironment();
  const client = await connect();
  try {
    await client.query("begin read only");
    await audit(client);
    const history = await readMigrationHistory(client);
    console.log(
      history.present
        ? `Migration ledger has ${history.versions.length} entries. Manual SQL application may require an approved baseline; do not rerun migrations.`
        : "No CLI migration ledger: manual SQL application requires an approved baseline, not replay.",
    );
    await client.query("rollback");
  } finally {
    await client.end();
  }
}
void main().catch(reportError);
