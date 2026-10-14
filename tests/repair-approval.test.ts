import { test } from "node:test";
import assert from "node:assert/strict";
import { repairInput, repairDecision } from "../scripts/database/repair-approval";
const env = { HAMDI_ORGANIZATION_ID: "9f53250d-5e05-409d-9182-3d45448aa399" };
test("repair command defaults to planning and accepts only fixed reviewed files with exact hash approval", () => {
  const plan = repairInput(["--step", "settings"], env);
  assert.equal(plan.apply, false);
  assert.match(plan.hash, /^[a-f0-9]{64}$/);
  assert.throws(() => repairInput(["--step", "../../arbitrary.sql"], env));
  assert.throws(() => repairInput(["--step", "settings"], {}));
  assert.throws(() => repairInput(["--step", "settings", "--apply", "--approve", "yes"], env));
  assert.equal(
    repairInput(["--step", "settings", "--apply", "--approve", plan.approval], env).apply,
    true,
  );
  assert.throws(() =>
    repairInput(["--step", "driver", "--apply", "--approve", plan.approval], env),
  );
});
test("only exact verified stages become no-ops and Passenger cannot precede Driver", () => {
  assert.equal(repairDecision("settings", 7, true), "already_installed");
  assert.equal(repairDecision("settings", 7, false), "pending");
  assert.equal(repairDecision("driver", 7, false), "pending");
  assert.equal(repairDecision("driver", 9, false), "already_installed");
  assert.throws(() => repairDecision("passenger", 7, false));
  assert.equal(repairDecision("passenger", 8, false), "pending");
  assert.equal(repairDecision("passenger", 9, false), "already_installed");
});
