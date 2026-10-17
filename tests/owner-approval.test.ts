import { test } from "node:test";
import assert from "node:assert/strict";
import { ownerBootstrapInput, ownerMembershipDecision } from "../scripts/database/owner-approval";
const org = "10000000-0000-4000-8000-000000000001",
  user = "20000000-0000-4000-8000-000000000001";
const env = { HAMDI_ORGANIZATION_ID: org, HAMDI_OWNER_USER_ID: user };
const args = [
  "--user-id",
  user,
  "--organization-id",
  org,
  "--apply",
  "--name",
  "Real client name",
  "--approve",
  `hzcupgjphowrzvrdffrf:${org}:${user}:owner`,
];
test("Owner apply requires an existing target, explicit approved identity and exact bound approval", () => {
  assert.equal(ownerBootstrapInput(args, env).apply, true);
  for (const bindings of [
    { HAMDI_ORGANIZATION_ID: org },
    { ...env, HAMDI_OWNER_USER_ID: org },
    { ...env, HAMDI_ORGANIZATION_ID: user },
  ])
    assert.throws(() => ownerBootstrapInput(args, bindings));
  assert.throws(() =>
    ownerBootstrapInput(
      args.map((v) => (v.endsWith(":owner") ? "legacy-approval" : v)),
      env,
    ),
  );
  assert.equal(
    ownerBootstrapInput(["--user-id", user], { HAMDI_ORGANIZATION_ID: org }).apply,
    false,
  );
});
test("Owner planning never promotes, reactivates, reassigns or creates a second Owner", () => {
  const target = { userId: user, organizationId: org };
  assert.equal(ownerMembershipDecision(target, undefined, []), "insert_after_approval");
  assert.equal(
    ownerMembershipDecision(target, { role: "owner", active: true, organization_id: org }, [
      { user_id: user },
    ]),
    "already_configured",
  );
  for (const member of [
    { role: "driver", active: true, organization_id: org },
    { role: "owner", active: false, organization_id: org },
    { role: "owner", active: true, organization_id: user },
  ])
    assert.throws(() => ownerMembershipDecision(target, member, []));
  assert.throws(() => ownerMembershipDecision(target, undefined, [{ user_id: org }]));
});
