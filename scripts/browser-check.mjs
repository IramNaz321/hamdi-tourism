/** Browser regression is deliberately disconnected from hosted credentials and provider writes. */
import { spawnSync } from "node:child_process";
const env = {
  ...process.env,
  HAMDI_BROWSER_TESTS: "true",
  ROUTING_ENABLED: "false",
  ORS_API_KEY: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  SUPABASE_DB_URL: "",
  HAMDI_ORGANIZATION_ID: "",
  HAMDI_OWNER_USER_ID: "",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  PASSENGER_AUTH_ENABLED: "false",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
  STRIPE_LIVE_PAYMENTS_APPROVED: "false",
  OPENAI_API_KEY: "",
  OPENAI_CONCIERGE_ENABLED: "false",
  RESEND_API_KEY: "",
  RESEND_WEBHOOK_SECRET: "",
  NOTIFICATION_EMAIL_ENABLED: "false",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  TURNSTILE_SECRET_KEY: "",
};
for (const args of [
  ["node_modules/next/dist/bin/next", "build"],
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
