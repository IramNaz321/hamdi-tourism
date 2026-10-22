import { verifyRepairPrerequisites } from "./repair-prerequisites";
/** Fixed reviewed SQL only. Never run automatically; default mode is read-only planning. */
import {
  audit,
  catalog,
  compareCatalog,
  connect,
  loadEnvironment,
  reference,
  reportError,
} from "./common";
import { repairInput, repairDecision } from "./repair-approval";
async function main() {
  loadEnvironment();
  const target = repairInput(process.argv.slice(2), process.env);
  // Invalid targets/approvals are rejected before opening any connection.
  const client = await connect();
  try {
    await client.query("begin read only");
    const org = await client.query("select 1 from public.organizations where id=$1", [
      target.organizationId,
    ]);
    if (org.rowCount !== 1) throw new Error("Existing organization is required.");
    const actual = await catalog(client);
    const stages = [
      { version: 7 as const, driver: false, passenger: false },
      { version: 8 as const, driver: true, passenger: false },
      { version: 9 as const, driver: true, passenger: true },
    ].filter(
      (stage) =>
        compareCatalog(reference(stage.driver, stage.passenger).catalog, actual).length === 0,
    );
    if (stages.length !== 1)
      throw new Error("Schema drift/partial installation requires review; no repair may replay.");
    const stage = stages[0];
    await audit(client, stage.driver, stage.passenger);
    await verifyRepairPrerequisites(client, stage.version);
    const settings = await client.query(
      "select 1 from public.business_settings where organization_id=$1",
      [target.organizationId],
    );
    const decision = repairDecision(target.step, stage.version, settings.rowCount === 1);
    await client.query("rollback");
    if (decision === "already_installed") {
      console.log(
        JSON.stringify({
          step: target.step,
          status: "already_installed_no_changes",
          productionReady: false,
        }),
      );
      return;
    }
    if (!target.apply) {
      console.log(
        JSON.stringify(
          {
            readOnly: true,
            step: target.step,
            file: target.file,
            sha256: target.hash,
            approvalTarget: target.approval,
            status: "pending_separate_approval",
            productionReady: false,
          },
          null,
          2,
        ),
      );
      return;
    }
    // Candidate owns its BEGIN/COMMIT and strict per-step preflight. No dynamic SQL/path from caller.
    await client.query(target.sql);
    console.log(
      JSON.stringify(
        {
          step: target.step,
          status: "approved_sql_committed",
          sha256: target.hash,
          migrationHistoryChanged: false,
          ownerAssigned: false,
          productionReady: false,
          next: "Read-only post-change verification required; do not replay blindly.",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
void main().catch(reportError);
