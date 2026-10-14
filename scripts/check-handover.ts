/** Local, read-only, secret-safe handover gate; never contacts providers or mutates a database. */
import { launchReadiness } from "../src/lib/launch-readiness";
import { loadEnvironment, reference } from "./database/common";
loadEnvironment();
const findings = launchReadiness(process.env);
try {
  const schema = reference(true, true);
  console.log(
    JSON.stringify(
      { ...findings, reviewedMigrationFiles: Object.keys(schema.migrations).length },
      null,
      2,
    ),
  );
  if (findings.missingCore.length) process.exitCode = 1;
} catch {
  console.log(
    JSON.stringify({
      error:
        "Local migration reference verification failed. Review migration integrity before any hosted change.",
      productionReady: false,
    }),
  );
  process.exitCode = 1;
}
