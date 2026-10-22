"use server";
import { prepareImage } from "@/lib/image-validation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
export type MediaState = { error?: string; success?: string };
export async function uploadMedia(
  entity: string,
  id: string,
  version: string,
  _: MediaState,
  form: FormData,
): Promise<MediaState> {
  const { supabase, member } = await requireStaff();
  if (
    !["vehicles", "locations", "logo"].includes(entity) ||
    !["owner", "manager"].includes(member.role) ||
    (entity === "logo" && member.role !== "owner") ||
    !z.uuid().safeParse(id).success
  )
    return { error: "You do not have permission to upload this image." };
  const table = entity === "logo" ? "business_settings" : entity;
  const column = entity === "logo" ? "organization_id" : "id";
  const { data: record, error: lookupError } = await supabase
    .from(table)
    .select("updated_at")
    .eq("organization_id", member.organization_id)
    .eq(column, id)
    .maybeSingle();
  if (lookupError || !record) return { error: "Save the record before uploading an image." };
  if (record.updated_at !== version)
    return { error: "This record changed. Refresh before uploading." };
  const file = form.get("image");
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 4 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    return { error: "Choose a JPEG, PNG or WebP image up to 4 MB." };
  let image: Buffer;
  try {
    image = await prepareImage(file);
  } catch {
    return { error: "This image could not be read. Choose a valid JPEG, PNG or WebP up to 4 MB." };
  }
  const path = `${member.organization_id}/${entity}/${entity === "logo" ? "" : `${id}/`}${randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from("business-media")
    .upload(path, image, { contentType: "image/webp", upsert: false });
  if (error) return { error: "The image could not be uploaded. Check access and try again." };
  const result = await supabase
    .from(table)
    .update(entity === "logo" ? { logo_path: path } : { image_path: path })
    .eq("organization_id", member.organization_id)
    .eq(column, id)
    .eq("updated_at", version)
    .select(column)
    .maybeSingle();
  if (result.error || !result.data) {
    await supabase.storage.from("business-media").remove([path]);
    return { error: "The record changed or could not be saved. Refresh and try again." };
  }
  revalidatePath("/");
  revalidatePath("/admin", "layout");
  return { success: "Image uploaded. Refresh this page to view it or upload another image." };
}
