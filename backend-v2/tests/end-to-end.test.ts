import { test, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/main.ts";
import { pool, visibleRead } from "../src/db.ts";
import { admin } from "../src/auth.ts";
const app = await buildApp();
const stamp = Date.now().toString(36);
type Login = {
  session: {
    id: string;
    role: "customer" | "owner" | "driver";
    email: string;
    name: string;
    driverId: string | null;
  };
  tokens: { accessToken: string; refreshToken: string };
};
async function api(
  method: string,
  url: string,
  body?: unknown,
  login?: Login,
  status = 200,
  headers: Record<string, string> = {},
) {
  const res = await app.inject({
    method: method as "GET",
    url,
    payload: body as any,
    headers: {
      ...(login ? { authorization: `Bearer ${login.tokens.accessToken}` } : {}),
      ...headers,
    },
  });
  assert.equal(
    res.statusCode,
    status,
    `${method} ${url}: ${res.statusCode} ${res.statusCode >= 400 ? res.body : ""}`,
  );
  return res.json();
}
async function signIn(email: string): Promise<Login> {
  if (email.startsWith("driver-")) await new Promise((r) => setTimeout(r, 1100));
  const c = await api("POST", "/api/v2/auth/challenges", { email });
  let code = "";
  for (let i = 0; i < 20; i++) {
    const box = (await fetch("http://127.0.0.1:57524/api/v1/messages").then((r) =>
      r.json(),
    )) as any;
    const mail = box.messages.find((m: any) => m.To.some((t: any) => t.Address === email));
    if (mail) {
      const full = (await fetch(`http://127.0.0.1:57524/api/v1/message/${mail.ID}`).then((r) =>
        r.json(),
      )) as any;
      code = full.Text.match(/\b\d{6}\b/)?.[0] ?? "";
      if (code) break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(code, "Supabase Auth must deliver a six-digit code to local Mailpit");
  return api("POST", "/api/v2/auth/verify", { challengeId: c.id, code });
}
const date = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const journey = (days = 7, returnTrip = false) => ({
  pickupId: "dxb",
  destinationId: "marina",
  date: date(days),
  time: "10:30",
  passengers: 2,
  bags: 2,
  tripType: returnTrip ? "return" : "one-way",
  returnDate: returnTrip ? date(days + 1) : "",
  returnTime: returnTrip ? "12:00" : "",
  extraIds: [],
});
let owner: Login, customer: Login, other: Login, driver: Login, d: any, vehicle: any;
const contact = () => ({
  name: "Integration Customer",
  email: customer.session.email,
  phone: "+971501234567",
});
async function booking(days = 7, back = false) {
  const q = await api("POST", "/api/v2/quotes", journey(days, back));
  const input = {
    quoteId: q.id,
    vehicleId: "sedan",
    contact: contact(),
    flightNumber: "EK202",
    notes: "Local integration verification",
    acceptedTerms: true,
    idempotencyKey: crypto.randomUUID(),
  };
  return { b: await api("POST", "/api/v2/bookings", input, customer), input };
}
async function assign(b: any, status = 200) {
  return api(
    "PUT",
    `/api/v2/owner/bookings/${b.id}/assignment`,
    { bookingId: b.id, driverId: d.id, fleetVehicleId: vehicle.id, expectedEnd: b.expectedEnd },
    owner,
    status,
  );
}
async function progress(
  b: any,
  leg: "outbound" | "return",
  action: "start" | "complete",
  status = 200,
  key = crypto.randomUUID(),
) {
  return api(
    "POST",
    `/api/v2/driver/bookings/${b.id}/progress`,
    {
      bookingId: b.id,
      leg,
      action,
      expectedAssignmentAt: b.assignment.assignedAt,
      idempotencyKey: key,
    },
    driver,
    status,
  );
}
after(async () => {
  await app.close();
});
await test("Local Supabase end-to-end and authorization", async (t) => {
  await t.test("real email OTP and server-controlled roles", async () => {
    owner = await signIn("owner@hamdi.local");
    customer = await signIn(`customer-${stamp}@hamdi.local`);
    other = await signIn(`other-${stamp}@hamdi.local`);
    assert.equal(owner.session.role, "owner");
    assert.equal(customer.session.role, "customer");
    await api("GET", "/api/v2/owner/bookings", undefined, customer, 403);
    await api("GET", "/api/v2/owner/bookings", undefined, undefined, 401);
    await admin.auth.admin.updateUserById(customer.session.id, {
      user_metadata: { role: "owner", driverId: "anything" },
    });
    assert.equal((await api("GET", "/api/v2/session", undefined, customer)).role, "customer");
  });
  await t.test("UAE places come from PostgreSQL, including all seven emirates", async () => {
    const c = await api("GET", "/api/v2/catalog");
    assert.ok(c.locations.length > 60);
    assert.equal(new Set(c.locations.map((p: any) => p.city)).size, 7);
    const p = await api("POST", "/api/v2/places/search", {
      query: "Fujairah",
      sessionToken: crypto.randomUUID(),
    });
    assert.ok(p.predictions.length > 0);
    const chosen = await api("POST", "/api/v2/places/select", {
      placeId: p.predictions[0].placeId,
    });
    assert.equal(chosen.countryCode, "AE");
    assert.equal(
      (await api("POST", "/api/v2/places/search", { query: "London" })).predictions.length,
      0,
    );
    await api("POST", "/api/v2/quotes", { ...journey(), pickupId: "London" }, undefined, 409);
    const q = await api("POST", "/api/v2/quotes", { ...journey(), destinationId: chosen.id });
    assert.ok(q.offers.length);
  });
  await t.test("Owner invites; Driver submits; Owner approves and activates", async () => {
    d = await api(
      "POST",
      "/api/v2/owner/drivers",
      { name: "Integration Driver", email: `driver-${stamp}@hamdi.local`, phone: "+971501112222" },
      owner,
    );
    assert.equal(d.active, false);
    assert.equal(d.onboardingStatus, "invited");
    await api("PATCH", `/api/v2/owner/drivers/${d.id}/active`, { active: true }, owner, 409);
    driver = await signIn(d.email);
    assert.equal(driver.session.role, "driver");
    await api("GET", "/api/v2/driver/bookings", undefined, driver, 403);
    await api(
      "POST",
      "/api/v2/driver/onboarding",
      {
        name: "Integration Driver",
        phone: "+971501112222",
        licenceNumber: `UAE-${stamp}`,
        licenceUntil: date(365),
        acceptedPolicies: true,
      },
      driver,
    );
    d = await api("PATCH", `/api/v2/owner/drivers/${d.id}/active`, { active: true }, owner);
    assert.equal(d.onboardingStatus, "approved");
    assert.equal(d.active, true);
    vehicle = await api(
      "POST",
      "/api/v2/owner/vehicles",
      {
        name: "Integration sedan",
        categoryId: "sedan",
        registration: `TEST-${stamp}`,
        registrationUntil: date(365),
        passengers: 3,
        bags: 3,
      },
      owner,
    );
    assert.equal(vehicle.active, true);
    await api(
      "POST",
      "/api/v2/owner/vehicles",
      {
        name: "Unauthorized",
        categoryId: "sedan",
        registration: "UNAUTHORIZED",
        registrationUntil: date(365),
        passengers: 3,
        bags: 3,
      },
      driver,
      403,
    );
  });
  await t.test("Customer booking is idempotent, private and cannot confirm itself", async () => {
    const { b, input } = await booking();
    assert.equal((await api("POST", "/api/v2/bookings", input, customer)).id, b.id);
    assert.equal(b.status, "pending");
    await api("GET", `/api/v2/bookings/${b.id}`, undefined, other, 404);
    await api("POST", `/api/v2/owner/bookings/${b.id}/confirm`, {}, customer, 403);
    await api("POST", `/api/v2/owner/bookings/${b.id}/confirm`, {}, owner, 409);
    const secured = await visibleRead(customer.session, "select data from hamdi.bookings");
    assert.ok(secured.every((r: any) => r.data.customerId === customer.session.id));
    assert.deepEqual(
      await visibleRead(
        customer.session,
        "update hamdi.profiles set role='owner' where user_id=$1 returning *",
        [customer.session.id],
      ),
      [],
    );
    assert.equal((await api("GET", "/api/v2/session", undefined, customer)).role, "customer");
  });
  await t.test(
    "one-way Customer → Owner assignment and confirmation → Driver → Customer complete",
    async () => {
      let { b } = await booking(9);
      await api("GET", `/api/v2/driver/bookings/${b.id}`, undefined, driver, 404);
      b = await assign(b);
      assert.equal(
        (await api("GET", `/api/v2/driver/bookings/${b.id}`, undefined, driver)).id,
        b.id,
      );
      assert.ok(
        (await api("GET", "/api/v2/driver/bookings", undefined, driver)).some(
          (r: any) => r.id === b.id,
        ),
      );
      await progress(b, "outbound", "start", 409);
      await api("PATCH", `/api/v2/owner/drivers/${d.id}/active`, { active: false }, owner, 409);
      await api(
        "PATCH",
        `/api/v2/owner/vehicles/${vehicle.id}/active`,
        { active: false },
        owner,
        409,
      );
      b = await api("POST", `/api/v2/owner/bookings/${b.id}/confirm`, {}, owner);
      await api("POST", `/api/v2/bookings/${b.id}/test-payment`, { result: "paid" }, customer);
      const startKey = crypto.randomUUID();
      b = await progress(b, "outbound", "start", 200, startKey);
      assert.equal(b.status, "in_progress");
      assert.equal((await progress(b, "outbound", "start", 200, startKey)).status, "in_progress");
      await api(
        "POST",
        `/api/v2/bookings/${b.id}/cancellation`,
        { reason: "Too late" },
        customer,
        409,
      );
      b = await progress(b, "outbound", "complete");
      assert.equal(b.status, "completed");
      const seen = await api("GET", `/api/v2/bookings/${b.id}`, undefined, customer);
      assert.equal(seen.status, "completed");
      assert.equal(seen.paymentStatus, "paid");
      assert.ok(seen.tripProgress.outbound.completedAt);
    },
  );
  await t.test(
    "return booking completes each leg and preserves independent payment status",
    async () => {
      let { b } = await booking(12, true);
      b = await assign(b);
      b = await api("POST", `/api/v2/owner/bookings/${b.id}/confirm`, {}, owner);
      await progress(b, "return", "start", 409);
      b = await progress(b, "outbound", "start");
      b = await progress(b, "outbound", "complete");
      assert.equal(b.status, "confirmed");
      assert.equal(b.paymentStatus, "unpaid");
      b = await progress(b, "return", "start");
      b = await progress(b, "return", "complete");
      assert.equal(b.status, "completed");
      assert.equal(b.paymentStatus, "unpaid");
    },
  );
  await t.test(
    "overlapping assignments are serialized; cancellation releases resources; refund is idempotent",
    async () => {
      const a = await booking(16);
      const b = await booking(16);
      const results = await Promise.all([
        app.inject({
          method: "PUT",
          url: `/api/v2/owner/bookings/${a.b.id}/assignment`,
          headers: { authorization: `Bearer ${owner.tokens.accessToken}` },
          payload: {
            bookingId: a.b.id,
            driverId: d.id,
            fleetVehicleId: vehicle.id,
            expectedEnd: a.b.expectedEnd,
          },
        }),
        app.inject({
          method: "PUT",
          url: `/api/v2/owner/bookings/${b.b.id}/assignment`,
          headers: { authorization: `Bearer ${owner.tokens.accessToken}` },
          payload: {
            bookingId: b.b.id,
            driverId: d.id,
            fleetVehicleId: vehicle.id,
            expectedEnd: b.b.expectedEnd,
          },
        }),
      ]);
      assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
      const winner = results.find((r) => r.statusCode === 200)!.json();
      await api("POST", `/api/v2/bookings/${winner.id}/test-payment`, { result: "paid" }, customer);
      await api(
        "POST",
        `/api/v2/bookings/${winner.id}/cancellation`,
        { reason: "Changed plans" },
        customer,
      );
      await progress(winner, "outbound", "start", 409);
      const cancelled = await api(
        "POST",
        `/api/v2/owner/bookings/${winner.id}/cancellation`,
        { decision: "approved", note: "Approved in integration test" },
        owner,
      );
      assert.equal(cancelled.assignment, null);
      assert.ok(
        (await api("GET", "/api/v2/driver/bookings", undefined, driver)).some(
          (r: any) => r.id === winner.id && r.status === "cancelled",
        ),
      );
      assert.equal(
        (await api("GET", `/api/v2/driver/bookings/${winner.id}`, undefined, driver)).status,
        "cancelled",
      );
      assert.equal(cancelled.paymentStatus, "paid");
      const key = crypto.randomUUID();
      const refund = await api(
        "POST",
        `/api/v2/owner/bookings/${winner.id}/refund`,
        { amount: winner.offer.total },
        owner,
        200,
        { "idempotency-key": key },
      );
      assert.equal(refund.paymentStatus, "refunded");
      assert.equal(
        (
          await api(
            "POST",
            `/api/v2/owner/bookings/${winner.id}/refund`,
            { amount: winner.offer.total },
            owner,
            200,
            { "idempotency-key": key },
          )
        ).amountRefunded,
        winner.offer.total,
      );
    },
  );
  await t.test(
    "custom request → Owner quote → verified Customer acceptance creates one linked booking",
    async () => {
      const receipt = await api("POST", "/api/v2/custom-requests", {
        contact: contact(),
        pickup: "Dubai Airport",
        destination: "Marina",
        pickupPlaceId: "dxb",
        destinationPlaceId: "marina",
        date: date(20),
        time: "12:00",
        passengers: 2,
        bags: 2,
        details: "Please arrange a special welcome for my family.",
        acceptedTerms: true,
        idempotencyKey: crypto.randomUUID(),
      });
      const list = await api("GET", "/api/v2/owner/custom-requests", undefined, owner);
      const r = list.find((r: any) => r.reference === receipt.reference);
      assert.ok(r);
      await api(
        "PUT",
        `/api/v2/owner/custom-requests/${r.id}/quote`,
        {
          requestId: r.id,
          vehicleId: "sedan",
          base: 22000,
          additional: 3000,
          validUntil: new Date(Date.now() + 86400000).toISOString(),
          notes: "Internal draft",
          send: false,
        },
        owner,
      );
      const privateDraft = await api("GET", `/api/v2/custom-requests/${r.id}`, undefined, customer);
      assert.equal(privateDraft.quote, null);
      assert.equal(privateDraft.status, "new");
      await api(
        "PUT",
        `/api/v2/owner/custom-requests/${r.id}/quote`,
        {
          requestId: r.id,
          vehicleId: "sedan",
          base: 22000,
          additional: 3000,
          validUntil: new Date(Date.now() + 86400000).toISOString(),
          notes: "Welcome included",
          send: true,
        },
        owner,
      );
      await api("POST", `/api/v2/custom-requests/${r.id}/accept`, {}, other, 404, {
        "idempotency-key": crypto.randomUUID(),
      });
      const key = crypto.randomUUID();
      const accepted = await api(
        "POST",
        `/api/v2/custom-requests/${r.id}/accept`,
        {},
        customer,
        200,
        { "idempotency-key": key },
      );
      assert.equal(accepted.offer.total, 25000);
      assert.equal(
        (
          await api("POST", `/api/v2/custom-requests/${r.id}/accept`, {}, customer, 200, {
            "idempotency-key": key,
          })
        ).id,
        accepted.id,
      );
    },
  );
  await t.test(
    "Owner-created bookings link to the verified Customer and failed creation leaves no orphan identity",
    async () => {
      const input = {
        journey: journey(25),
        vehicleId: "sedan",
        contact: contact(),
        notes: "Created by Owner",
        idempotencyKey: crypto.randomUUID(),
      };
      const b = await api("POST", "/api/v2/owner/bookings", input, owner);
      assert.equal(b.customerId, customer.session.id);
      assert.equal((await api("GET", `/api/v2/bookings/${b.id}`, undefined, customer)).id, b.id);
      assert.equal((await api("POST", "/api/v2/owner/bookings", input, owner)).id, b.id);
      const failedEmail = `orphan-${stamp}@hamdi.local`;
      await api(
        "POST",
        "/api/v2/owner/bookings",
        {
          ...input,
          journey: { ...journey(25), pickupId: "outside-uae" },
          contact: { ...contact(), email: failedEmail },
          idempotencyKey: crypto.randomUUID(),
        },
        owner,
        409,
      );
      assert.equal(
        (await pool.query("select count(*)::int n from auth.users where email=$1", [failedEmail]))
          .rows[0].n,
        0,
      );
    },
  );
  await t.test("deactivation/reactivation persists and revoked sessions are rejected", async () => {
    await api("PATCH", `/api/v2/owner/vehicles/${vehicle.id}/active`, { active: false }, owner);
    await api("PATCH", `/api/v2/owner/vehicles/${vehicle.id}/active`, { active: true }, owner);
    await api("PATCH", `/api/v2/owner/drivers/${d.id}/active`, { active: false }, owner);
    await api("GET", "/api/v2/driver/bookings", undefined, driver, 403);
    await api("PATCH", `/api/v2/owner/drivers/${d.id}/active`, { active: true }, owner);
    const refreshed = await api("POST", "/api/v2/auth/refresh", {
      refreshToken: other.tokens.refreshToken,
    });
    other = refreshed;
    await api("DELETE", "/api/v2/auth/session", undefined, other);
    await api("GET", "/api/v2/session", undefined, other, 401);
  });
});
