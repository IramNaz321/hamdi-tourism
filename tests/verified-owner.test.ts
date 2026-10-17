import { test } from "node:test";
import assert from "node:assert/strict";
import { isVerifiedOwner } from "../src/lib/verified-owner";
test("Admin requires explicitly configured identity, organization and active owner membership", () => {
  const id = "10000000-0000-4000-8000-000000000001",
    org = "20000000-0000-4000-8000-000000000002";
  const env = { HAMDI_OWNER_USER_ID: id, HAMDI_ORGANIZATION_ID: org };
  const member = { role: "owner", active: true, organization_id: org };
  assert.equal(isVerifiedOwner(id, member, env), true);
  for (const config of [
    {},
    { ...env, HAMDI_OWNER_USER_ID: "Hamid Shah" },
    { ...env, HAMDI_ORGANIZATION_ID: "" },
  ])
    assert.equal(isVerifiedOwner(id, member, config), false);
  for (const role of ["manager", "dispatcher", "viewer", "driver"])
    assert.equal(isVerifiedOwner(id, { ...member, role }, env), false);
  assert.equal(isVerifiedOwner(org, member, env), false);
  assert.equal(isVerifiedOwner(id, { ...member, active: false }, env), false);
  assert.equal(isVerifiedOwner(id, { ...member, organization_id: id }, env), false);
});
