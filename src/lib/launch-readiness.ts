import { publicSupabaseConfig } from "./supabase/config";
import { isServerSupabaseKey } from "./supabase/key-validation";
import { configuredSiteOrigin } from "./site-origin";
/** Configuration checks only. Never equivalent to hosted workflow acceptance. */
export function launchReadiness(env: Record<string, string | undefined>) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const present = (...keys: string[]) => keys.every((key) => Boolean(env[key]?.trim()));
  const origin = configuredSiteOrigin(env);
  const config = publicSupabaseConfig(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const core = {
    correctPublicProject: config?.url === "https://hzcupgjphowrzvrdffrf.supabase.co",
    serverKey: isServerSupabaseKey(env.SUPABASE_SERVICE_ROLE_KEY),
    organizationBinding: uuid.test(env.HAMDI_ORGANIZATION_ID ?? ""),
    approvedOwnerBinding: uuid.test(env.HAMDI_OWNER_USER_ID ?? ""),
    httpsSiteOrigin: Boolean(origin?.startsWith("https://")),
  };
  return {
    scope: "configuration_only",
    core,
    missingCore: Object.entries(core)
      .filter(([, value]) => !value)
      .map(([key]) => key),
    features: {
      passengerRegistration:
        env.PASSENGER_AUTH_ENABLED === "true" &&
        present("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"),
      roadRouting: env.ROUTING_ENABLED === "true" && present("ORS_API_KEY"),
      concierge:
        env.GROQ_CONCIERGE_ENABLED === "true" &&
        present("GROQ_API_KEY", "AI_RATE_LIMIT_SECRET") &&
        /^[a-zA-Z0-9._/-]{1,100}$/.test(
          env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
        ),
      payments:
        env.STRIPE_LIVE_PAYMENTS_APPROVED === "true" &&
        present("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"),
      notifications:
        env.NOTIFICATION_EMAIL_ENABLED === "true" &&
        present(
          "RESEND_API_KEY",
          "RESEND_WEBHOOK_SECRET",
          "NOTIFICATION_FROM",
          "NOTIFICATION_WORKER_SECRET",
        ),
    },
    requiredExternalVerification: [
      "client_identity_and_explicit_owner_authorization",
      "hosted_catalog_and_rls",
      "auth_redirects_smtp_and_abuse_controls",
      "real_role_login_refresh_logout",
      "published_fleet_routes_fares_policies",
      "real_device_gps_and_provider_acceptance",
      "approved_deployment_and_https_smoke_test",
    ],
    productionReady: false,
  };
}
