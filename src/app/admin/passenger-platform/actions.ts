"use server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";
export type ConfigurationState = { error?: string; success?: string };
export async function savePlatform(
  _: ConfigurationState,
  form: FormData,
): Promise<ConfigurationState> {
  const { supabase, member } = await requireStaff();
  if (member.role !== "owner") return { error: "Owner permission required." };
  const parsed = z
    .object({ privacy: z.string().max(8000), terms: z.string().max(8000) })
    .safeParse({ privacy: form.get("privacy"), terms: form.get("terms") });
  if (!parsed.success) return { error: "Policies must be at most 8,000 characters." };
  const { error } = await supabase.rpc("admin_passenger_settings", {
    enabled: form.get("enabled") === "on",
    privacy: parsed.data.privacy,
    terms_text: parsed.data.terms,
  });
  if (error) return { error: "Settings could not be saved. Provide genuine published policies." };
  revalidatePath("/book");
  revalidatePath("/admin/passenger-platform");
  return { success: "Passenger booking settings saved." };
}
export async function saveRoute(
  _: ConfigurationState,
  form: FormData,
): Promise<ConfigurationState> {
  const { supabase, member } = await requireStaff();
  if (!["owner", "manager"].includes(member.role))
    return { error: "Owner or manager permission required." };
  const parsed = z
    .object({
      id: z.uuid(),
      minutes: z.coerce.number().int().min(1).max(10080),
      returnMinutes: z.union([z.literal(""), z.coerce.number().int().min(1).max(10080)]),
    })
    .safeParse({
      id: form.get("id"),
      minutes: form.get("minutes"),
      returnMinutes: form.get("return_minutes") ?? "",
    });
  if (!parsed.success) return { error: "Choose valid actual route durations." };
  const { error } = await supabase.rpc("admin_passenger_route", {
    route: parsed.data.id,
    minutes: parsed.data.minutes,
    return_duration: parsed.data.returnMinutes === "" ? null : parsed.data.returnMinutes,
    enabled: form.get("enabled") === "on",
  });
  if (error) return { error: "Route settings unavailable or unauthorized." };
  revalidatePath("/book");
  revalidatePath("/admin/passenger-platform");
  return { success: "Route booking configuration saved." };
}
export async function reviewCancellation(form: FormData) {
  const { supabase, member } = await requireStaff();
  if (!["owner", "manager", "dispatcher"].includes(member.role))
    throw new Error("Operations permission required.");
  const id = z.uuid().parse(form.get("id"));
  const { error } = await supabase.rpc("admin_review_cancellation", { trip: id });
  if (error) throw new Error("Cancellation review could not be recorded.");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath(`/passenger/bookings/${id}`);
}
