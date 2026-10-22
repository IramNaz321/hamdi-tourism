import "server-only";
import { z } from "zod";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { enquiryConfigurationIssues } from "./enquiry-readiness";
export type PublicSettings = {
  display_name: string;
  contact_email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  about_text: string | null;
  booking_policy: string | null;
  cancellation_policy: string | null;
  currency: string;
  enquiries_enabled: boolean;
  brand_color: string;
  ink_color: string;
  canvas_color: string;
  font_family: string;
  logo_path: string | null;
};
export type PublicLocation = {
  id: string;
  name: string;
  city: string | null;
  kind: string;
  airport_code: string | null;
  description: string | null;
  image_path: string | null;
  featured_destination: boolean;
  image_url?: string;
};
export type PublicVehicle = {
  id: string;
  name: string;
  category: string;
  capacity: number;
  luggage_capacity: number | null;
  description: string | null;
  image_path: string | null;
  image_url?: string;
};
export function publicBusinessId() {
  const id = process.env.HAMDI_ORGANIZATION_ID?.trim();
  return z.uuid().safeParse(id).success ? id! : null;
}
export function enquiriesConfigured() {
  return enquiryConfigurationIssues(process.env).length === 0;
}
export async function websiteContent(): Promise<{
  settings: PublicSettings | null;
  locations: PublicLocation[];
  fleet: PublicVehicle[];
  logo_url?: string;
}> {
  const empty = { settings: null, locations: [], fleet: [] };
  if (!isConfigured() || !publicBusinessId()) return empty;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("website_content", {
      business_id: publicBusinessId(),
    });
    if (error) {
      console.error("Public content unavailable", { code: error.code });
      return empty;
    }
    if (!data) return empty;
    const result = data as {
      settings: PublicSettings;
      locations: PublicLocation[];
      fleet: PublicVehicle[];
      logo_url?: string;
    };
    const paths = [...result.locations, ...result.fleet]
      .map((r) => r.image_path)
      .filter((p): p is string => !!p);
    if (result.settings.logo_path) paths.push(result.settings.logo_path);
    if (paths.length && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const service = createServiceClient();
      const { data: media } = await service.storage
        .from("business-media")
        .createSignedUrls([...new Set(paths)], 300);
      const urls = new Map(media?.map((item) => [item.path, item.signedUrl]));
      result.locations.forEach((r) => {
        r.image_url = urls.get(r.image_path ?? "") ?? undefined;
      });
      result.fleet.forEach((r) => {
        r.image_url = urls.get(r.image_path ?? "") ?? undefined;
      });
      result.logo_url = urls.get(result.settings.logo_path ?? "") ?? undefined;
    }
    return result;
  } catch {
    console.error("Public content temporarily unavailable");
    return empty;
  }
}
