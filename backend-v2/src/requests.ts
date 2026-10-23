import type { FastifyInstance } from "fastify";
import type { PoolClient } from "pg";
import { z } from "zod";
import {
  customRequestSchema,
  customRequestRecordSchema,
  ownerQuoteInputSchema,
  ownerBookingInputSchema,
  defaultJourney,
  journeySchema,
  fullPickup,
  ServiceError,
  type CustomRequestRecord,
} from "../../frontend-v2/src/domain.ts";
import { catalog } from "../../frontend-v2/src/services/fixtures.ts";
import { authenticate, admin } from "./auth.ts";
import { pool, transaction, requireRole, replay, remember, lock } from "./db.ts";
import { createQuote, insertBooking, getBooking, resolvedPlaces } from "./bookings.ts";
async function getRequest(db: PoolClient, id: string) {
  const { rows } = await db.query("select data from hamdi.custom_requests where id=$1 for update", [
    id,
  ]);
  if (!rows[0]) throw new ServiceError("NOT_FOUND", "Request not found.");
  return customRequestRecordSchema.parse(rows[0].data);
}
async function saveRequest(db: PoolClient, r: CustomRequestRecord) {
  await db.query("update hamdi.custom_requests set data=$2 where id=$1", [r.id, r]);
}
function addEvent(r: CustomRequestRecord, message: string, actor: "customer" | "owner") {
  r.activity.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), message, actor });
}
function customerRequest(r: CustomRequestRecord): CustomRequestRecord {
  if (r.status !== "draft") return r;
  return {
    ...r,
    status: "new",
    quote: null,
    activity: r.activity.filter((a) => a.message !== "Owner saved a quote draft"),
  };
}
export async function registerRequests(app: FastifyInstance) {
  app.post(
    "/api/v2/custom-requests",
    { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } },
    async (req) => {
      const v = customRequestSchema.parse(req.body);
      const ids = z
        .object({ pickupPlaceId: z.string(), destinationPlaceId: z.string() })
        .parse(req.body);
      const j = {
        ...defaultJourney(),
        pickupId: ids.pickupPlaceId,
        destinationId: ids.destinationPlaceId,
        date: v.date,
        time: v.time,
        passengers: Math.min(v.passengers, 7),
        bags: Math.min(v.bags, 6),
      };
      journeySchema.parse(j);
      const p = await resolvedPlaces(j);
      return transaction(async (db) => {
        const actor = `request:${v.contact.email.toLowerCase()}`;
        const prior = await replay(db, actor, v.idempotencyKey, "custom-request");
        if (prior) {
          const r = await getRequest(db, prior);
          return { reference: r.reference, status: "pending_review" as const };
        }
        const id = crypto.randomUUID();
        const r = customRequestRecordSchema.parse({
          ...v,
          id,
          reference: `CQ-${id.slice(0, 8).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          pickup: p.pickup.shortName,
          destination: p.destination.shortName,
          pickupPlaceId: ids.pickupPlaceId,
          destinationPlaceId: ids.destinationPlaceId,
          status: "new",
          quote: null,
          bookingId: null,
          activity: [],
        });
        addEvent(r, "Customer submitted a custom request", "customer");
        await db.query(
          "insert into hamdi.custom_requests(id,reference,email,data) values($1,$2,$3,$4)",
          [id, r.reference, v.contact.email.toLowerCase(), r],
        );
        await remember(db, actor, v.idempotencyKey, "custom-request", id);
        return { reference: r.reference, status: "pending_review" as const };
      });
    },
  );
  for (const prefix of ["", "/owner"]) {
    app.get(`/api/v2${prefix}/custom-requests`, async (req) => {
      const actor = await authenticate(req);
      requireRole(actor, prefix ? "owner" : "customer");
      const { rows } = prefix
        ? await pool.query("select data from hamdi.custom_requests order by created_at desc")
        : await pool.query(
            "select data from hamdi.custom_requests where email=$1 order by created_at desc",
            [actor.email],
          );
      return rows.map((r) => {
        const value = customRequestRecordSchema.parse(r.data);
        return prefix ? value : customerRequest(value);
      });
    });
    app.get(`/api/v2${prefix}/custom-requests/:id`, async (req) => {
      const actor = await authenticate(req);
      requireRole(actor, prefix ? "owner" : "customer");
      const { id } = z.object({ id: z.uuid() }).parse(req.params);
      return transaction(async (db) => {
        const r = await getRequest(db, id);
        if (!prefix && r.contact.email.toLowerCase() !== actor.email)
          throw new ServiceError("NOT_FOUND", "Request unavailable.");
        return prefix ? r : customerRequest(r);
      });
    });
  }
  app.put("/api/v2/owner/custom-requests/:id/quote", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "owner");
    const v = ownerQuoteInputSchema.parse(req.body);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    if (v.requestId !== id)
      throw new ServiceError("INVALID_INPUT", "Request identifiers do not match.");
    return transaction(async (db) => {
      const r = await getRequest(db, id);
      if (r.bookingId)
        throw new ServiceError("INVALID_STATE", "This request already has a booking.");
      const vehicle = catalog.vehicles.find((c) => c.id === v.vehicleId);
      if (!vehicle || vehicle.passengers < r.passengers || vehicle.bags < r.bags)
        throw new ServiceError("NO_CAPACITY", "Choose a vehicle that fits this group.");
      const expiry = Date.parse(v.validUntil);
      const pickup = Date.parse(`${r.date}T${r.time}:00+04:00`);
      if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry >= pickup)
        throw new ServiceError(
          "INVALID_EXPIRY",
          "Quote expiry must be in the future and before pickup.",
        );
      if (v.base + v.additional <= 0)
        throw new ServiceError("INVALID_FARE", "Enter a positive fare.");
      r.quote = {
        vehicleId: v.vehicleId,
        base: v.base,
        additional: v.additional,
        total: v.base + v.additional,
        validUntil: new Date(expiry).toISOString(),
        notes: v.notes,
        sentAt: v.send ? new Date().toISOString() : "",
      };
      r.status = v.send ? "quoted" : "draft";
      addEvent(
        r,
        v.send ? "Owner shared a quote for acceptance" : "Owner saved a quote draft",
        "owner",
      );
      await saveRequest(db, r);
      return r;
    });
  });
  app.post("/api/v2/custom-requests/:id/accept", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "customer");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const key = z.string().min(1).parse(req.headers["idempotency-key"]);
    return transaction(async (db) => {
      const r = await getRequest(db, id);
      if (r.contact.email.toLowerCase() !== actor.email)
        throw new ServiceError("NOT_FOUND", "Request unavailable.");
      if (r.bookingId) return getBooking(db, r.bookingId);
      if (r.status !== "quoted" || !r.quote)
        throw new ServiceError("NOT_READY", "This quote is not ready to accept.");
      if (Date.parse(r.quote.validUntil) <= Date.now())
        throw new ServiceError("QUOTE_EXPIRED", "Ask the Owner to update this expired quote.");
      const j = journeySchema.parse({
        ...defaultJourney(),
        pickupId: r.pickupPlaceId,
        destinationId: r.destinationPlaceId,
        date: r.date,
        time: r.time,
        passengers: r.passengers,
        bags: r.bags,
      });
      await resolvedPlaces(j, db);
      const vehicle = catalog.vehicles.find((v) => v.id === r.quote!.vehicleId);
      if (!vehicle || vehicle.passengers < r.passengers || vehicle.bags < r.bags)
        throw new ServiceError("NO_CAPACITY", "Ask the Owner to update this quote.");
      const b = await insertBooking(
        db,
        actor,
        j,
        r.quote.vehicleId,
        r.contact,
        {
          vehicleId: r.quote.vehicleId,
          transfer: r.quote.base,
          returnTransfer: 0,
          extras: r.quote.additional,
          total: r.quote.total,
        },
        100,
        r.quote.notes,
        "",
        actor.id,
        { pickupLabel: r.pickup, destinationLabel: r.destination },
      );
      r.bookingId = b.id;
      r.status = "converted";
      addEvent(r, "Customer accepted quote; booking created", "customer");
      await saveRequest(db, r);
      await remember(db, actor.id, key, `accept:${id}`, b.id);
      return b;
    });
  });
  app.post("/api/v2/owner/bookings", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "owner");
    const v = ownerBookingInputSchema.parse(req.body);
    let createdUserId: string | undefined;
    try {
      return await transaction(async (db) => {
        const prior = await replay(db, actor.id, v.idempotencyKey, "owner-create");
        if (prior) return getBooking(db, prior);
        await lock(db, `customer:${v.contact.email.toLowerCase()}`);
        let customer = (
          await db.query("select user_id,role from hamdi.profiles where email=$1", [
            v.contact.email.toLowerCase(),
          ])
        ).rows[0];
        if (customer && customer.role !== "customer")
          throw new ServiceError("INVALID_CUSTOMER", "Use a Customer email for this booking.");
        if (!customer) {
          const { data, error } = await admin.auth.admin.createUser({
            email: v.contact.email.toLowerCase(),
            email_confirm: true,
          });
          if (error || !data.user)
            throw new ServiceError(
              "EMAIL_IN_USE",
              "This account cannot be provisioned. Ask the customer to sign in first.",
            );
          createdUserId = data.user.id;
          await db.query(
            "insert into hamdi.profiles(user_id,email,name,role) values($1,$2,$3,'customer')",
            [data.user.id, v.contact.email.toLowerCase(), v.contact.name],
          );
          customer = { user_id: data.user.id };
        }
        const q = await createQuote(v.journey, db);
        const offer = q.offers.find((o) => o.vehicleId === v.vehicleId);
        if (!offer) throw new ServiceError("NO_CAPACITY", "Choose an eligible category.");
        const p = await resolvedPlaces(v.journey, db);
        const b = await insertBooking(
          db,
          actor,
          v.journey,
          v.vehicleId,
          v.contact,
          offer,
          q.durationMinutes,
          v.notes,
          "",
          customer.user_id,
          { pickupLabel: p.pickup.shortName, destinationLabel: p.destination.shortName },
        );
        await remember(db, actor.id, v.idempotencyKey, "owner-create", b.id);
        return b;
      });
    } catch (error) {
      if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
      throw error;
    }
  });
}
