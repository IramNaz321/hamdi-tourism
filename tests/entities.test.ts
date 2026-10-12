import { test } from "node:test";
import assert from "node:assert/strict";
import { canWrite, parseRecord, toUaeInput } from "../src/lib/entities";
const uuid = "10000000-0000-4000-8000-000000000001";
const second = "10000000-0000-4000-8000-000000000002";
function form(input: Record<string, string>) {
  const data = new FormData();
  Object.entries(input).forEach(([key, value]) => data.set(key, value));
  return data;
}
const booking = {
  customer_id: uuid,
  pickup_location_id: uuid,
  dropoff_location_id: second,
  pickup_at: "2026-10-20T10:30",
  passengers: "2",
  status: "pending",
  price_aed: "250.50",
  payment_status: "unpaid",
};
test("UAE pickup times are stored in UTC and round-trip independently of host timezone", () => {
  const result = parseRecord("bookings", form(booking));
  assert.equal(result.pickup_at, "2026-10-20T06:30:00.000Z");
  assert.equal(toUaeInput(result.pickup_at as string), booking.pickup_at);
});
test("rejects forged roles, invalid relations, negative fares, invalid dates and identical endpoints", () => {
  for (const changed of [
    { status: "owner" },
    { customer_id: "not-a-uuid" },
    { price_aed: "-1" },
    { price_aed: "0.001" },
    { passengers: "1.5" },
    { pickup_at: "invalid" },
    { pickup_at: "2026-02-31T10:00" },
    { dropoff_location_id: uuid },
  ])
    assert.throws(() => parseRecord("bookings", form({ ...booking, ...changed })));
});
test("whitelists operational fields and prevents mass assignment", () => {
  const parsed = parseRecord(
    "customers",
    form({
      name: "  Real entered name  ",
      phone: "+971000000000",
      organization_id: uuid,
      archived: "true",
      role: "owner",
    }),
  );
  assert.deepEqual(parsed, {
    name: "Real entered name",
    phone: "+971000000000",
    email: null,
    notes: null,
  });
});
test("role permissions separate staff management from operational access", () => {
  for (const entity of [
    "drivers",
    "vehicles",
    "customers",
    "locations",
    "bookings",
    "route_pricing",
  ]) {
    assert.equal(canWrite("owner", entity), true);
    assert.equal(canWrite("manager", entity), true);
    assert.equal(canWrite("viewer", entity), false);
    assert.equal(canWrite("dispatcher", entity), ["customers", "bookings"].includes(entity));
  }
});
test("required fields and email formats are enforced", () => {
  assert.throws(() => parseRecord("customers", form({ name: "", phone: "123" })));
  assert.throws(() =>
    parseRecord("customers", form({ name: "Person", phone: "123", email: "wrong" })),
  );
  assert.throws(() =>
    parseRecord(
      "drivers",
      form({
        name: "Person",
        phone: "123",
        license_number: "ABC",
        license_expiry: "2026-02-31",
        status: "available",
      }),
    ),
  );
});
