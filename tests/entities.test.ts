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
  end_at: "2026-10-20T12:30",
  luggage: "1",
  vehicle_category: "sedan",
  flight_status: "not_recorded",
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

const driver = {
  name: "  Test Driver  ",
  phone: "+971 50 123 4567",
  email: "  DRIVER@EXAMPLE.TEST ",
  license_number: "TEST-LICENCE-001",
  license_expiry: "2028-02-29",
  status: "available",
  account_status: "active",
  notes: "",
};

test("driver form normalizes and saves valid contact, licence and status fields", () => {
  assert.deepEqual(parseRecord("drivers", form(driver)), {
    name: "Test Driver",
    phone: "+971 50 123 4567",
    email: "driver@example.test",
    license_number: "TEST-LICENCE-001",
    license_expiry: "2028-02-29",
    status: "available",
    account_status: "active",
    notes: null,
  });
  assert.deepEqual(
    parseRecord("drivers", form({ ...driver, license_expiry: "" })).license_expiry,
    null,
  );
});

test("driver required fields, email and calendar expiry are validated on the server", () => {
  for (const changed of [
    { name: " " },
    { phone: "" },
    { phone: "letters" },
    { phone: "12345" },
    { phone: "+9715012345678901" },
    { license_number: "" },
    { email: "not-an-email" },
    { email: `${"a".repeat(250)}@example.test` },
    { license_expiry: "2026-02-29" },
    { license_expiry: "not-a-date" },
  ]) {
    assert.throws(() => parseRecord("drivers", form({ ...driver, ...changed })));
  }
});

test("driver availability and account status accept only the configured choices", () => {
  for (const status of ["available", "on_trip", "unavailable"])
    assert.equal(parseRecord("drivers", form({ ...driver, status })).status, status);
  for (const accountStatus of ["active", "inactive"])
    assert.equal(
      parseRecord("drivers", form({ ...driver, account_status: accountStatus })).account_status,
      accountStatus,
    );
  for (const changed of [{ status: "free" }, { account_status: "suspended" }])
    assert.throws(() => parseRecord("drivers", form({ ...driver, ...changed })));
});

test("only owners and managers may write driver records", () => {
  assert.equal(canWrite("owner", "drivers"), true);
  assert.equal(canWrite("manager", "drivers"), true);
  for (const role of ["dispatcher", "viewer", "driver"] as const)
    assert.equal(canWrite(role, "drivers"), false);
});
