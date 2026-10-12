import { requireOwner } from "@/lib/auth";
import { SettingsForm } from "@/components/settings-form";
import { MediaUpload } from "@/components/media-upload";
export default async function Settings() {
  const { supabase, member } = await requireOwner();
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("organization_id", member.organization_id)
    .maybeSingle();
  if (error) throw new Error("Unable to load settings.");
  let imageUrl: string | undefined;
  if (data?.logo_path) {
    const result = await supabase.storage
      .from("business-media")
      .createSignedUrl(data.logo_path, 300);
    imageUrl = result.data?.signedUrl;
  }
  return (
    <>
      <p className="eyebrow mb-3">OWNER CONTROLS</p>
      <h1 className="text-3xl font-semibold mb-3">Business settings</h1>
      <p className="text-sm text-muted mb-8">
        Manage your contact information, policies, website appearance and operations.
      </p>
      <SettingsForm settings={data} />
      {data && (
        <MediaUpload
          entity="logo"
          id={member.organization_id}
          version={data.updated_at}
          imageUrl={imageUrl}
        />
      )}
    </>
  );
}
