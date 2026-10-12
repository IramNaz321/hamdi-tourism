"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOwner, siteOrigin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
export type StaffState = { error?: string; success?: string };
export async function inviteStaff(_: StaffState, form: FormData): Promise<StaffState> {
  const { supabase } = await requireOwner();
  const parsed = z
    .object({
      email: z.email().max(254),
      name: z.string().trim().min(1).max(200),
      role: z.enum(["manager", "dispatcher", "viewer"]),
    })
    .safeParse({
      email: String(form.get("email") ?? "")
        .trim()
        .toLowerCase(),
      name: form.get("name"),
      role: form.get("role"),
    });
  if (!parsed.success) return { error: "Enter a name, valid email address and staff role." };
  let invitationClient: ReturnType<typeof createServiceClient>;
  let origin: string;
  try {
    invitationClient = createServiceClient();
    origin = siteOrigin();
  } catch {
    return {
      error:
        "Staff email invitations are unavailable. The account owner must configure invitation delivery.",
    };
  }
  const { data: invitationId, error: reserveError } = await supabase.rpc(
    "reserve_staff_invitation",
    {
      invite_email: parsed.data.email,
      invite_name: parsed.data.name,
      invite_role: parsed.data.role,
    },
  );
  if (reserveError) {
    if (reserveError.code === "23505")
      return { error: "An invitation is already pending for this email." };
    if (reserveError.message.startsWith("This email already has an account."))
      return {
        error:
          "This email already has an account. Manage its existing staff access; use password reset if needed.",
      };
    return { error: "Unable to reserve this invitation. Try again or review account access." };
  }
  const { error } = await invitationClient.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm`,
  });
  if (error) {
    const { error: cleanupError } = await supabase.rpc("cancel_staff_invitation", {
      invitation_id: invitationId,
    });
    revalidatePath("/admin/staff");
    return {
      error: cleanupError
        ? "Invitation delivery failed and access cleanup could not be confirmed. Review the staff list before retrying."
        : "Invitation delivery failed. Any provisioned access was disabled. Review the staff list and email delivery settings before retrying.",
    };
  }
  revalidatePath("/admin/staff");
  return {
    success: "Invitation sent. The recipient can use their email link to choose a password.",
  };
}
export async function updateStaff(
  userId: string,
  _: StaffState,
  form: FormData,
): Promise<StaffState> {
  const { supabase } = await requireOwner();
  const role = String(form.get("role"));
  const active = form.get("active") === "on";
  if (
    !z.uuid().safeParse(userId).success ||
    !["owner", "manager", "dispatcher", "viewer", "driver"].includes(role)
  )
    return { error: "Invalid staff access settings." };
  const { error } = await supabase.rpc("set_staff_access", {
    target_user_id: userId,
    new_role: role,
    new_active: active,
  });
  if (error)
    return {
      error:
        error.message === "Keep at least one active owner"
          ? "Keep at least one active owner on the account."
          : "Unable to update access. Refresh and try again.",
    };
  revalidatePath("/admin", "layout");
  return { success: "Staff access updated." };
}
export async function cancelInvitation(invitationId: string): Promise<StaffState> {
  const { supabase } = await requireOwner();
  if (!z.uuid().safeParse(invitationId).success) return { error: "Invalid invitation." };
  const { error } = await supabase.rpc("cancel_staff_invitation", { invitation_id: invitationId });
  if (error) return { error: "Unable to cancel this invitation. Try again." };
  revalidatePath("/admin/staff");
  return { success: "Invitation cancelled. Associated staff access has been disabled." };
}
