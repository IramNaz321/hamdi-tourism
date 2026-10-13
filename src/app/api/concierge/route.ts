import { readLimitedBody } from "@/lib/bounded-body";
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { conciergeInput } from "@/lib/passenger-validation";
import {
  conciergeSystem,
  conciergeBookingProjection,
  extractConciergeResponse,
} from "@/lib/concierge";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { publicBusinessId } from "@/lib/website";
import { sameOrigin, verifyChallenge } from "@/lib/request-security";
export const runtime = "nodejs";
function result(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  if (
    !process.env.OPENAI_API_KEY ||
    !process.env.OPENAI_MODEL ||
    !process.env.AI_RATE_LIMIT_SECRET ||
    !isConfigured() ||
    !publicBusinessId()
  )
    return result(
      { error: "Travel concierge is currently unavailable. Please contact our team." },
      503,
    );
  if (!sameOrigin(request)) return result({ error: "Request unavailable" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > 8192)
    return result({ error: "Message too long" }, 413);
  let input;
  try {
    const raw = await readLimitedBody(request, 8192);
    if (raw.length > 8192) return result({ error: "Message too long" }, 413);
    input = conciergeInput.parse(JSON.parse(raw));
  } catch {
    return result({ error: "Check your message and language" }, 400);
  }
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user?.email_confirmed_at && !(await verifyChallenge(input.token, "travel_concierge")))
      return result({ error: "Complete the security check or sign in to continue." }, 403);
    let booking: object | undefined;
    if (input.bookingId) {
      if (!user?.email_confirmed_at)
        return result({ error: "Sign in to view booking information" }, 403);
      const { data, error } = await client.rpc("passenger_booking_detail", {
        trip_id: input.bookingId,
      });
      if (error || !data) return result({ error: "Booking information unavailable" }, 403);
      booking = conciergeBookingProjection(data);
    }
    // An anonymous caller gets a validated CAPTCHA token as its pseudonymous bucket, plus a persistent global hourly ceiling.
    const subject = createHmac("sha256", process.env.AI_RATE_LIMIT_SECRET)
      .update(user?.id ?? input.token ?? "")
      .digest("hex");
    const service = createServiceClient();
    const { data: allowed, error: rateError } = await service.rpc("concierge_consume", {
      subject,
      business_id: publicBusinessId(),
    });
    if (rateError || !allowed)
      return result({ error: "Concierge limit reached. Please contact our team." }, 429);
    const { data: context, error } = await client.rpc("concierge_context", {
      business_id: publicBusinessId(),
    });
    if (error || !context?.public)
      return result(
        { error: "Published business information is unavailable. Please contact our team." },
        503,
      );
    // Bound input cost without exposing unpublished or private data.
    const grounded = {
      ...context,
      public: {
        ...context.public,
        locations: (context.public.locations ?? []).slice(0, 80),
        fleet: (context.public.fleet ?? []).slice(0, 80),
      },
      fares: (context.fares ?? []).slice(0, 100),
    };
    if (JSON.stringify(grounded).length > 64000)
      return result(
        { error: "Business information requires a human response. Please contact our team." },
        503,
      );
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        max_output_tokens: 600,
        store: false,
        instructions: conciergeSystem,
        input: [
          {
            role: "user",
            content: JSON.stringify({
              language: input.language,
              question: input.message,
              records: grounded,
              authorized_booking: booking,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok)
      return result(
        { error: "Travel concierge is temporarily unavailable. Contact our team." },
        503,
      );
    return result({ answer: extractConciergeResponse(await response.json()) });
  } catch {
    return result({ error: "Travel concierge is temporarily unavailable. Contact our team." }, 503);
  }
}
