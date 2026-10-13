"use server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { uaeDateTime } from "@/lib/booking-validation";
export async function changeTrackingAccess(
  _: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const { supabase } = await requireOwner();
  const parsed = z
    .object({
      trip: z.uuid(),
      passenger: z.uuid(),
      enabled: z.enum(["true", "false"]),
      confirmed: z.literal("on"),
    })
    .safeParse({
      trip: form.get("trip"),
      passenger: form.get("passenger"),
      enabled: form.get("enabled"),
      confirmed: form.get("confirmed"),
    });
  if (!parsed.success)
    return { error: "Verify the real passenger ID and explicitly confirm authorization." };
  let expiry: string | null = null;
  try {
    if (parsed.data.enabled === "true") expiry = uaeDateTime(String(form.get("expiry") ?? ""));
  } catch {
    return { error: "Enter a valid expiry in UAE time." };
  }
  const { error } = await supabase.rpc("set_passenger_tracking", {
    trip_id: parsed.data.trip,
    passenger_id: parsed.data.passenger,
    expiry,
    enabled: parsed.data.enabled === "true",
  });
  if (error)
    return {
      error:
        "Access could not change. Check that the passenger is confirmed and the expiry is within seven days.",
    };
  return {
    success:
      parsed.data.enabled === "true"
        ? "Passenger tracking access granted."
        : "Passenger tracking access revoked.",
  };
}
