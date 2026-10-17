import { test } from "node:test";
import assert from "node:assert/strict";
import { deliverReservedInvitation } from "../src/lib/invitation-delivery";
test("successful invitations retain reserved access", async () => {
  assert.equal(
    await deliverReservedInvitation(
      async () => ({ error: null }),
      async () => {
        throw new Error("must not revoke success");
      },
    ),
    "sent",
  );
});
test("returned and thrown delivery failures revoke reserved access exactly once", async () => {
  for (const send of [
    async () => ({ error: { code: "provider" } }),
    async () => {
      throw new Error("transport");
    },
  ]) {
    let revoked = 0;
    assert.equal(
      await deliverReservedInvitation(send, async () => {
        revoked++;
        return { error: null };
      }),
      "failed",
    );
    assert.equal(revoked, 1);
  }
});
test("failed cleanup never claims access was revoked", async () => {
  for (const revoke of [
    async () => ({ error: { code: "offline" } }),
    async () => {
      throw new Error("transport");
    },
  ])
    assert.equal(
      await deliverReservedInvitation(async () => ({ error: {} }), revoke),
      "cleanup_unconfirmed",
    );
});
