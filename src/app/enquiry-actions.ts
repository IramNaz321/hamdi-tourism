"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { publicBusinessId, enquiriesConfigured } from "@/lib/website";
import {
  journeySchema,
  journeyData,
  formatJourneyNotes,
  type Quote,
} from "@/lib/booking-validation";
import { siteOrigin } from "@/lib/auth";
import { publishedFleetCapacityError } from "@/lib/fleet-capacity";
import { headers } from "next/headers";
export type EnquiryState = { error?: string; quote?: Quote; reference?: string; manual?: boolean };
const safeErrors = [
  "Online enquiries are unavailable",
  "Check your journey details",
  "Choose published locations",
  "A quote is not available for this route and category",
  "Return pricing is not available for this route",
  "Choose valid optional extras",
  "Check your pickup and return times",
  "Please contact our team to continue your enquiry",
  "Pricing changed. Please request a fresh quote",
  "No vehicles are published for online transfer enquiries.",
  "No published vehicle in this category can carry the selected passengers and luggage.",
  "Published vehicle information is unavailable. Please contact our team.",
];
function publicError(message: string) {
  return safeErrors.includes(message)
    ? message
    : "We could not complete your enquiry. Please try again or contact our team.";
}
async function publishedVehicleError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  journey: z.infer<typeof journeySchema>,
) {
  const { data, error } = await supabase.rpc("website_content", {
    business_id: publicBusinessId(),
  });
  if (error) {
    console.error("Unable to verify published vehicle capacity", { code: error.code });
    return "Published vehicle information is unavailable. Please contact our team.";
  }
  const parsed = z
    .object({
      fleet: z.array(
        z.object({
          category: z.enum(["sedan", "suv", "van", "luxury"]),
          capacity: z.number().int().min(1).max(1000),
          luggage_capacity: z.number().int().min(0).max(1000).nullable(),
        }),
      ),
    })
    .safeParse(data);
  if (!parsed.success) {
    console.error("Published vehicle information is unavailable or malformed");
    return "Published vehicle information is unavailable. Please contact our team.";
  }
  return publishedFleetCapacityError(parsed.data.fleet, journey);
}
export async function quoteTransfer(_: EnquiryState, form: FormData): Promise<EnquiryState> {
  if (!publicBusinessId())
    return { error: "Online quotes are currently unavailable. Please contact our team." };
  let journey;
  try {
    journey = journeySchema.parse(journeyData(form));
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? error.issues[0].code === "custom"
            ? error.issues[0].message
            : "Check the required journey details and passenger or luggage counts."
          : error instanceof Error
            ? error.message
            : "Check your journey details.",
    };
  }
  try {
    const supabase = await createClient();
    const vehicleError = await publishedVehicleError(supabase, journey);
    if (vehicleError) return { error: vehicleError };
    const { data, error } = await supabase.rpc("calculate_transfer_quote", {
      business_id: publicBusinessId(),
      pickup_id: journey.pickup_id,
      dropoff_id: journey.dropoff_id,
      category: journey.category,
      transfer_kind: journey.transfer_type,
      extra_ids: journey.extras,
    });
    if (error)
      return {
        error: publicError(error.message),
        manual:
          error.message === "A quote is not available for this route and category" ||
          error.message === "Return pricing is not available for this route",
      };
    return { quote: data as Quote };
  } catch {
    return { error: "Online quotes are currently unavailable. Please contact our team." };
  }
}
export async function submitEnquiry(_: EnquiryState, form: FormData): Promise<EnquiryState> {
  if (!enquiriesConfigured())
    return { error: "Online enquiries are currently unavailable. Please contact our team." };
  if (form.get("website")) return { error: "Please contact our team to continue your enquiry." };
  let journey;
  let contact;
  try {
    journey = journeySchema.parse(journeyData(form));
    contact = z
      .object({
        name: z.string().trim().min(1).max(200),
        email: z.email().max(254),
        phone: z.string().trim().min(7).max(100),
        notes: z.string().trim().max(4000),
        pickup_address: z.string().trim().max(500),
        dropoff_address: z.string().trim().max(500),
        token: z.string().min(1).max(2048),
        expected: z
          .union([
            z.literal("").transform(() => null),
            z
              .string()
              .regex(/^\d+(\.\d{1,2})?$/)
              .transform(Number)
              .pipe(z.number().finite().min(0).max(1000000000)),
          ]),
      })
      .parse({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        notes: form.get("notes") ?? "",
        pickup_address: form.get("pickup_address") ?? "",
        dropoff_address: form.get("dropoff_address") ?? "",
        token: form.get("cf-turnstile-response"),
        expected: form.get("expected_total") ?? "",
      });
    contact.notes = formatJourneyNotes(
      contact.notes,
      contact.pickup_address,
      contact.dropoff_address,
    );
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? "Check your contact details and complete the security check."
          : error instanceof Error
            ? error.message
            : "Check your entries.",
    };
  }
  try {
    const requestHeaders = await headers();
    if (requestHeaders.get("origin") !== siteOrigin())
      return { error: "This request could not be verified. Refresh and try again." };
    const supabase = await createClient();
    if (contact.expected !== null) {
      const vehicleError = await publishedVehicleError(supabase, journey);
      if (vehicleError) return { error: vehicleError };
    }
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: contact.token }),
      signal: AbortSignal.timeout(10000),
    });
    const verification = (await response.json()) as {
      success: boolean;
      hostname: string;
      action: string;
    };
    if (
      !response.ok ||
      !verification.success ||
      verification.hostname !== new URL(siteOrigin()).hostname ||
      verification.action !== "booking_enquiry"
    )
      return {
        error: "The security check expired or could not be verified. Please complete it again.",
      };
    const service = createServiceClient();
    if (contact.expected === null) {
      const { data, error } = await service.rpc("submit_unpriced_transfer_enquiry", {
        business_id: publicBusinessId(),
        customer_name: contact.name,
        customer_email: contact.email,
        customer_phone: contact.phone,
        pickup_id: journey.pickup_id,
        dropoff_id: journey.dropoff_id,
        pickup_address: contact.pickup_address,
        dropoff_address: contact.dropoff_address,
        pickup_time: journey.pickup_at,
        return_time: journey.return_at,
        passenger_count: journey.passengers,
        luggage_count: journey.luggage,
        category: journey.category,
        transfer_kind: journey.transfer_type,
        flight: journey.flight,
        customer_notes: contact.notes,
      });
      if (error) return { error: publicError(error.message) };
      return { reference: String(data), manual: true };
    }
    const { data, error } = await service.rpc("submit_booking_enquiry", {
      business_id: publicBusinessId(),
      customer_name: contact.name,
      customer_email: contact.email,
      customer_phone: contact.phone,
      pickup_id: journey.pickup_id,
      dropoff_id: journey.dropoff_id,
      pickup_time: journey.pickup_at,
      return_time: journey.return_at,
      passenger_count: journey.passengers,
      luggage_count: journey.luggage,
      category: journey.category,
      transfer_kind: journey.transfer_type,
      flight: journey.flight,
      customer_notes: contact.notes,
      extra_ids: journey.extras,
      expected_total: contact.expected,
    });
    if (error) return { error: publicError(error.message) };
    return { reference: String(data) };
  } catch {
    return { error: "Online enquiries are temporarily unavailable. Please contact our team." };
  }
}
