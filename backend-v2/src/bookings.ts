import type { FastifyInstance } from "fastify";
import type { PoolClient } from "pg";
import { z } from "zod";
import {
  bookingRecordSchema,
  bookingInputSchema,
  journeySchema,
  ownerBookingInputSchema,
  assignmentInputSchema,
  tripActionSchema,
  ServiceError,
  todayUae,
  fullPickup,
  type Booking,
  type Journey,
} from "../../frontend-v2/src/domain.ts";
import { catalog } from "../../frontend-v2/src/services/fixtures.ts";
import { assignmentIssue } from "../../frontend-v2/src/services/scheduling.ts";
import { authenticate } from "./auth.ts";
import {
  pool,
  transaction,
  requireRole,
  lock,
  replay,
  remember,
  type Actor,
  visibleRead,
} from "./db.ts";
import { resources } from "./resources.ts";
import { routeTariff } from "./uae-places.ts";
export const bookingDto = (row: { data: unknown }) => bookingRecordSchema.parse(row.data);
export async function getBooking(db: PoolClient, id: string) {
  const { rows } = await db.query("select data from hamdi.bookings where id=$1 for update", [id]);
  if (!rows[0]) throw new ServiceError("NOT_FOUND", "Booking not found.");
  return bookingDto(rows[0]);
}
export async function saveBooking(db: PoolClient, b: Booking) {
  bookingRecordSchema.parse(b);
  await db.query(
    "update hamdi.bookings set data=$2,status=$3,driver_id=$4,vehicle_id=$5,revision=revision+1 where id=$1",
    [
      b.id,
      JSON.stringify(b),
      b.status,
      b.assignment?.driverId ?? null,
      b.assignment?.fleetVehicleId ?? null,
    ],
  );
}
export function activity(b: Booking, actor: Actor, message: string) {
  b.activity.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    message,
    actor: actor.role,
  });
}
async function visibleBooking(actor: Actor, id: string) {
  const rows = await visibleRead<{ data: unknown }>(
    actor,
    "select data from hamdi.bookings where id=$1",
    [id],
  );
  if (!rows[0])
    throw new ServiceError("NOT_FOUND", "This booking is unavailable for this account.");
  return bookingDto(rows[0]);
}
export async function resolvedPlaces(j: Journey, db: PoolClient | typeof pool = pool) {
  const { rows } = await db.query(
    "select id,data from hamdi.places where id=any($1::text[]) and country_code='AE' order by id",
    [[j.pickupId, j.destinationId]],
  );
  const pickup = rows.find((r) => r.id === j.pickupId)?.data;
  const destination = rows.find((r) => r.id === j.destinationId)?.data;
  if (!pickup || !destination)
    throw new ServiceError(
      "INVALID_LOCATION",
      "Select verified UAE pickup and destination places.",
    );
  return { pickup, destination };
}
export async function createQuote(journey: Journey, db: PoolClient | typeof pool = pool) {
  const j = journeySchema.parse(journey);
  const { pickup, destination } = await resolvedPlaces(j, db);
  const { factor, durationMinutes } = routeTariff(pickup, destination);
  const ids = new Set(j.extraIds);
  if (
    ids.size !== j.extraIds.length ||
    j.extraIds.some((id) => !catalog.extras.some((e) => e.id === id))
  )
    throw new ServiceError("INVALID_EXTRA", "Choose only published extras, once each.");
  const base: Record<string, number> = { sedan: 18000, luxury: 26000, family: 32000 };
  const extras =
    j.extraIds.reduce((n, id) => n + catalog.extras.find((e) => e.id === id)!.amount, 0) *
    (j.tripType === "return" ? 2 : 1);
  const offers = catalog.vehicles
    .filter((v) => v.passengers >= j.passengers && v.bags >= j.bags)
    .map((v) => {
      const transfer = Math.round(base[v.id] * factor);
      const returnTransfer = j.tripType === "return" ? Math.round(transfer * 0.9) : 0;
      return {
        vehicleId: v.id,
        transfer,
        returnTransfer,
        extras,
        total: transfer + returnTransfer + extras,
      };
    });
  if (!offers.length)
    throw new ServiceError(
      "NO_CAPACITY",
      "No published vehicle fits your group. Request a custom quote.",
    );
  const quote = {
    id: crypto.randomUUID(),
    journey: j,
    offers,
    durationMinutes,
    expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
  };
  await db.query("insert into hamdi.quotes(id,data,expires_at) values($1,$2,$3)", [
    quote.id,
    quote,
    quote.expiresAt,
  ]);
  return quote;
}
export async function insertBooking(
  db: PoolClient,
  actor: Actor,
  journey: Journey,
  vehicleId: string,
  contact: Booking["contact"],
  offer: Booking["offer"],
  durationMinutes: number,
  notes: string,
  flightNumber: string,
  customerId = actor.id,
  labels?: { pickupLabel: string; destinationLabel: string },
) {
  const id = crypto.randomUUID();
  const b = bookingRecordSchema.parse({
    id,
    reference: `HT-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`,
    customerId,
    createdAt: new Date().toISOString(),
    journey,
    vehicleId,
    contact,
    offer,
    durationMinutes,
    notes,
    flightNumber,
    status: "pending",
    paymentStatus: "unpaid",
    cancellationRequested: false,
    expectedEnd: new Date(fullPickup(journey) + durationMinutes * 60000).toISOString(),
    ...labels,
  });
  activity(b, actor, `${actor.role === "owner" ? "Owner" : "Customer"} created booking`);
  await db.query(
    "insert into hamdi.bookings(id,reference,customer_id,status,pickup_at,data) values($1,$2,$3,$4,$5,$6)",
    [id, b.reference, customerId, b.status, new Date(fullPickup(journey)), b],
  );
  return b;
}
async function activeDriver(actor: Actor) {
  requireRole(actor, "driver");
  const { rows } = await pool.query(
    "select id from hamdi.drivers where id=$1 and active and onboarding_status='approved'",
    [actor.driverId],
  );
  if (!rows[0])
    throw new ServiceError(
      "FORBIDDEN",
      "Your Driver account awaits activation or is inactive. Contact the Owner.",
    );
}
export async function registerBookings(app: FastifyInstance) {
  app.get("/api/v2/catalog", async () => {
    const { rows } = await pool.query(
      "select data from hamdi.places where country_code='AE' and source='catalog' order by data->>'city', data->>'name'",
    );
    return { ...catalog, locations: rows.map((r) => r.data) };
  });
  app.post("/api/v2/quotes", async (req) => createQuote(journeySchema.parse(req.body)));
  app.post("/api/v2/bookings", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "customer");
    const v = bookingInputSchema.parse(req.body);
    if (v.contact.email.toLowerCase() !== actor.email)
      throw new ServiceError("EMAIL_MISMATCH", "Use your verified account email.");
    return transaction(async (db) => {
      const prior = await replay(db, actor.id, v.idempotencyKey, "create-booking");
      if (prior) return getBooking(db, prior);
      const { rows } = await db.query(
        "select data from hamdi.quotes where id=$1 and expires_at>now()",
        [v.quoteId],
      );
      if (!rows[0]) throw new ServiceError("QUOTE_EXPIRED", "Refresh the fare before booking.");
      const q = rows[0].data;
      journeySchema.parse(q.journey);
      const offer = q.offers.find((o: any) => o.vehicleId === v.vehicleId);
      if (!offer) throw new ServiceError("INVALID_VEHICLE", "Select a vehicle from your quote.");
      const p = await resolvedPlaces(q.journey, db);
      const b = await insertBooking(
        db,
        actor,
        q.journey,
        v.vehicleId,
        v.contact,
        offer,
        q.durationMinutes,
        v.notes,
        v.flightNumber,
        actor.id,
        { pickupLabel: p.pickup.shortName, destinationLabel: p.destination.shortName },
      );
      await remember(db, actor.id, v.idempotencyKey, "create-booking", b.id);
      await db.query("update hamdi.profiles set name=$2 where user_id=$1", [
        actor.id,
        v.contact.name,
      ]);
      return b;
    });
  });
  app.get("/api/v2/bookings", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "customer");
    return (
      await visibleRead<{ data: unknown }>(
        actor,
        "select data from hamdi.bookings where customer_id=$1 order by created_at desc",
        [actor.id],
      )
    ).map(bookingDto);
  });
  app.get("/api/v2/bookings/:id", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "customer");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    return visibleBooking(actor, id);
  });
  app.get("/api/v2/owner/bookings", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "owner");
    return (
      await visibleRead<{ data: unknown }>(
        actor,
        "select data from hamdi.bookings order by created_at desc",
      )
    ).map(bookingDto);
  });
  app.get("/api/v2/owner/bookings/:id", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "owner");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    return visibleBooking(actor, id);
  });
  app.put("/api/v2/owner/bookings/:id/assignment", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "owner");
    const v = assignmentInputSchema.parse(req.body);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    if (id !== v.bookingId)
      throw new ServiceError("INVALID_INPUT", "Booking identifiers do not match.");
    return transaction(async (db) => {
      await lock(db, "scheduling");
      const b = await getBooking(db, id);
      if (
        !["pending", "confirmed"].includes(b.status) ||
        b.cancellationRequested ||
        b.tripProgress.outbound.startedAt
      )
        throw new ServiceError(
          "ASSIGNMENT_LOCKED",
          "This trip’s assignment cannot change in its current state.",
        );
      const r = await resources(db);
      const all = (await db.query("select data from hamdi.bookings")).rows.map(bookingDto);
      const issue = assignmentIssue(b, v.driverId, v.fleetVehicleId, v.expectedEnd, all, r);
      if (issue) throw new ServiceError("SCHEDULING_CONFLICT", issue);
      const d = r.drivers.find((d) => d.id === v.driverId)!;
      const c = r.vehicles.find((c) => c.id === v.fleetVehicleId)!;
      b.assignment = {
        driverId: d.id,
        fleetVehicleId: c.id,
        assignedAt: new Date(
          Math.max(Date.now(), Date.parse(b.assignment?.assignedAt ?? "1970-01-01") + 1),
        ).toISOString(),
        driverName: d.name,
        driverPhone: d.phone,
        vehicleName: c.name,
        registration: c.registration,
      };
      b.assignedDriverIds = Array.from(new Set([...b.assignedDriverIds, d.id]));
      b.expectedEnd = new Date(v.expectedEnd).toISOString();
      activity(b, actor, `Assigned ${d.name} · ${c.registration}`);
      await saveBooking(db, b);
      return b;
    });
  });
  app.post("/api/v2/owner/bookings/:id/confirm", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "owner");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    return transaction(async (db) => {
      await lock(db, "scheduling");
      const b = await getBooking(db, id);
      if (b.status === "confirmed") return b;
      if (b.status !== "pending" || b.cancellationRequested)
        throw new ServiceError("INVALID_STATE", "This booking cannot be confirmed.");
      if (!b.assignment)
        throw new ServiceError(
          "ASSIGNMENT_REQUIRED",
          "Save a driver and vehicle assignment first.",
        );
      const issue = assignmentIssue(
        b,
        b.assignment.driverId,
        b.assignment.fleetVehicleId,
        b.expectedEnd,
        (await db.query("select data from hamdi.bookings")).rows.map(bookingDto),
        await resources(db),
      );
      if (issue) throw new ServiceError("SCHEDULING_CONFLICT", issue);
      b.status = "confirmed";
      activity(b, actor, "Owner confirmed booking");
      await saveBooking(db, b);
      return b;
    });
  });
  app.get("/api/v2/driver/bookings", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "driver");
    await activeDriver(actor);
    const { rows } = await pool.query(
      "select data from hamdi.bookings where driver_id=$1::uuid or (status='cancelled' and data->'assignedDriverIds' ? $1::text) order by pickup_at",
      [actor.driverId],
    );
    return rows.map(bookingDto);
  });
  app.get("/api/v2/driver/bookings/:id", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "driver");
    await activeDriver(actor);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { rows } = await pool.query(
      "select data from hamdi.bookings where id=$1 and (driver_id=$2::uuid or (status='cancelled' and data->'assignedDriverIds' ? $2::text))",
      [id, actor.driverId],
    );
    if (!rows[0]) throw new ServiceError("NOT_FOUND", "This trip is not assigned to you.");
    return bookingDto(rows[0]);
  });
  app.post("/api/v2/driver/bookings/:id/progress", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "driver");
    await activeDriver(actor);
    const v = tripActionSchema.parse(req.body);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    if (id !== v.bookingId)
      throw new ServiceError("INVALID_INPUT", "Booking identifiers do not match.");
    return transaction(async (db) => {
      await lock(db, "scheduling");
      const b = await getBooking(db, id);
      if (b.assignment?.driverId !== actor.driverId)
        throw new ServiceError("NOT_FOUND", "This trip is no longer assigned to you.");
      if (v.expectedAssignmentAt !== b.assignment.assignedAt)
        throw new ServiceError("STALE_ASSIGNMENT", "The assignment changed. Refresh the trip.");
      const operation = `trip:${id}:${v.leg}:${v.action}`;
      if (await replay(db, actor.id, v.idempotencyKey, operation)) return b;
      if (v.leg === "return" && b.journey.tripType !== "return")
        throw new ServiceError("INVALID_LEG", "This is a one-way booking.");
      if (["pending", "cancelled"].includes(b.status))
        throw new ServiceError(
          "INVALID_STATE",
          "The Owner must confirm this trip before it starts.",
        );
      const leg = b.tripProgress[v.leg];
      if (v.action === "start") {
        if (leg.completedAt)
          throw new ServiceError("INVALID_STATE", "A completed leg cannot restart.");
        if (!leg.startedAt) {
          if (b.status !== "confirmed")
            throw new ServiceError("INVALID_STATE", "Finish the active leg first.");
          if (b.cancellationRequested)
            throw new ServiceError(
              "CANCELLATION_PENDING",
              "The Owner must resolve the cancellation request.",
            );
          if (v.leg === "return" && !b.tripProgress.outbound.completedAt)
            throw new ServiceError("INVALID_STATE", "Complete the outbound trip first.");
          const active = await db.query(
            "select id from hamdi.bookings where id<>$1 and status='in_progress' and (driver_id=$2 or vehicle_id=$3)",
            [id, actor.driverId, b.assignment.fleetVehicleId],
          );
          if (active.rowCount)
            throw new ServiceError(
              "ACTIVE_TRIP",
              "This driver or vehicle already has an active trip.",
            );
          const r = await resources(db);
          const driver = r.drivers.find((d) => d.id === actor.driverId);
          const vehicle = r.vehicles.find((c) => c.id === b.assignment!.fleetVehicleId);
          const today = todayUae();
          if (
            !driver?.active ||
            !driver.available ||
            !vehicle?.active ||
            driver.licenceUntil < today ||
            vehicle.registrationUntil < today
          )
            throw new ServiceError(
              "RESOURCE_UNAVAILABLE",
              "Contact the Owner: assigned resources are unavailable.",
            );
          if (process.env.LOCAL_TEST_MODE !== "true") {
            const pickup =
              v.leg === "return"
                ? Date.parse(`${b.journey.returnDate}T${b.journey.returnTime}:00+04:00`)
                : fullPickup(b.journey);
            if (Date.now() < pickup - 30 * 60000)
              throw new ServiceError(
                "TOO_EARLY",
                "This trip can start within 30 minutes of pickup.",
              );
          }
          leg.startedAt = new Date().toISOString();
          b.status = "in_progress";
          activity(
            b,
            actor,
            `${v.leg === "return" ? "Return trip" : "Trip"} started · ${actor.name}`,
          );
        }
      } else {
        if (!leg.completedAt) {
          if (!leg.startedAt || b.status !== "in_progress")
            throw new ServiceError("INVALID_STATE", "Start this leg before confirming drop-off.");
          leg.completedAt = new Date().toISOString();
          b.status =
            b.journey.tripType === "return" && v.leg === "outbound" ? "confirmed" : "completed";
          activity(
            b,
            actor,
            `${v.leg === "return" ? "Return trip" : "Trip"} completed · ${actor.name}${b.status === "confirmed" ? " · Awaiting return" : ""}`,
          );
        }
      }
      await remember(db, actor.id, v.idempotencyKey, operation, b.id);
      await saveBooking(db, b);
      return b;
    });
  });
}
