import { readLimitedBody } from "@/lib/bounded-body";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeAdapter, verifyStripeEvent, checkoutEvidence } from "@/lib/stripe-adapter";
import { createServiceClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY)
    return NextResponse.json({ error: "Payments unavailable" }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 262144)
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let stripe;
  let event: Stripe.Event;
  try {
    stripe = stripeAdapter();
    const body = await readLimitedBody(request, 262144);
    if (body.length > 262144) throw new Error("Size");
    event = verifyStripeEvent(
      stripe,
      body,
      request.headers.get("stripe-signature") ?? "",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid provider signature" }, { status: 400 });
  }
  if (
    ![
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "charge.refunded",
    ].includes(event.type)
  )
    return NextResponse.json({ received: true });
  try {
    const service = createServiceClient();
    let session: Stripe.Checkout.Session;
    if (event.type === "charge.refunded") {
      const incoming = event.data.object as Stripe.Charge;
      const refundCharge = await stripe.charges.retrieve(incoming.id);
      const paymentIntentId =
        typeof refundCharge.payment_intent === "string"
          ? refundCharge.payment_intent
          : refundCharge.payment_intent?.id;
      if (!paymentIntentId) throw new Error("Refund intent");
      const refundIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (!refundIntent.metadata?.attempt_id) throw new Error("Refund association");
      const { data: attempt, error } = await service
        .from("payment_attempts")
        .select("session_id")
        .eq("id", refundIntent.metadata.attempt_id)
        .maybeSingle();
      if (error) throw new Error("Store");
      if (!attempt?.session_id) {
        return NextResponse.json({ error: "Original payment evidence pending" }, { status: 409 });
      }
      session = await stripe.checkout.sessions.retrieve(attempt.session_id);
    } else
      session = await stripe.checkout.sessions.retrieve(
        (event.data.object as Stripe.Checkout.Session).id,
      );
    if (event.type === "checkout.session.async_payment_failed") {
      // This event does not constitute charge evidence and must never populate the ledger.
      const { error } = await service.rpc("payment_failed", {
        event_key: event.id,
        attempt: session.metadata?.attempt_id,
        session: session.id,
      });
      if (error) throw new Error("Store");
    } else {
      if (session.payment_status !== "paid")
        return NextResponse.json({ received: true, payment: "pending" });
      const intentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (!intentId) throw new Error("Intent");
      const intent = await stripe.paymentIntents.retrieve(intentId);
      const chargeId =
        typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
      if (!chargeId) throw new Error("Charge");
      const charge = await stripe.charges.retrieve(chargeId);
      const evidence = checkoutEvidence(event.id, session, intent, charge);
      const { error } = await service.rpc("payment_record", evidence);
      if (error) throw new Error("Store");
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Payment evidence could not be reconciled; provider retry required" },
      { status: 503 },
    );
  }
}
