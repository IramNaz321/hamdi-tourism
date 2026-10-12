"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOwner, siteOrigin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import type { StaffState } from "@/app/admin/staff/actions";
export async function inviteDriver(id: string): Promise<StaffState> {
  const { supabase, member } = await requireOwner();
  if (!z.uuid().safeParse(id).success) return { error: "Invalid driver." };
  let service;
  let origin;
  try {
    service = createServiceClient();
    origin = siteOrigin();
  } catch {
    return {
      error:
        "Driver invitations are currently unavailable. Configure email delivery before inviting drivers.",
    };
  }
  const { data: driver, error: lookupError } = await supabase
    .from("drivers")
    .select("email")
    .eq("organization_id", member.organization_id)
    .eq("id", id)
    .maybeSingle();
  if (lookupError || !z.email().safeParse(driver?.email).success)
    return { error: "Save a valid email address on this driver's profile first." };
  const { data: invitation, error } = await supabase.rpc("reserve_driver_invitation", {
    target_driver_id: id,
  });
  if (error)
    return {
      error:
        "This driver cannot be invited. Check their active status, pending invitations and existing account.",
    };
  const { error: deliveryError } = await service.auth.admin.inviteUserByEmail(driver!.email, {
    redirectTo: `${origin}/auth/confirm`,
  });
  if (deliveryError) {
    const cleanup = await supabase.rpc("cancel_staff_invitation", { invitation_id: invitation });
    revalidatePath("/admin", "layout");
    return {
      error: cleanup.error
        ? "Invitation delivery failed and access cleanup could not be confirmed. Review driver and staff access immediately."
        : "Invitation delivery failed. Any provisioned driver access was disabled. Review the account before retrying.",
    };
  }
  revalidatePath("/admin", "layout");
  return { success: "Driver invitation sent." };
}
