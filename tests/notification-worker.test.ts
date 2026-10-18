import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

test("notification worker authenticates, uses fixed owner recipient and retries stable idempotent sends safely", async () => {
  const row = {
    id: "a0000000-0000-4000-8000-000000000001",
    booking_id: "a0000000-0000-4000-8000-000000000001",
    lease: "a0000000-0000-4000-8000-000000000002",
    reference: "TEST-ONLY",
    pickup_name: "Fixture origin",
    dropoff_name: "Fixture destination",
    customer_name: "Local fixture",
    customer_email: "fixture@example.test",
    customer_phone: "1234567",
    pickup_at: "2099-01-01T10:00:00Z",
    passengers: 1,
    luggage: 0,
    vehicle_category: "sedan",
    price_aed: 100,
    payment_status: "unpaid",
    flight_number: null,
    first_attempt_at: new Date().toISOString(),
    attempt: 1,
  };
  const state = {
    calls: [] as { name: string; args: Record<string, unknown> }[],
    row: row as unknown,
    status: 200,
    failResult: false,
  };
  const global = globalThis as typeof globalThis & { __notificationTest?: typeof state };
  global.__notificationTest = state;
  const bundled = await build({
    entryPoints: ["src/app/api/notifications/run/route.ts"],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    plugins: [
      {
        name: "offline-notification-boundaries",
        setup(b) {
          const mocks: Record<string, string> = {
            "next/server":
              "export const NextResponse={json:(body,{status=200}={})=>new Response(JSON.stringify(body),{status})}",
            "@/lib/auth": "export const siteOrigin=()=> 'https://test.invalid'",
            "@/lib/supabase/admin": `export const createServiceClient=()=>({rpc:async(name,args)=>{const s=globalThis.__notificationTest;s.calls.push({name,args});if(name==='notification_claim')return {data:[],error:null};if(name==='owner_notification_claim')return {data:[s.row],error:null};return {error:s.failResult?{}:null}}})`,
          };
          b.onResolve({ filter: /.*/ }, (a) =>
            a.path in mocks ? { path: a.path, namespace: "fixture" } : undefined,
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
            contents: mocks[a.path],
            loader: "js",
          }));
        },
      },
    ],
  });
  const mod = { exports: {} as { POST: (r: Request) => Promise<Response> } };
  new Function("require", "module", "exports", bundled.outputFiles[0].text)(
    createRequire(import.meta.url),
    mod,
    mod.exports,
  );
  const keys = [
    "NOTIFICATION_EMAIL_ENABLED",
    "RESEND_API_KEY",
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
    "NOTIFICATION_FROM",
    "NOTIFICATION_WORKER_SECRET",
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const original = globalThis.fetch;
  const sent: { body: Record<string, unknown>; key: string | null }[] = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(new Headers(init?.headers).get("api-key"), "offline-test-only");
    assert.equal(init?.redirect, "error");
    sent.push({
      body: JSON.parse(String(init?.body)),
      key: JSON.parse(String(init?.body)).headers.IdempotencyKey,
    });
    return new Response(
      JSON.stringify(
        state.status === 200 ? { messageId: "offline-provider-id" } : { message: "limit" },
      ),
      { status: state.status },
    );
  };
  const req = (authorized = true) =>
    mod.exports.POST(
      new Request("https://test.invalid/api/notifications/run", {
        method: "POST",
        headers: authorized
          ? { authorization: `Bearer ${process.env.NOTIFICATION_WORKER_SECRET}` }
          : {},
      }),
    );
  try {
    process.env.NOTIFICATION_EMAIL_ENABLED = "false";
    assert.equal((await req()).status, 503);
    Object.assign(process.env, {
      NOTIFICATION_EMAIL_ENABLED: "true",
      RESEND_API_KEY: "",
      BREVO_API_KEY: "offline-test-only",
      BREVO_SENDER_EMAIL: "fixture@example.test",
      NOTIFICATION_FROM: "",
      NOTIFICATION_WORKER_SECRET: "offline-worker-secret-over-32-characters",
    });
    const brevoKey = process.env.BREVO_API_KEY;
    delete process.env.BREVO_API_KEY;
    assert.equal((await req()).status, 503);
    process.env.BREVO_API_KEY = brevoKey;
    process.env.BREVO_SENDER_EMAIL = "invalid-sender";
    assert.equal((await req()).status, 503);
    process.env.BREVO_SENDER_EMAIL = "fixture@example.test";
    assert.equal((await req(false)).status, 401);
    assert.equal(state.calls.length, 0);
    assert.equal(sent.length, 0);
    assert.equal((await req()).status, 200);
    assert.deepEqual(sent[0].body.to, [{ email: "Hamid.shah@mail.ru" }]);
    assert.deepEqual(sent[0].body.sender, { name: "HAMDI TOURISM", email: "fixture@example.test" });
    assert.ok(String(sent[0].body.textContent).includes("fixture@example.test"));
    assert.ok(String(sent[0].body.textContent).includes("Local fixture"));
    assert.equal(sent[0].key, `hamdi-owner-booking:${row.id}`);
    assert.equal(sent[0].body.cc, undefined);
    assert.equal(sent[0].body.bcc, undefined);
    assert.ok(String(sent[0].body.textContent).includes("TEST-ONLY"));
    assert.equal(state.calls.at(-1)?.args.was_accepted, true);
    state.status = 429;
    assert.equal((await req()).status, 200);
    assert.equal(state.calls.at(-1)?.args.was_accepted, false);
    assert.equal(state.calls.at(-1)?.args.provider_message, null);
    assert.equal(sent[1].key, sent[0].key);
    assert.deepEqual(sent[1].body, sent[0].body);
    state.failResult = true;
    assert.equal((await req()).status, 503);
    state.failResult = false;
    state.row = { ...row, first_attempt_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() };
    const expiredCount = sent.length;
    assert.equal((await req()).status, 200);
    assert.equal(sent.length, expiredCount);
    assert.equal(state.calls.at(-1)?.args.was_accepted, false);
    const { first_attempt_at: omittedTimestamp, ...legacyRow } = row;
    void omittedTimestamp;
    state.row = legacyRow;
    assert.equal((await req()).status, 503);
    assert.equal(sent.length, expiredCount);
    state.row = { ...row, private_notes: "must not be mailed" };
    const before = sent.length;
    assert.equal((await req()).status, 503);
    assert.equal(sent.length, before);
    // Configuring Brevo must not be required for the pre-existing passenger adapter.
    delete process.env.BREVO_API_KEY;
    process.env.RESEND_API_KEY = "offline-test-only";
    process.env.NOTIFICATION_FROM = "Fixture <fixture@example.test>";
    const claimsBefore = state.calls.filter(
      (call) => call.name === "owner_notification_claim",
    ).length;
    assert.equal((await req()).status, 200);
    assert.equal(
      state.calls.filter((call) => call.name === "owner_notification_claim").length,
      claimsBefore,
    );
    assert.equal(sent.length, before);
  } finally {
    globalThis.fetch = original;
    delete global.__notificationTest;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
