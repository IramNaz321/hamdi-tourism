"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireDriver } from "@/lib/driver";
export async function updateDriverTrip(
  _: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  const { supabase } = await requireDriver();
  const parsed = z
    .object({ id: z.uuid(), action: z.enum(["accept", "arrive", "pickup", "complete"]) })
    .safeParse({ id: form.get("id"), action: form.get("action") });
  if (!parsed.success) return { error: "Choose a valid trip action." };
  const { error } = await supabase.rpc("driver_trip_action", {
    trip_id: parsed.data.id,
    action_name: parsed.data.action,
  });
  if (error)
    return {
      error:
        "The trip could not be updated. Refresh and contact your dispatcher if its assignment or status changed.",
    };
  revalidatePath("/driver-account");
  revalidatePath("/admin", "layout");
  return {};
}
