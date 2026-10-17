import { connect, loadEnvironment, reportError } from "./common";
import { readMigrationHistory } from "./migration-history";
async function main() {
  loadEnvironment();
  const client = await connect();
  try {
    await client.query("begin read only");
    const history = await readMigrationHistory(client);
    console.log(
      JSON.stringify(
        {
          readOnly: true,
          historyTable: history.present ? "present" : "absent",
          recordedMigrations: history.versions.length,
          schemaVerified: false,
          action:
            "Compare actual schema before proposing an approved baseline. Never replay completed migrations.",
        },
        null,
        2,
      ),
    );
  } finally {
    try {
      await client.query("rollback");
    } finally {
      await client.end();
    }
  }
}
void main().catch(reportError);
