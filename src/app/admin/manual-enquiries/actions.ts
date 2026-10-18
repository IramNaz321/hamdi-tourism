"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";

export type ManualEnquiryState = { error?: string; success?: string };

export async function reviewManualEnquiry(
  id: string,
  _: ManualEnquiryState,
  form: FormData,
): Promise<ManualEnquiryState> {
  const { supabase, member } = await requireStaff();
  const status = z.enum(["reviewed", "closed"]).safeParse(form.get("status"));
  const version = z.iso.datetime({ offset: true }).safeParse(form.get("updated_at"));
  if (
    !z.uuid().safeParse(id).success ||
    !status.success ||
    !version.success ||
    !["owner", "manager", "dispatcher"].includes(member.role)
  )
    return { error: "Not permitted." };
  try {
    const { data, error } = await supabase
      .from("unpriced_transfer_enquiries")
      .update({ status: status.data })
      .eq("organization_id", member.organization_id)
      .eq("id", id)
      .eq("updated_at", version.data)
      .eq("archived", false)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return { error: "This request changed or could not be updated. Refresh and try again." };
    revalidatePath("/admin/manual-enquiries", "layout");
    return { success: "Request updated." };
  } catch {
    return {
      error: "The save result could not be confirmed. Refresh the records before trying again.",
    };
  }
}
