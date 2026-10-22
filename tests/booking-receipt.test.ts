import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingReceiptSchema } from "../src/lib/passenger-validation";
const row = {
  id: "a0000000-0000-4000-8000-000000000001",
  reference: "TEST-ONLY",
  status: "confirmed",
};
test("only nonempty, bounded, uniquely identified server receipts can confirm bookings", () => {
  for (const value of [
    null,
    [],
    [{}],
    [{ ...row, id: "invalid" }],
    [{ ...row, status: "paid" }],
    [row, row],
    [row, row, row],
    [{ ...row, reference: "" }],
  ])
    assert.equal(bookingReceiptSchema.safeParse(value).success, false);
  assert.deepEqual(bookingReceiptSchema.parse([{ ...row, private_internal: "must not escape" }]), [
    row,
  ]);
});
