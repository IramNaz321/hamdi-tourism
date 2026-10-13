import { z } from "zod";
import { publicSupabaseConfig } from "./supabase/config";
import { isServerSupabaseKey } from "./supabase/key-validation";
import { configuredSiteOrigin, type OriginEnvironment } from "./site-origin";
export type EnquiryEnvironment = OriginEnvironment & {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  HAMDI_ORGANIZATION_ID?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
};
function configured(value: string | undefined) {
  return !!value?.trim() && !/^(your[-_]|placeholder)/i.test(value.trim());
}
export function enquiryConfigurationIssues(env: EnquiryEnvironment): string[] {
  const issues: string[] = [];
  if (!publicSupabaseConfig(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))
    issues.push("The booking database connection is not configured.");
  if (!z.uuid().safeParse(env.HAMDI_ORGANIZATION_ID?.trim()).success)
    issues.push("The website is not linked to its business account.");
  if (!configuredSiteOrigin(env)) issues.push("The website address is missing or invalid.");
  if (!isServerSupabaseKey(env.SUPABASE_SERVICE_ROLE_KEY))
    issues.push("Secure enquiry processing is not configured.");
  if (!configured(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) || !configured(env.TURNSTILE_SECRET_KEY))
    issues.push("The visitor security check is not configured.");
  return issues;
}
