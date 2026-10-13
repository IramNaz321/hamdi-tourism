import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient, isConfigured } from "./supabase/server";
import { publicBusinessId } from "./website";
export const requirePassenger = cache(async () => {
  if (!isConfigured() || !publicBusinessId()) redirect("/passenger/login?notice=unavailable");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at) redirect("/passenger/login");
  const { data: staff, error: membershipError } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) throw new Error("Account access could not be checked.");
  if (staff) redirect(staff.role === "driver" ? "/driver-account" : "/admin");
  return { supabase, user, organizationId: publicBusinessId()! };
});
export type PassengerBooking = {
  id: string;
  reference: string;
  status: string;
  pickup_at: string;
  price_aed: number;
  pickup: string;
  destination: string;
};
export type BookingDetail = PassengerBooking & {
  passengers: number;
  luggage: number;
  flight_number: string | null;
  flight_status: string;
  notes: string | null;
  driver: string | null;
  vehicle: string | null;
  preferred_vehicle: string;
  policies: { terms: string; privacy: string; booking_policy: string; cancellation_policy: string };
  pricing: {
    total_aed: number;
    outbound_aed: number;
    return_aed: number | null;
    extras: { name: string; price_aed: number; charge_basis: string }[];
  };
  paid_aed: number;
  refunded_aed: number;
  payment_state: string | null;
  cancellation_request: string | null;
  timeline: { status: string; at: string }[];
  driver_events: { action: string; at: string }[];
};
