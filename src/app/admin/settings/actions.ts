"use server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { settingsSchema } from "@/lib/settings-validation";
export type SettingsState = { error?: string; success?: string };
export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { member, supabase } = await requireOwner();
  const input = Object.fromEntries(form.entries());
  const parsed = settingsSchema.safeParse({
    ...input,
    published: form.has("published"),
    enquiries_enabled: form.has("enquiries_enabled"),
  });
  if (!parsed.success)
    return {
      error: "Check the required business name, contact details, colors and operational limits.",
    };
  const version = String(form.get("updated_at") ?? "");
  try {
    let error;
    if (version) {
      const result = await supabase
        .from("business_settings")
        .update(parsed.data)
        .eq("organization_id", member.organization_id)
        .eq("updated_at", version)
        .select("organization_id")
        .maybeSingle();
      error = result.error;
      if (!error && !result.data)
        return { error: "Settings changed since you opened this page. Refresh before saving." };
    } else {
      const result = await supabase
        .from("business_settings")
        .insert({ ...parsed.data, organization_id: member.organization_id });
      error = result.error;
    }
    if (error) return { error: "Settings could not be saved. Refresh and try again." };
  } catch {
    return {
      error:
        "The settings save could not be confirmed. Refresh before retrying to avoid overwriting a newer change.",
    };
  }
  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { success: "Business settings saved." };
}
