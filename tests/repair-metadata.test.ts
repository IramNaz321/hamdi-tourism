import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  repairMetadataHashes,
  repairMetadataDifferences,
} from "../scripts/database/repair-metadata";
const historicalFixture = () =>
  JSON.parse(readFileSync("supabase/proposals/hosted-repair/reference-prerequisites.json", "utf8"));
const fixture = () => ({
  ...historicalFixture(),
  provider_security: { storage_rls: true, realtime_rls: true },
  api_role_security: [{ role: "anon", bypass_rls: false }],
  effective_table_grants: [{ role: "anon", table: "bookings", allowed: false }],
});
test("critical grants, policies, constraints, indexes and trigger drift block repair metadata verification", () => {
  const original = fixture(),
    expected = repairMetadataHashes(original);
  assert.deepEqual(repairMetadataDifferences(original, expected), []);
  for (const key of [
    "function_fingerprints",
    "constraints",
    "indexes",
    "triggers",
    "storage_realtime_policies",
    "table_grants",
    "column_grants",
    "public_policy_modes",
    "schema_access",
    "provider_security",
    "api_role_security",
    "effective_table_grants",
    "media_bucket",
    "realtime_tables",
  ] as const) {
    const changed = fixture();
    changed[key] = key === "constraints" ? {} : [];
    assert.ok(repairMetadataDifferences(changed, expected).includes(key));
  }
  assert.throws(() => repairMetadataHashes({}));
});
test("trusted server-role extras do not relax anonymous or authenticated comparisons", () => {
  const data = fixture(),
    expected = repairMetadataHashes(data);
  data.table_grants.push({ table: "bookings", role: "service_role", privilege: "SELECT" });
  data.function_fingerprints[0].service_role_execute =
    !data.function_fingerprints[0].service_role_execute;
  assert.deepEqual(repairMetadataDifferences(data, expected), []);
  data.function_fingerprints[0].anon_execute = !data.function_fingerprints[0].anon_execute;
  assert.deepEqual(repairMetadataDifferences(data, expected), ["function_fingerprints"]);
});
