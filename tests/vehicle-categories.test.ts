import { test } from "node:test";
import assert from "node:assert/strict";
import { vehicleCategories, vehicleCategoryLabel } from "../src/lib/vehicle-categories";
test("four client categories retain existing database codes without inventing operational vehicles", () => {
  assert.deepEqual(
    vehicleCategories.map((c) => [c.name, c.capacity]),
    [
      ["Normal Sedan", "3 passengers"],
      ["Luxury Sedan", "3 passengers"],
      ["7-Seater", "7 seats"],
      ["5-Passenger Vehicle", "5 passengers"],
    ],
  );
  assert.deepEqual(vehicleCategories.map((c) => c.code).sort(), ["luxury", "sedan", "suv", "van"]);
  assert.equal(vehicleCategoryLabel("sedan"), "Normal Sedan");
  assert.equal(vehicleCategoryLabel("unknown-owner-category"), "unknown-owner-category");
  for (const category of vehicleCategories) assert.equal("vehicle_id" in category, false);
});
