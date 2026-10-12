"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { uaeDateTime } from "@/lib/booking-validation";
export type EnquiryAdminState = { error?: string; success?: string };
export async function reviewEnquiry(
  id: string,
  _: EnquiryAdminState,
  form: FormData,
): Promise<EnquiryAdminState> {
  const { supabase, member } = await requireStaff();
  const status = String(form.get("status"));
  if (
    !z.uuid().safeParse(id).success ||
    !["owner", "manager", "dispatcher"].includes(member.role) ||
    !["reviewed", "closed"].includes(status)
  )
    return { error: "Not permitted." };
  const { data, error } = await supabase
    .from("booking_enquiries")
    .update({ status })
    .eq("organization_id", member.organization_id)
    .eq("id", id)
    .eq("updated_at", String(form.get("updated_at")))
    .select("id")
    .maybeSingle();
  if (error || !data)
    return { error: "This enquiry changed or could not be updated. Refresh and try again." };
  revalidatePath("/admin/enquiries", "layout");
  return { success: "Enquiry updated." };
}
export async function convertEnquiry(
  id: string,
  _: EnquiryAdminState,
  form: FormData,
): Promise<EnquiryAdminState> {
  const { supabase, member } = await requireStaff();
  if (!z.uuid().safeParse(id).success || !["owner", "manager", "dispatcher"].includes(member.role))
    return { error: "Not permitted." };
  let outbound: string;
  let inbound: string | null;
  try {
    outbound = uaeDateTime(String(form.get("outbound_end")));
    inbound = form.get("return_end") ? uaeDateTime(String(form.get("return_end"))) : null;
  } catch {
    return { error: "Enter valid expected journey end times in UAE time." };
  }
  const { data, error } = await supabase.rpc("convert_booking_enquiry", {
    target_enquiry_id: id,
    outbound_end: outbound,
    return_end: inbound,
  });
  if (error)
    return {
      error:
        error.message === "Enter valid journey end times"
          ? error.message
          : "This enquiry could not be converted. It may already have been processed, or a related record is no longer active.",
    };
  revalidatePath("/admin", "layout");
  redirect(`/admin/bookings/${data}`);
}
