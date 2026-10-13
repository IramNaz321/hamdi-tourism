import { test } from "node:test";
import assert from "node:assert/strict";
import { LocationSharing } from "../src/lib/location-sharing";
import { gpsSchema, trackingPath, isStale, nextDriverAction, uaeDay } from "../src/lib/tracking";
const tick = () => new Promise((resolve) => setImmediate(resolve));
function harness() {
  let time = Date.now(),
    calls = 0,
    cleared = 0,
    revoked = 0;
  let success: PositionCallback = () => {};
  let failure: PositionErrorCallback = () => {};
  let denied = false;
  const fixes: unknown[] = [];
  const messages: { message: string; active: boolean }[] = [];
  const controller = new LocationSharing({
    geolocation: {
      watchPosition: (s, e) => {
        calls++;
        success = s;
        failure = e ?? (() => {});
        return 7;
      },
      clearWatch: () => {
        cleared++;
      },
    },
    now: () => time,
    send: async (fix) => {
      fixes.push(fix);
      return { denied };
    },
    revoke: async () => {
      revoked++;
    },
    report: (message, active) => messages.push({ message, active }),
  });
  const position = (changes: Partial<GeolocationCoordinates> = {}, timestamp = time) =>
    ({
      timestamp,
      coords: {
        latitude: 25,
        longitude: 55,
        accuracy: 20,
        heading: null,
        altitude: null,
        altitudeAccuracy: null,
        speed: null,
        ...changes,
      },
      toJSON: () => ({}),
    }) as GeolocationPosition;
  return {
    controller,
    fixes,
    messages,
    position,
    emit: (p: GeolocationPosition) => success(p),
    deny: () =>
      failure({
        code: 1,
        message: "",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError),
    advance: () => {
      time += 9000;
    },
    expire: () => {
      denied = true;
    },
    counts: () => ({ calls, cleared, revoked }),
  };
}
test("GPS never starts without explicit consent, throttles updates, and stops with revocation", async () => {
  const h = harness();
  assert.equal(h.counts().calls, 0);
  h.controller.start();
  h.controller.start();
  assert.equal(h.counts().calls, 1);
  h.emit(h.position());
  await tick();
  h.emit(h.position());
  await tick();
  assert.equal(h.fixes.length, 1);
  h.advance();
  h.emit(h.position());
  await tick();
  assert.equal(h.fixes.length, 2);
  h.controller.stop();
  assert.deepEqual(h.counts(), { calls: 1, cleared: 1, revoked: 1 });
  h.advance();
  h.emit(h.position());
  await tick();
  assert.equal(h.fixes.length, 2);
});
test("GPS permission denial and revoked session clear the watcher", async () => {
  const h = harness();
  h.controller.start();
  h.deny();
  assert.equal(h.counts().cleared, 1);
  assert.equal(h.messages.at(-1)?.active, false);
  h.controller.start();
  h.expire();
  h.emit(h.position());
  await tick();
  assert.equal(h.counts().cleared, 2);
  assert.equal(h.messages.at(-1)?.active, false);
});
test("invalid or stale GPS is never sent, and low accuracy remains explicitly labeled", async () => {
  const h = harness();
  h.controller.start();
  h.emit(h.position({ latitude: NaN }));
  h.emit(h.position({}, 0));
  await tick();
  assert.equal(h.fixes.length, 0);
  h.emit(h.position({ accuracy: 150 }));
  await tick();
  assert.equal(h.fixes.length, 1);
  assert.match(h.messages.at(-1)?.message ?? "", /low/);
  h.controller.stop("Offline. Restart with consent after reconnecting.");
  h.advance();
  h.emit(h.position());
  await tick();
  assert.equal(h.fixes.length, 1);
});
test("only booking-specific relative tracking paths are accepted", () => {
  const good = "/track/10000000-0000-4000-8000-000000000001";
  assert.equal(trackingPath(good), good);
  for (const value of [
    "//evil.example",
    `https://evil.example${good}`,
    `${good}?next=evil`,
    "/admin",
    "/track/invalid",
  ])
    assert.equal(trackingPath(value), null);
  assert.equal(isStale(null), true);
  assert.equal(
    isStale({ received_at: new Date(0).toISOString() } as Parameters<typeof isStale>[0]),
    true,
  );
  assert.equal(
    gpsSchema.safeParse({
      latitude: 91,
      longitude: 55,
      accuracy: 1,
      heading: null,
      capturedAt: new Date().toISOString(),
    }).success,
    false,
  );
});
test("driver controls follow canonical stages and preserve authorized handovers", () => {
  const t = {
    status: "confirmed",
    accepted_at: null,
    en_route_at: null,
    arrived_at: null,
    picked_up_at: null,
    handover_at: null,
  };
  assert.equal(nextDriverAction(t), "accept");
  assert.equal(nextDriverAction({ ...t, accepted_at: "recorded" }), "en_route");
  assert.equal(
    nextDriverAction({ ...t, accepted_at: "recorded", en_route_at: "recorded" }),
    "arrive",
  );
  assert.equal(
    nextDriverAction({
      ...t,
      accepted_at: "recorded",
      en_route_at: "recorded",
      arrived_at: "recorded",
    }),
    "pickup",
  );
  assert.equal(nextDriverAction({ ...t, status: "in_progress" }), "handover");
  assert.equal(
    nextDriverAction({ ...t, status: "in_progress", handover_at: "recorded" }),
    "complete",
  );
  assert.equal(nextDriverAction({ ...t, status: "completed" }), null);
});

test("UAE trip dates cross UTC midnight without depending on browser locale", () => {
  assert.equal(uaeDay("2026-12-31T21:00:00Z"), "2027-01-01");
});
test("browser GPS start failure stops cleanly without any transmitted fix", () => {
  let sent = 0,
    revoked = 0;
  const states: boolean[] = [];
  const controller = new LocationSharing({
    geolocation: {
      watchPosition: () => {
        throw new Error("Browser permission blocked");
      },
      clearWatch: () => {},
    },
    send: async () => {
      sent++;
      return {};
    },
    revoke: async () => {
      revoked++;
    },
    report: (_message, active) => states.push(active),
  });
  controller.start();
  assert.equal(sent, 0);
  assert.equal(revoked, 1);
  assert.equal(states.at(-1), false);
});
