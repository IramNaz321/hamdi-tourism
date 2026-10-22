import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRoadRoute, routingTarget, RoutingBudget } from "../src/lib/road-routing";
import type { TrackingSnapshot } from "../src/lib/tracking";
const now = Date.parse("2026-10-13T12:00:00Z");
// Local fixtures only: no hosted trip or GPS records, no provider request.
function trip(): TrackingSnapshot {
  return {
    id: "a0000000-0000-4000-8000-000000000001",
    reference: "local fixture",
    status: "confirmed",
    sharing_allowed: true,
    driver_phase: "en_route",
    driver_name: null,
    vehicle: null,
    pickup: {
      id: "a0000000-0000-4000-8000-000000000002",
      name: "Fixture pickup",
      latitude: 25.2,
      longitude: 55.3,
    },
    destination: {
      id: "a0000000-0000-4000-8000-000000000003",
      name: "Fixture destination",
      latitude: 25.3,
      longitude: 55.4,
    },
    location: {
      latitude: 25.1,
      longitude: 55.2,
      accuracy: 10,
      heading: null,
      received_at: "2026-10-13T12:00:00+00:00",
      captured_at: "2026-10-13T12:00:00+00:00",
    },
  };
}
test("road routing refuses inactive, revoked, stale, inaccurate or missing GPS and destination", () => {
  assert.ok(routingTarget(trip(), now));
  for (const value of [
    { ...trip(), sharing_allowed: false },
    { ...trip(), status: "completed" as const },
    { ...trip(), driver_phase: "completed" as const },
    { ...trip(), location: null },
    { ...trip(), location: { ...trip().location!, accuracy: 201 } },
    { ...trip(), location: { ...trip().location!, received_at: "2026-10-13T11:59:00Z" } },
    { ...trip(), pickup: { ...trip().pickup, latitude: null } },
  ])
    assert.equal(routingTarget(value, now), null);
});
test("road route target follows actual trip phase and normalizes provider coordinates and timestamps", () => {
  const current = trip();
  const target = routingTarget(current, now)!;
  assert.equal(target.name, "Fixture pickup");
  assert.equal(
    routingTarget({ ...current, driver_phase: "picked_up", status: "in_progress" }, now)?.name,
    "Fixture destination",
  );
  const value = {
    features: [
      {
        geometry: { type: "LineString", coordinates: [target.from, target.to] },
        properties: { summary: { distance: 1200, duration: 180 } },
      },
    ],
  };
  const route = parseRoadRoute(value, current, now);
  assert.deepEqual(route.coordinates[0], [25.1, 55.2]);
  assert.equal(route.distanceMeters, 1200);
  assert.equal(route.durationSeconds, 180);
  assert.equal(route.gpsReceivedAt, "2026-10-13T12:00:00.000Z");
  assert.equal(route.trafficAware, false);
  assert.throws(() =>
    parseRoadRoute(
      {
        features: [
          { ...value.features[0], properties: { summary: { distance: -1, duration: 180 } } },
        ],
      },
      current,
      now,
    ),
  );
  assert.throws(() =>
    parseRoadRoute(
      {
        features: [
          {
            ...value.features[0],
            geometry: { type: "LineString", coordinates: [[0, 0], target.to] },
          },
        ],
      },
      current,
      now,
    ),
  );
  assert.throws(() => parseRoadRoute(value, { ...current, sharing_allowed: false }, now));
});
test("routing budgets throttle separate accounts, reset on expiry and bound memory", () => {
  const budget = new RoutingBudget(2, 2);
  assert.equal(budget.take("a", now), true);
  assert.equal(budget.take("a", now), true);
  assert.equal(budget.take("a", now), false);
  assert.equal(budget.take("b", now), true);
  assert.equal(budget.take("c", now), false);
  assert.equal(budget.take("c", now + 60000), true);
  assert.equal(budget.take("a", now + 60000), true);
});
