"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/auth";
import { requirePassenger } from "@/lib/passenger";
import {
  passengerContactSchema,
  passengerReturnPath,
  bookingSubmissionSchema,
  passengerJourneySchema,
} from "@/lib/passenger-validation";
import { journeyData } from "@/lib/booking-validation";
export type PassengerState = { error?: string; success?: string };
export async function passengerLogin(_: PassengerState, form: FormData): Promise<PassengerState> {
  if (!isConfigured()) return { error: "Passenger sign-in is currently unavailable." };
  const parsed = z
    .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
    .safeParse({ email: String(form.get("email") ?? "").trim(), password: form.get("password") });
  if (!parsed.success) return { error: "Enter a valid email address and password." };
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Unable to sign in. Check your credentials and email verification." };
  redirect(passengerReturnPath(form.get("next")));
}
export async function passengerRegister(
  _: PassengerState,
  form: FormData,
): Promise<PassengerState> {
  if (
    !isConfigured() ||
    process.env.PASSENGER_AUTH_ENABLED !== "true" ||
    !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  )
    return { error: "Passenger registration is currently unavailable. Contact our team." };
  const parsed = z
    .object({
      email: z.email().max(254),
      password: z.string().min(12).max(128),
      acknowledged: z.literal("on"),
    })
    .safeParse({
      email: String(form.get("email") ?? "").trim(),
      password: form.get("password"),
      acknowledged: form.get("acknowledged"),
    });
  if (
    !parsed.success ||
    form.get("confirm") !== parsed.data.password ||
    !z.string().min(1).max(2048).safeParse(form.get("captcha_token")).success
  )
    return {
      error:
        "Use a matching password of at least 12 characters and acknowledge email verification.",
    };
  try {
    const client = await createClient();
    const { error } = await client.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${siteOrigin()}/auth/callback?next=/passenger`,
        captchaToken: String(form.get("captcha_token") ?? "") || undefined,
      },
    });
    if (error)
      return { error: "Registration could not be completed. Try later or contact support." };
    // Supabase must enforce email confirmation. Never show an active-account success here.
    await client.auth.signOut({ scope: "local" });
    return {
      success:
        "Check your email for a verification link if registration is available for this address. You must verify before booking.",
    };
  } catch {
    return { error: "Registration is unavailable. Contact our team." };
  }
}
export async function passengerRecovery(
  _: PassengerState,
  form: FormData,
): Promise<PassengerState> {
  if (!isConfigured() || !z.email().safeParse(form.get("email")).success)
    return { error: "Enter your email. Account recovery must be configured." };
  try {
    const client = await createClient();
    const { error } = await client.auth.resetPasswordForEmail(String(form.get("email")), {
      redirectTo: `${siteOrigin()}/auth/callback`,
    });
    if (error) return { error: "Recovery is currently unavailable. Try again later." };
    return {
      success: "If this address has an account, check your email for a password reset link.",
    };
  } catch {
    return { error: "Recovery is currently unavailable." };
  }
}
export async function savePassengerProfile(
  _: PassengerState,
  form: FormData,
): Promise<PassengerState> {
  const { supabase, organizationId } = await requirePassenger();
  const parsed = passengerContactSchema.safeParse({
    name: form.get("name"),
    phone: form.get("phone"),
  });
  if (!parsed.success) return { error: "Enter your real name and contact phone number." };
  const { error } = await supabase.rpc("passenger_save_profile", {
    business_id: organizationId,
    full_name: parsed.data.name,
    phone_number: parsed.data.phone,
  });
  if (error) return { error: "Profile could not be saved. Contact support or retry." };
  revalidatePath("/passenger");
  revalidatePath("/book");
  return { success: "Profile updated." };
}
export type PassengerQuote = {
  id: string;
  expires_at: string;
  pricing: {
    total_aed: number;
    outbound_aed: number;
    return_aed: number | null;
    base_fare: number;
    additional_charges: number;
    extras: { id: string; name: string; price_aed: number; charge_basis: string }[];
  };
  terms: { terms: string; privacy: string; booking_policy: string; cancellation_policy: string };
  availability: string;
};
export type BookingState = PassengerState & {
  quote?: PassengerQuote;
  bookings?: { id: string; reference: string; status: string }[];
};
export async function quotePassenger(_: BookingState, form: FormData): Promise<BookingState> {
  const { supabase, organizationId } = await requirePassenger();
  try {
    const journey = passengerJourneySchema.parse({
      ...journeyData(form),
      vehicle_id: form.get("vehicle_id"),
    });
    const { data, error } = await supabase.rpc("passenger_quote", {
      business_id: organizationId,
      vehicle: journey.vehicle_id,
      journey_input: journey,
    });
    if (error) return { error: passengerError(error.message) };
    return { quote: data as PassengerQuote };
  } catch {
    return { error: "Check your journey, future UAE pickup time, vehicle and capacity." };
  }
}
const allowed = [
  "Complete your passenger profile first",
  "Online bookings unavailable. Request an enquiry",
  "Vehicle capacity unavailable",
  "This route requires a manual enquiry",
  "Check your pickup time",
  "Return journey unavailable or overlaps outbound",
  "Quote expired. Request a fresh quote",
  "Policies changed. Request a fresh quote",
  "Selected vehicle unavailable",
  "Journey changed. Request a fresh quote",
  "Pricing changed. Request a fresh quote",
  "A quote is not available for this route and category",
  "Quote limit reached. Contact our team",
];
function passengerError(value: string) {
  return allowed.includes(value)
    ? value
    : "Booking could not be processed. Retry or contact our team.";
}
export async function createPassengerBooking(
  _: BookingState,
  form: FormData,
): Promise<BookingState> {
  const { supabase } = await requirePassenger();
  const parsed = bookingSubmissionSchema.safeParse({
    quote_id: form.get("quote_id"),
    request_id: form.get("request_id"),
    notes: form.get("notes") ?? "",
    acknowledged: form.get("acknowledged") === "on",
  });
  if (!parsed.success)
    return { error: "Review and acknowledge policies before requesting your booking." };
  const { data, error } = await supabase.rpc("passenger_create_booking", {
    quote_id: parsed.data.quote_id,
    request_id: parsed.data.request_id,
    customer_notes: parsed.data.notes,
    acknowledged: true,
  });
  if (error) return { error: passengerError(error.message) };
  revalidatePath("/passenger");
  revalidatePath("/admin");
  return { bookings: data };
}
export async function requestCancellation(
  _: PassengerState,
  form: FormData,
): Promise<PassengerState> {
  const { supabase } = await requirePassenger();
  const parsed = z
    .object({ id: z.uuid(), reason: z.string().trim().min(1).max(2000) })
    .safeParse({ id: form.get("id"), reason: form.get("reason") });
  if (!parsed.success) return { error: "Enter a cancellation reason." };
  const { error } = await supabase.rpc("passenger_request_cancellation", {
    trip_id: parsed.data.id,
    reason_text: parsed.data.reason,
  });
  if (error) return { error: "Cancellation request unavailable. Contact our team." };
  revalidatePath(`/passenger/bookings/${parsed.data.id}`);
  return {
    success:
      "Cancellation requested. Your booking remains unchanged until our team reviews it. Refunds require separate approval.",
  };
}

export async function passengerLogout() {
  if (isConfigured()) {
    const client = await createClient();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw new Error("Sign out could not be completed. Retry.");
  }
  redirect("/passenger/login");
}
