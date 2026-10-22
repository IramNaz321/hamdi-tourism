"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { canWrite, entities, parseRecord } from "@/lib/entities";
export type RecordState = { error?: string };
export async function saveRecord(
  entity: string,
  id: string | null,
  _: RecordState,
  form: FormData,
): Promise<RecordState> {
  const { supabase, member } = await requireStaff();
  if (!entities[entity] || !canWrite(member.role, entity))
    return { error: "You do not have permission to change these records." };
  if (id && !z.uuid().safeParse(id).success) return { error: "Invalid record." };
  let record: Record<string, string | number | boolean | null>;
  try {
    record = parseRecord(entity, form);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Check your entries." };
  }
  try {
    if (id) {
      const version = String(form.get("updated_at") ?? "");
      const { data, error } = await supabase
        .from(entity)
        .update(record)
        .eq("id", id)
        .eq("organization_id", member.organization_id)
        .eq("updated_at", version)
        .eq("archived", false)
        .select("id")
        .maybeSingle();
      if (error) return { error: mutationError(error.code, error.message) };
      if (!data)
        return {
          error:
            "This record was changed or archived by another team member. Refresh before editing.",
        };
    } else {
      const { error } = await supabase
        .from(entity)
        .insert({ ...record, organization_id: member.organization_id });
      if (error) return { error: mutationError(error.code, error.message) };
    }
  } catch {
    return {
      error: "The save result could not be confirmed. Refresh the records before retrying.",
    };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/${entity}?notice=saved`);
}
function mutationError(code: string, message: string) {
  if (code === "23P01")
    return "This driver or vehicle already has a confirmed assignment during these times. Change the assignment or schedule.";
  if (
    code === "23505" &&
    (message.includes("one_driver_active_trip_idx") ||
      message.includes("one_vehicle_active_trip_idx"))
  )
    return "The selected driver or vehicle already has an active trip. Complete or reassign that trip before starting another.";
  if (code === "23505")
    return "A record with these unique details already exists. Check the licence, registration plate or route.";
  if (code === "23503")
    return "A selected related record is no longer available. Refresh and try again.";
  if (code === "23514")
    return "Some entries are outside the allowed limits. Check capacity, passengers, locations and fare.";
  if (code === "42501") return "Your account does not have permission to make this change.";
  const safe = [
    "Reassign or cancel confirmed trips before disabling this driver or vehicle",
    "Record the end time of an existing assignment before confirming another trip",
    "Choose an active route",
    "New bookings must start as pending",
    "This booking status transition is not allowed",
    "Record a cancellation reason",
    "Assign a driver, vehicle, category and end time before confirming",
    "Vehicle is unavailable, incompatible or has insufficient capacity",
    "Enter a flight number before recording its status",
    "Archive related prices before changing this route",
    "Choose an active customer",
    "Choose active pickup and drop-off locations",
    "Driver is unavailable or licence has expired",
    "Vehicle is unavailable or has insufficient capacity",
    "Assign a driver and vehicle before starting a journey",
  ];
  if (safe.includes(message)) return message;
  console.error("Record mutation failed", { code });
  return "The record could not be saved. Try again or contact the account owner.";
}
export async function archiveRecord(
  entity: string,
  id: string,
  archived: boolean,
  version: string,
) {
  const { supabase, member } = await requireStaff();
  if (!entities[entity] || !canWrite(member.role, entity) || !z.uuid().safeParse(id).success)
    redirect("/admin?notice=forbidden");
  let notice = "archive-failed";
  try {
    const { data, error } = await supabase
      .from(entity)
      .update({ archived })
      .eq("id", id)
      .eq("organization_id", member.organization_id)
      .eq("updated_at", version)
      .select("id")
      .maybeSingle();
    notice = error ? "archive-failed" : !data ? "changed" : archived ? "archived" : "restored";
  } catch {
    // An uncertain write must never be reported as archived or restored.
    notice = "archive-failed";
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/${entity}?notice=${notice}${archived ? "" : "&archived=true"}`);
}
export async function searchOptions(table: string, query: string) {
  const { supabase, member } = await requireStaff();
  if (!["drivers", "vehicles", "customers", "locations", "routes", "route_pricing"].includes(table))
    return { options: [], error: "Invalid selection." };
  const term = query
    .trim()
    .slice(0, 100)
    .replace(/[\\%_]/g, "\\$&");
  try {
    const { data, error } = await supabase
      .from(table)
      .select("id,name")
      .eq("organization_id", member.organization_id)
      .eq("archived", false)
      .ilike("name", `%${term}%`)
      .order("name")
      .limit(30);
    if (error) return { options: [], error: "Unable to load choices. Try again." };
    return { options: data as { id: string; name: string }[], error: undefined };
  } catch {
    return { options: [], error: "Unable to load choices. Try again." };
  }
}
