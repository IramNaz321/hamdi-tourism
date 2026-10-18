import { test } from "node:test";
import assert from "node:assert/strict";
import { launchReadiness } from "../src/lib/launch-readiness";
test("handover gate reports absent configuration without disclosing values", () => {
  const result = launchReadiness({});
  assert.equal(result.missingCore.length, 5);
  assert.equal(result.productionReady, false);
  assert.ok(Object.values(result.features).every((value) => !value));
});
test("provider flags alone cannot enable readiness and configuration never certifies production", () => {
  const result = launchReadiness({
    GROQ_CONCIERGE_ENABLED: "true",
    ROUTING_ENABLED: "true",
    STRIPE_LIVE_PAYMENTS_APPROVED: "true",
    PASSENGER_AUTH_ENABLED: "true",
  });
  assert.ok(Object.values(result.features).every((value) => !value));
  assert.equal(result.productionReady, false);
});
test("handover checks reject wrong project, browser secrets and malformed identity bindings", () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_never_publish",
    HAMDI_OWNER_USER_ID: "Hamid Shah",
    ORS_API_KEY: "private-do-not-display",
  };
  const result = launchReadiness(env);
  assert.equal(result.core.correctPublicProject, false);
  assert.equal(result.core.approvedOwnerBinding, false);
  assert.ok(!JSON.stringify(result).includes("private-do-not-display"));
  assert.ok(!JSON.stringify(result).includes("sb_secret"));
});
