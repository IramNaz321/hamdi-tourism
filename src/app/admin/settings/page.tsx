import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { SettingsForm } from "@/components/settings-form";
import { MediaUpload } from "@/components/media-upload";
import { enquiryConfigurationIssues } from "@/lib/enquiry-readiness";
export default async function Settings() {
  const { supabase, member } = await requireOwner();
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("organization_id", member.organization_id)
    .maybeSingle();
  if (error) throw new Error("Unable to load settings.");
  const issues = enquiryConfigurationIssues(process.env);
  if (!data) issues.push("Save your business profile.");
  else {
    if (!data.published)
      issues.push("Publish the business profile to make it available on the website.");
    if (!data.enquiries_enabled) issues.push("Enable online enquiries in business settings.");
  }
  const [locations, prices] = await Promise.all([
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", member.organization_id)
      .eq("archived", false)
      .eq("public_listed", true),
    supabase
      .from("route_pricing")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", member.organization_id)
      .eq("archived", false)
      .eq("public_listed", true),
  ]);
  if (locations.error || prices.error) throw new Error("Unable to verify enquiry configuration.");
  if ((locations.count ?? 0) < 2) issues.push("Publish at least two real served locations.");
  if (!(prices.count ?? 0)) issues.push("Publish actual route pricing before quoting transfers.");
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
      <Link href="/admin/passenger-platform" className="button secondary">
        Passenger booking configuration
      </Link>
      <h1 className="text-3xl font-semibold mb-3">Business settings</h1>
      <p className="text-sm text-muted mb-8">
        Manage your contact information, policies, website appearance and operations.
      </p>
      <section className="panel p-6 mb-6" aria-labelledby="enquiry-readiness">
        <h2 id="enquiry-readiness" className="font-semibold">
          Online enquiries · {issues.length ? "Setup needed" : "Configured"}
        </h2>
        {issues.length ? (
          <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-muted">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mt-3">
            Configuration checks passed. Verify a genuine quote, security challenge and enquiry
            before accepting customer requests.
          </p>
        )}
      </section>
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
