import { test } from "node:test";
import assert from "node:assert/strict";
import { configuredSiteOrigin, loginRedirectUrl } from "../src/lib/site-origin";
import { enquiryConfigurationIssues } from "../src/lib/enquiry-readiness";
import { accountRoute } from "../src/lib/account-route";
import { isServerSupabaseKey } from "../src/lib/supabase/key-validation";
const codespace = {
  CODESPACES: "true",
  CODESPACE_NAME: "client-preview-123",
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev",
};
test("Codespaces uses platform origin instead of loopback, without trusting request hosts", () => {
  assert.equal(
    configuredSiteOrigin({ ...codespace, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }),
    "https://client-preview-123-3000.app.github.dev",
  );
  assert.equal(configuredSiteOrigin(codespace), "https://client-preview-123-3000.app.github.dev");
  assert.equal(
    configuredSiteOrigin({ ...codespace, NEXT_PUBLIC_SITE_URL: "https://client.example" }),
    "https://client.example",
  );
  assert.equal(
    configuredSiteOrigin({
      ...codespace,
      GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "evil.example",
    }),
    null,
  );
  assert.equal(configuredSiteOrigin({ ...codespace, CODESPACE_NAME: "evil.test/path" }), null);
  assert.equal(configuredSiteOrigin({ HTTP_HOST: "evil.example" }), null);
});
test("invalid origins return controlled unavailable state and reject secret-bearing URLs", () => {
  for (const value of [
    "bad url",
    "http://remote.example",
    "https://user:password@example.com",
    "https://example.com/path",
    "https://example.com?secret=private",
    "https://example.com#fragment",
  ])
    assert.equal(configuredSiteOrigin({ NEXT_PUBLIC_SITE_URL: value }), null);
  assert.equal(
    configuredSiteOrigin({ NEXT_PUBLIC_SITE_URL: " https://example.com/ " }),
    "https://example.com",
  );
});
test("only actual active membership roles reach their portal, never automatic owner promotion", () => {
  for (const role of ["owner", "manager", "dispatcher", "viewer"])
    assert.equal(accountRoute({ role, active: true }), "/admin");
  assert.equal(accountRoute({ role: "driver", active: true }), "/driver-account");
  for (const member of [null, { role: "owner", active: false }, { role: "invited", active: true }])
    assert.equal(accountRoute(member), "/access-pending");
});
test("enquiry readiness rejects placeholders and missing origin without requiring CAPTCHA for quote-only code", () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://hzcupgjphowrzvrdffrf.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unit_test",
    SUPABASE_SERVICE_ROLE_KEY: "sb_secret_unit_test",
    HAMDI_ORGANIZATION_ID: "10000000-0000-4000-8000-000000000001",
    NEXT_PUBLIC_SITE_URL: "https://client.example",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "unit-test-public",
    TURNSTILE_SECRET_KEY: "unit-test-private",
  };
  assert.deepEqual(enquiryConfigurationIssues(env), []);
  assert.equal(enquiryConfigurationIssues({ ...env, NEXT_PUBLIC_SITE_URL: "invalid" }).length, 1);
  assert.equal(
    enquiryConfigurationIssues({ ...env, SUPABASE_SERVICE_ROLE_KEY: "your_service_role_key" })
      .length,
    1,
  );
  assert.equal(enquiryConfigurationIssues({ ...env, TURNSTILE_SECRET_KEY: "" }).length, 1);
  assert.equal(isServerSupabaseKey("sb_publishable_unit_test"), false);
  assert.equal(isServerSupabaseKey("invalid"), false);
});

test("proxy login destinations are absolute for Next 16 and retain configured preview origins", () => {
  assert.equal(loginRedirectUrl("http://127.0.0.1:3000", {}).href, "http://127.0.0.1:3000/login");
  assert.equal(
    loginRedirectUrl("http://internal:3000", codespace).href,
    "https://client-preview-123-3000.app.github.dev/login",
  );
  assert.equal(
    loginRedirectUrl("http://internal:3000", { NEXT_PUBLIC_SITE_URL: "https://client.example" })
      .href,
    "https://client.example/login",
  );
});
