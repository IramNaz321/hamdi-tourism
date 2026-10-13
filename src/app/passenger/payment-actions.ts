"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { requirePassenger } from "@/lib/passenger";
import { createServiceClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/auth";
import { stripeAdapter, stripeAllowed } from "@/lib/stripe-adapter";
import type { PassengerState } from "./actions";
export async function checkout(_: PassengerState, form: FormData): Promise<PassengerState> {
  const { user } = await requirePassenger();
  const id = z.uuid().safeParse(form.get("id"));
  if (
    !id.success ||
    !stripeAllowed(process.env.STRIPE_SECRET_KEY, process.env.STRIPE_LIVE_PAYMENTS_APPROVED)
  )
    return { error: "Online payments are currently unavailable. Contact our team." };
  let target: string | undefined;
  try {
    const stripe = stripeAdapter();
    const service = createServiceClient();
    const origin = siteOrigin();
    const { data: attempt, error } = await service.rpc("payment_reserve", {
      trip: id.data,
      passenger: user.id,
    });
    if (error || !attempt)
      return {
        error: "Payment is unavailable or already recorded. Contact our team for reconciliation.",
      };
    if (attempt.session_id) {
      const existing = await stripe.checkout.sessions.retrieve(attempt.session_id);
      if (existing.status !== "open" || !existing.url)
        return { error: "This checkout has ended. Contact our team before retrying." };
      target = existing.url;
    } else {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          client_reference_id: id.data,
          metadata: { attempt_id: attempt.id },
          payment_intent_data: { metadata: { attempt_id: attempt.id } },
          line_items: [
            {
              price_data: {
                currency: "aed",
                unit_amount: Number(attempt.amount_minor),
                product_data: { name: `Hamdi Tourism transfer ${attempt.reference}` },
              },
              quantity: 1,
            },
          ],
          success_url: `${origin}/passenger/bookings/${id.data}?checkout=returned`,
          cancel_url: `${origin}/passenger/bookings/${id.data}?checkout=cancelled`,
          expires_at: Math.floor(new Date(attempt.created_at).getTime() / 1000) + 3600,
        },
        { idempotencyKey: `hamdi-checkout:${attempt.id}` },
      );
      const { error: attachError } = await service.rpc("payment_attach", {
        attempt: attempt.id,
        session: session.id,
      });
      if (attachError)
        return { error: "Checkout could not be recorded. Contact our team before paying." };
      target = session.url ?? undefined;
    }
    if (!target || new URL(target).hostname !== "checkout.stripe.com")
      return { error: "Secure payment checkout unavailable." };
  } catch {
    return { error: "Payment provider is temporarily unavailable. Retry or contact our team." };
  }
  redirect(target!);
}
