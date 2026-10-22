import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  compareStages,
  migrationPlan,
  safeFailure,
  authPolicy,
  readOnlyFetch,
  safeMembership,
  type Stage,
} from "../scripts/verification/logic";
import { reference } from "../scripts/database/common";
const stages: Stage[] = [
  { version: 7, reference: reference(false, false) },
  { version: 8, reference: reference(true, false) },
  { version: 9, reference: reference(true, true) },
  { version: 10, reference: reference(true, true, true) },
];
test("seventeen tables and absent ledger identify a candidate baseline, never an empty database", () => {
  const comparisons = compareStages(stages[0].reference.catalog, stages);
  assert.equal(comparisons[0].tableCount, 17);
  const plan = migrationPlan(comparisons, null, stages);
  assert.equal(plan.schemaVersion, 7);
  assert.equal(plan.unrecorded?.length, 7);
  assert.deepEqual(plan.pending, [
    "202610120008_driver_tracking.sql",
    "202610120009_passenger_platform.sql",
    "202610120010_owner_booking_notifications.sql",
  ]);
  assert.ok(plan.reason.includes("never replay"));
});
test("matching driver schema needs only passenger SQL and ledger-only recording if history is absent", () => {
  const plan = migrationPlan(compareStages(stages[1].reference.catalog, stages), null, stages);
  assert.equal(plan.schemaVersion, 8);
  assert.deepEqual(plan.pending, [
    "202610120009_passenger_platform.sql",
    "202610120010_owner_booking_notifications.sql",
  ]);
  assert.equal(plan.unrecorded?.length, 8);
});
test("matching passenger schema plans only owner notification migration and never replay", () => {
  const plan = migrationPlan(compareStages(stages[2].reference.catalog, stages), null, stages);
  assert.deepEqual(plan.pending, ["202610120010_owner_booking_notifications.sql"]);
  assert.equal(plan.unrecorded?.length, 9);
});
test("matching complete schema never repeats an installed migration even without history", () => {
  const plan = migrationPlan(compareStages(stages[3].reference.catalog, stages), null, stages);
  assert.deepEqual(plan.pending, []);
  assert.equal(plan.unrecorded?.length, 10);
});
test("unchanged table count cannot disguise schema drift or partial driver installation", () => {
  const actual = structuredClone(stages[0].reference.catalog);
  actual["table:bookings"] = { rls: false };
  assert.equal(migrationPlan(compareStages(actual, stages), null, stages).status, "blocked");
  const partial = {
    ...stages[0].reference.catalog,
    "table:driver_trip_events": stages[1].reference.catalog["table:driver_trip_events"],
  };
  assert.equal(migrationPlan(compareStages(partial, stages), null, stages).status, "blocked");
});
test("ledger entries for missing schema and unknown versions block deployment plans", () => {
  const matches = compareStages(stages[0].reference.catalog, stages);
  for (const ledger of [["202610120008"], ["unknown"], ["202610120001", "202610120001"]])
    assert.equal(migrationPlan(matches, ledger, stages).status, "blocked");
});
test("fully recorded complete schema requires launch acceptance rather than more SQL", () => {
  const plan = migrationPlan(
    compareStages(stages[3].reference.catalog, stages),
    Object.keys(stages[3].reference.migrations).map((f) => f.split("_")[0]),
    stages,
  );
  assert.equal(plan.unrecorded?.length, 0);
  assert.deepEqual(plan.pending, []);
  assert.ok(plan.reason.includes("No schema migration needed"));
});
test("connection diagnostics categorize codes and never echo raw credentials or provider messages", () => {
  const secret = "SYNTHETIC_TEST_SECRET_NOT_A_REAL_CREDENTIAL";
  for (const [error, category] of [
    [{ code: "28P01", message: secret }, "authentication"],
    [{ code: "42501", message: secret }, "authorization"],
    [{ cause: { code: "ENETUNREACH", message: secret } }, "network"],
    [{ code: "SELF_SIGNED_CERT_IN_CHAIN", message: secret }, "tls"],
    [{ message: secret }, "unclassified"],
  ] as const) {
    const result = safeFailure(error);
    assert.equal(result.category, category);
    assert.equal(JSON.stringify(result).includes(secret), false);
  }
});
test("passenger signup configuration does not weaken mandatory email verification", () => {
  assert.equal(
    authPolicy({ disable_signup: true, mailer_autoconfirm: false }, false).signupPolicy,
    "matches_application_mode",
  );
  assert.equal(
    authPolicy({ disable_signup: false, mailer_autoconfirm: false }, true).signupPolicy,
    "matches_application_mode",
  );
  assert.equal(
    authPolicy({ disable_signup: false, mailer_autoconfirm: true }, true).emailConfirmation,
    "unsafe_auto_confirmation",
  );
  assert.equal(authPolicy({}, true).emailConfirmation, "not_verified");
});
test("read-only doctor has no SQL apply path and enforces read-only sessions plus TLS", () => {
  const source = readFileSync("scripts/verification/hosted.ts", "utf8");
  assert.ok(source.includes("default_transaction_read_only=on"));
  assert.ok(source.includes("begin isolation level repeatable read read only"));
  assert.ok(source.includes("rejectUnauthorized: true"));
  assert.equal(
    /client\.query\(\s*["`](?:insert|update|delete|create|alter|drop|grant)\b/i.test(source),
    false,
  );
  assert.equal(source.includes("signInWithPassword"), false);
});

test("API doctor refuses Auth and database mutation methods before a network request", async () => {
  for (const method of ["POST", "PATCH", "PUT", "DELETE"])
    await assert.rejects(
      readOnlyFetch("https://example.test", { method }),
      /rejects mutation methods/,
    );
});

test("membership output whitelists roles and booleans without printing arbitrary hosted fields", () => {
  const secret = "SYNTHETIC_TEST_SECRET";
  const safe = safeMembership({
    role: secret,
    active: secret,
    matches_configured_org: secret,
    email: secret,
  });
  assert.equal(JSON.stringify(safe).includes(secret), false);
  assert.equal(safeMembership({ role: "owner", active: true })?.role, "owner");
});
