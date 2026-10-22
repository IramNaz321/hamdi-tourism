import Stripe from "stripe";
export function stripeAllowed(secret: string | undefined, liveApproved: string | undefined) {
  return (
    !!secret &&
    (secret.startsWith("sk_test_") || (secret.startsWith("sk_live_") && liveApproved === "true"))
  );
}
export function stripeAdapter(secret = process.env.STRIPE_SECRET_KEY) {
  if (!stripeAllowed(secret, process.env.STRIPE_LIVE_PAYMENTS_APPROVED))
    throw new Error("Payments unavailable.");
  return new Stripe(secret!, { maxNetworkRetries: 2, timeout: 15000 });
}
export function verifyStripeEvent(
  stripe: Stripe,
  body: string,
  signature: string,
  webhookSecret: string,
) {
  return stripe.webhooks.constructEvent(body, signature, webhookSecret, 300);
}
export type PaymentEvidence = {
  event_key: string;
  event_kind: "paid" | "refund";
  attempt: string;
  session: string;
  intent: string;
  charge: string;
  total_minor: number;
  currency_code: "aed";
  refund_total: number;
};
export function checkoutEvidence(
  eventId: string,
  session: Stripe.Checkout.Session,
  intent: Stripe.PaymentIntent,
  charge: Stripe.Charge,
): PaymentEvidence {
  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.currency !== "aed" ||
    !session.amount_total ||
    !session.metadata?.attempt_id ||
    intent.status !== "succeeded" ||
    intent.currency !== "aed" ||
    intent.amount_received !== session.amount_total ||
    charge.currency !== "aed" ||
    charge.amount !== session.amount_total ||
    !charge.paid ||
    charge.payment_intent !== intent.id ||
    (typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id) !== intent.id
  )
    throw new Error("Payment evidence mismatch.");
  return {
    event_key: eventId,
    event_kind: charge.amount_refunded > 0 ? "refund" : "paid",
    attempt: session.metadata.attempt_id,
    session: session.id,
    intent: intent.id,
    charge: charge.id,
    total_minor: session.amount_total,
    currency_code: "aed",
    refund_total: charge.amount_refunded,
  };
}
