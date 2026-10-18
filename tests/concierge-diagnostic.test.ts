import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("grounding-only diagnostic is read-only, secret-safe and cannot enable or call AI", () => {
  const dir = mkdtempSync(join(tmpdir(), "hamdi-concierge-fixture-"));
  try {
    const preload = join(dir, "fetch.mjs");
    writeFileSync(
      preload,
      `globalThis.fetch=async(input)=>{const url=String(input);if(!url.endsWith('/rest/v1/rpc/concierge_context'))throw Error('Unexpected network request');return new Response(JSON.stringify({public:process.env.TEST_CONTEXT==='present'?{settings:{display_name:'Local fixture'}}:null,fares:[]}),{status:200,headers:{'Content-Type':'application/json'}})};`,
    );
    for (const present of [false, true]) {
      const result = spawnSync(
        process.execPath,
        ["--import", preload, "--import", "tsx", "scripts/check-concierge.ts", "--grounding-only"],
        {
          encoding: "utf8",
          timeout: 15000,
          env: {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_offline_fixture",
            HAMDI_ORGANIZATION_ID: "a0000000-0000-4000-8000-000000000001",
            NEXT_PUBLIC_SITE_URL: "https://test.invalid",
            GROQ_API_KEY: "private-cli-canary",
            GROQ_MODEL: "openai/gpt-oss-20b",
            AI_RATE_LIMIT_SECRET: "offline-test-secret-at-least-32-characters",
            NEXT_PUBLIC_TURNSTILE_SITE_KEY: "fixture",
            TURNSTILE_SECRET_KEY: "private-cli-canary",
            GROQ_CONCIERGE_ENABLED: "false",
            TEST_CONTEXT: present ? "present" : "absent",
          },
        },
      );
      assert.equal(result.status, present ? 0 : 2);
      const report = JSON.parse(result.stdout);
      assert.equal(report.publicGroundingVerified, present);
      assert.equal(report.providerRequests, 0);
      assert.equal(report.databaseWrites, false);
      assert.equal(report.rateLimitConsumption, false);
      assert.equal(report.enabled, false);
      assert.equal(report.previewEnablementAllowed, false);
      assert.equal(
        report.liveProbe,
        present
          ? "public_grounding_pass_provider_not_tested"
          : "blocked_no_published_business_information",
      );
      assert.ok(!result.stdout.includes("private-cli-canary"));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
