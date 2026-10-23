import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ServiceError } from "../../frontend-v2/src/domain.ts";
import { authenticate } from "./auth.ts";
import { requireRole, transaction, replay, remember, lock } from "./db.ts";
import { getBooking, saveBooking, activity } from "./bookings.ts";
export async function registerPayments(app: FastifyInstance) {
  app.post("/api/v2/bookings/:id/checkout", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "customer");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    return transaction(async (db) => {
      const b = await getBooking(db, id);
      if (b.customerId !== actor.id) throw new ServiceError("NOT_FOUND", "Booking unavailable.");
      if (b.status === "cancelled" || b.cancellationRequested)
        throw new ServiceError(
          "CANNOT_PAY",
          "This booking cannot accept payment in its current state.",
        );
      if (process.env.LOCAL_TEST_MODE !== "true")
        throw new ServiceError(
          "PAYMENTS_NOT_CONFIGURED",
          "Online payments are not configured yet. Contact the Owner.",
        );
      return { kind: "demo" as const, bookingId: id };
    });
  });
  app.post("/api/v2/bookings/:id/test-payment", async (req) => {
    if (process.env.LOCAL_TEST_MODE !== "true")
      throw new ServiceError("NOT_FOUND", "Endpoint unavailable.");
    const actor = await authenticate(req);
    requireRole(actor, "customer");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { result } = z.object({ result: z.enum(["paid", "failed"]) }).parse(req.body);
    return transaction(async (db) => {
      const b = await getBooking(db, id);
      if (b.customerId !== actor.id) throw new ServiceError("NOT_FOUND", "Booking unavailable.");
      if (b.status === "cancelled" || b.cancellationRequested)
        throw new ServiceError("CANNOT_PAY", "This booking cannot accept payment.");
      if (b.paymentStatus === "paid" || b.amountPaid >= b.offer.total) return b;
      b.paymentStatus = result;
      if (result === "paid") b.amountPaid = b.offer.total;
      activity(
        b,
        actor,
        result === "paid"
          ? "Local test payment recorded; no money charged"
          : "Local test payment failed",
      );
      await saveBooking(db, b);
      return b;
    });
  });
  app.post("/api/v2/bookings/:id/cancellation", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "customer");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { reason } = z.object({ reason: z.string().trim().max(1000).optional() }).parse(req.body);
    return transaction(async (db) => {
      await lock(db, "scheduling");
      const b = await getBooking(db, id);
      if (b.customerId !== actor.id) throw new ServiceError("NOT_FOUND", "Booking unavailable.");
      if (!["pending", "confirmed"].includes(b.status) || b.tripProgress.outbound.startedAt)
        throw new ServiceError(
          "CANNOT_CANCEL",
          "This journey can no longer be cancelled online. Contact the Owner.",
        );
      if (b.cancellationRequested) return b;
      b.cancellationRequested = true;
      b.cancellation = {
        status: "requested",
        reason: reason || "My travel plans have changed.",
        ownerNote: "",
        requestedAt: new Date().toISOString(),
        resolvedAt: "",
      };
      activity(b, actor, "Cancellation requested");
      await saveBooking(db, b);
      return b;
    });
  });
  app.post("/api/v2/owner/bookings/:id/cancellation", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "owner");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { decision, note } = z
      .object({ decision: z.enum(["approved", "declined"]), note: z.string().max(1000) })
      .parse(req.body);
    return transaction(async (db) => {
      await lock(db, "scheduling");
      const b = await getBooking(db, id);
      if (!b.cancellationRequested)
        throw new ServiceError("ALREADY_RESOLVED", "This request has already been resolved.");
      if (!["pending", "confirmed"].includes(b.status) || b.tripProgress.outbound.startedAt)
        throw new ServiceError(
          "INVALID_STATE",
          "This trip cannot be cancelled in its current state.",
        );
      b.cancellationRequested = false;
      b.cancellation = {
        ...b.cancellation,
        status: decision,
        ownerNote: note,
        resolvedAt: new Date().toISOString(),
      };
      if (decision === "approved") {
        b.status = "cancelled";
        if (b.assignment)
          b.assignedDriverIds = Array.from(
            new Set([...b.assignedDriverIds, b.assignment.driverId]),
          );
        b.assignment = null;
      }
      activity(
        b,
        actor,
        decision === "approved"
          ? "Cancellation approved; assignments released"
          : "Cancellation declined",
      );
      await saveBooking(db, b);
      return b;
    });
  });
  app.post("/api/v2/owner/bookings/:id/refund", async (req) => {
    if (process.env.LOCAL_TEST_MODE !== "true")
      throw new ServiceError("PAYMENTS_NOT_CONFIGURED", "Refund provider is not configured.");
    const actor = await authenticate(req);
    requireRole(actor, "owner");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { amount } = z.object({ amount: z.number().int().positive() }).parse(req.body);
    const key = z.string().min(1).parse(req.headers["idempotency-key"]);
    return transaction(async (db) => {
      const b = await getBooking(db, id);
      if (await replay(db, actor.id, key, `refund:${id}`)) return b;
      if (b.status !== "cancelled")
        throw new ServiceError("CANCEL_FIRST", "Approve cancellation before reviewing a refund.");
      if (amount > b.amountPaid - b.amountRefunded)
        throw new ServiceError("INVALID_REFUND", "Refund cannot exceed the remaining paid amount.");
      b.amountRefunded += amount;
      if (b.amountRefunded === b.amountPaid) b.paymentStatus = "refunded";
      activity(b, actor, "Local test refund recorded; no money moved");
      await remember(db, actor.id, key, `refund:${id}`, id);
      await saveBooking(db, b);
      return b;
    });
  });
}
