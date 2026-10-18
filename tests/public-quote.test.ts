import { test } from "node:test";
import assert from "node:assert/strict";
import { transferQuoteSchema } from "../src/lib/booking-validation";

test("public quote evidence rejects malformed, inconsistent and duplicate-priced extras", () => {
  const quote = {
    pricing_id: "a0000000-0000-4000-8000-000000000001",
    currency: "AED",
    base_fare: 100,
    additional_charges: 5,
    outbound_aed: 105,
    return_aed: null,
    total_aed: 105,
    extras: [],
  };
  assert.equal(transferQuoteSchema.safeParse(quote).success, true);
  for (const value of [
    null,
    { ...quote, currency: "USD" },
    { ...quote, total_aed: 1 },
    { ...quote, base_fare: NaN },
    { ...quote, return_aed: -1 },
  ])
    assert.equal(transferQuoteSchema.safeParse(value).success, false);
  const extra = {
    id: quote.pricing_id,
    name: "Local fixture",
    price_aed: 0,
    charge_basis: "per_leg",
  };
  assert.equal(transferQuoteSchema.safeParse({ ...quote, extras: [extra, extra] }).success, false);
});

test("concierge acceptance command redacts credentials and refuses live requests when incomplete", async () => {
  const { spawnSync } = await import("node:child_process");
  const secret = "offline-canary-not-a-real-key";
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/check-concierge.ts", "--live"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GROQ_API_KEY: secret,
        GROQ_MODEL: "",
        AI_RATE_LIMIT_SECRET: "",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
        TURNSTILE_SECRET_KEY: "",
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
        GROQ_CONCIERGE_ENABLED: "false",
      },
    },
  );
  assert.equal(result.status, 2);
  assert.ok(!result.stdout.includes(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.liveProbe, "blocked_missing_or_invalid_configuration");
  assert.equal(report.enablementChanged, false);
  assert.equal(report.enabled, false);
});
