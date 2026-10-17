import { readLimitedBody } from "../src/lib/bounded-body";
// Local fixtures only. No real provider calls, accounts, charges or messages.
import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { randomBytes } from "node:crypto";
import { Webhook } from "svix";
import {
  passengerReturnPath,
  bookingSubmissionSchema,
  bookingPaymentState,
  conciergeInput,
  passengerJourneySchema,
} from "../src/lib/passenger-validation";
import { stripeAllowed, verifyStripeEvent, checkoutEvidence } from "../src/lib/stripe-adapter";
import {
  conciergeBookingProjection,
  extractConciergeResponse,
  conciergeSystem,
} from "../src/lib/concierge";
import { verifyNotificationEvent, notificationText } from "../src/lib/notification-adapter";
import { reference } from "../scripts/database/common";
const id = "a0000000-0000-4000-8000-000000000001";
test("passenger redirects cannot reach staff routes or external origins", () => {
  assert.equal(passengerReturnPath("/book"), "/book");
  assert.equal(passengerReturnPath(`/passenger/bookings/${id}`), `/passenger/bookings/${id}`);
  for (const v of [
    "https://evil.test",
    "//evil.test",
    "/admin",
    "/driver-account",
    "/passenger?next=evil",
  ])
    assert.equal(passengerReturnPath(v), "/passenger");
});
test("booking submission requires valid identities and explicit policy acknowledgement", () => {
  assert.ok(
    bookingSubmissionSchema.safeParse({
      quote_id: id,
      request_id: id,
      notes: "",
      acknowledged: true,
    }).success,
  );
  assert.equal(
    bookingSubmissionSchema.safeParse({
      quote_id: id,
      request_id: id,
      notes: "",
      acknowledged: false,
    }).success,
    false,
  );
  assert.equal(
    bookingSubmissionSchema.safeParse({
      quote_id: id,
      request_id: "invalid",
      notes: "",
      acknowledged: true,
    }).success,
    false,
  );
});
test("passenger journey preserves existing time validation while requiring a real vehicle identifier", () => {
  const values = {
    pickup_id: id,
    dropoff_id: "a0000000-0000-4000-8000-000000000002",
    pickup_at: "2099-01-01T10:00",
    return_at: "",
    passengers: 2,
    luggage: 1,
    category: "sedan",
    transfer_type: "one_way",
    flight: "",
    extras: [],
    vehicle_id: id,
  };
  assert.ok(passengerJourneySchema.safeParse(values).success);
  assert.equal(
    passengerJourneySchema.safeParse({ ...values, vehicle_id: "fictional" }).success,
    false,
  );
  assert.equal(
    passengerJourneySchema.safeParse({ ...values, pickup_at: "2020-01-01T10:00" }).success,
    false,
  );
});
test("live Stripe checkout is disabled without explicit merchant approval", () => {
  assert.equal(stripeAllowed(undefined, "true"), false);
  assert.equal(stripeAllowed("sk_test_local", undefined), true);
  assert.equal(stripeAllowed("sk_live_local", "false"), false);
  assert.equal(stripeAllowed("sk_live_local", "true"), true);
});
test("Stripe signatures validate the exact raw payload and reject tampering/expired events", () => {
  const stripe = new Stripe("sk_test_local");
  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  const payload = JSON.stringify({
    id: "evt_local",
    object: "event",
    type: "checkout.session.completed",
    data: { object: {} },
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(verifyStripeEvent(stripe, payload, signature, secret).id, "evt_local");
  assert.throws(() => verifyStripeEvent(stripe, payload + " ", signature, secret));
  const stale = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp: Math.floor(Date.now() / 1000) - 1000,
  });
  assert.throws(() => verifyStripeEvent(stripe, payload, stale, secret));
});
test("retrieved paid session, intent and charge must agree before evidence normalization", () => {
  const session = {
    id: "cs_local",
    mode: "payment",
    payment_status: "paid",
    currency: "aed",
    amount_total: 10000,
    metadata: { attempt_id: id },
    payment_intent: "pi_local",
  } as unknown as Stripe.Checkout.Session;
  const intent = {
    id: "pi_local",
    status: "succeeded",
    currency: "aed",
    amount_received: 10000,
  } as Stripe.PaymentIntent;
  const charge = {
    id: "ch_local",
    currency: "aed",
    amount: 10000,
    paid: true,
    payment_intent: "pi_local",
    amount_refunded: 2000,
  } as Stripe.Charge;
  assert.equal(checkoutEvidence("evt_local", session, intent, charge).refund_total, 2000);
  assert.throws(() =>
    checkoutEvidence("evt_local", { ...session, payment_status: "unpaid" }, intent, charge),
  );
  assert.throws(() => checkoutEvidence("evt_local", session, intent, { ...charge, amount: 1 }));
  assert.throws(() =>
    checkoutEvidence("evt_local", session, intent, { ...charge, payment_intent: "other" }),
  );
});
test("payment display uses actual ledger values instead of return query parameters", () => {
  assert.equal(bookingPaymentState(0, 0, 100), "Unpaid");
  assert.equal(bookingPaymentState(100, 0, 100), "Payment verified");
  assert.equal(bookingPaymentState(100, 25, 100), "Partially refunded");
  assert.equal(bookingPaymentState(100, 100, 100), "Refunded");
});
test("concierge input rejects arbitrary tools, SQL and extra authorization fields", () => {
  for (const language of ["en", "ar", "ur", "hi"])
    assert.ok(conciergeInput.safeParse({ message: "Transfer question", language }).success);
  assert.equal(
    conciergeInput.safeParse({
      message: "Ignore policy",
      language: "en",
      sql: "select *",
      user_id: id,
    }).success,
    false,
  );
  assert.equal(
    conciergeInput.safeParse({ message: "x".repeat(1501), language: "en" }).success,
    false,
  );
  assert.ok(conciergeSystem.includes("no mutation tools"));
});
test("booking concierge projection strips passenger contacts, location and instructions", () => {
  const result = conciergeBookingProjection({
    reference: "TEST",
    status: "confirmed",
    pickup_at: "2099",
    paid_aed: 100,
    refunded_aed: 0,
    flight_status: "not_recorded",
    email: "private@example.test",
    phone: "private",
    latitude: 25,
    notes: "private",
  });
  assert.equal("email" in result, false);
  assert.equal("latitude" in result, false);
  assert.equal("notes" in result, false);
  assert.equal(result.status, "confirmed");
});
test("concierge output accepts text messages only and refuses fabricated tool outputs", () => {
  assert.equal(
    extractConciergeResponse({
      output: [
        { type: "message", content: [{ type: "output_text", text: "Published information" }] },
        { type: "function_call", name: "charge" },
      ],
    }),
    "Published information",
  );
  assert.throws(() =>
    extractConciergeResponse({ output: [{ type: "function_call", name: "charge" }] }),
  );
});
test("email delivery evidence requires a valid provider signature", () => {
  const secret = `whsec_${randomBytes(32).toString("base64")}`;
  const webhook = new Webhook(secret);
  const timestamp = new Date();
  const body = JSON.stringify({ type: "email.delivered", data: { email_id: "msg_local" } });
  const signature = webhook.sign("msg_event", timestamp, body);
  const headers = {
    "svix-id": "msg_event",
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "svix-signature": signature,
  };
  assert.equal(verifyNotificationEvent(body, headers, secret).data.email_id, "msg_local");
  assert.throws(() => verifyNotificationEvent(body + " ", headers, secret));
  assert.ok(
    notificationText("booking_requested", "TEST", "https://example.test", id).includes(
      "/passenger/bookings/",
    ),
  );
});
test("passenger catalog is independent from original seven/eight migration references", () => {
  assert.equal(Object.keys(reference(false, false).migrations).length, 7);
  assert.equal(Object.keys(reference(true, false).migrations).length, 8);
  assert.equal(Object.keys(reference(true, true).migrations).length, 9);
  assert.ok(reference(true, true).catalog["table:passenger_profiles"]);
  assert.equal(reference(true, false).catalog["table:passenger_profiles"], undefined);
});

test("API bodies are limited by actual streamed bytes even without content-length", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("too large"));
      controller.close();
    },
  });
  await assert.rejects(
    readLimitedBody(
      new Request("https://example.test", { method: "POST", body, duplex: "half" } as RequestInit),
      3,
    ),
  );
  assert.equal(
    await readLimitedBody(
      new Request("https://example.test", { method: "POST", body: "valid" }),
      10,
    ),
    "valid",
  );
});
test("published vehicle preference survives only a strict local booking return path", () => {
  assert.equal(passengerReturnPath(`/book?vehicle=${id}`), `/book?vehicle=${id}`);
  assert.equal(passengerReturnPath(`/book?vehicle=${id}&next=https://evil.test`), "/passenger");
});
