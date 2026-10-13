import { test } from "node:test";
import assert from "node:assert/strict";
import { staffAccessChangeAllowed } from "../src/lib/staff-access-policy";
test("staff controls cannot add an Owner, alter the Owner or bypass driver account provisioning", () => {
  for (const current of ["owner", "manager", "dispatcher", "viewer", "driver"])
    assert.equal(staffAccessChangeAllowed(current, "owner"), false);
  for (const next of ["owner", "manager", "dispatcher", "viewer", "driver"])
    assert.equal(staffAccessChangeAllowed("owner", next), false);
  assert.equal(staffAccessChangeAllowed("driver", "manager"), false);
  assert.equal(staffAccessChangeAllowed("viewer", "driver"), false);
  assert.equal(staffAccessChangeAllowed("driver", "driver"), true);
  assert.equal(staffAccessChangeAllowed("viewer", "dispatcher"), true);
});
