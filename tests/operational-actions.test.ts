import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
type FormAction = (
  previous: object,
  form: FormData,
) => Promise<{
  error?: string;
  success?: string;
  bookings?: { id: string; reference: string; status: string }[];
  uncertain?: boolean;
}>;
test("Driver and Passenger mutations distinguish validation, permission, provider and uncertain transport outcomes", async () => {
  const boundary: { context?: unknown; revalidated: string[] } = { revalidated: [] };
  const globals = globalThis as typeof globalThis & { __operationalBoundary?: typeof boundary };
  globals.__operationalBoundary = boundary;
  const compile = async (entry: string) => {
    const result = await build({
      entryPoints: [entry],
      bundle: true,
      platform: "node",
      format: "cjs",
      write: false,
      plugins: [
        {
          name: "offline-operational-boundary",
          setup(b) {
            const mocks: Record<string, string> = {
              "@/lib/driver":
                "export const requireDriver=async()=>{if(!globalThis.__operationalBoundary.context)throw new Error('AUTH_REQUIRED');return globalThis.__operationalBoundary.context}",
              "@/lib/passenger":
                "export const requirePassenger=async()=>{if(!globalThis.__operationalBoundary.context)throw new Error('AUTH_REQUIRED');return globalThis.__operationalBoundary.context}",
              "@/lib/auth": "export const siteOrigin=()=> 'https://test.invalid'",
              "@/lib/supabase/server":
                "export const isConfigured=()=>false;export const createClient=async()=>null;",
              "next/cache":
                "export const revalidatePath=p=>globalThis.__operationalBoundary.revalidated.push(p)",
              "next/navigation": "export const redirect=p=>{throw new Error('REDIRECT:'+p)}",
            };
            b.onResolve({ filter: /.*/ }, (args) =>
              args.path in mocks ? { path: args.path, namespace: "mock" } : undefined,
            );
            b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
              contents: mocks[args.path],
              loader: "js",
            }));
          },
        },
      ],
    });
    const compiled = { exports: {} as Record<string, FormAction> };
    new Function("require", "module", "exports", result.outputFiles[0].text)(
      createRequire(import.meta.url),
      compiled,
      compiled.exports,
    );
    return compiled.exports;
  };
  try {
    const driver = await compile("src/app/driver-account/actions.ts");
    const form = new FormData();
    form.set("id", "a0000000-0000-4000-8000-000000000001");
    form.set("action", "accept");
    await assert.rejects(driver.updateDriverTrip({}, form), { message: "AUTH_REQUIRED" });
    let calls = 0;
    boundary.context = {
      supabase: {
        rpc: async () => {
          calls++;
          throw new Error("private transport detail");
        },
      },
    };
    assert.match((await driver.updateDriverTrip({}, form)).error!, /could not be confirmed/);
    assert.equal(calls, 1);
    assert.equal(boundary.revalidated.length, 0);
    form.set("action", "grant_owner");
    assert.match((await driver.updateDriverTrip({}, form)).error!, /valid trip action/);
    assert.equal(calls, 1);
    form.set("available", "false");
    assert.match((await driver.setAvailability({}, form)).error!, /could not be confirmed/);
    boundary.context = {
      supabase: {
        rpc: async (name: string, args: unknown) => {
          assert.equal(name, "set_driver_availability");
          assert.deepEqual(args, { available: false });
          return { error: null };
        },
      },
    };
    assert.equal((await driver.setAvailability({}, form)).success, "Availability updated.");
    const passenger = await compile("src/app/passenger/actions.ts");
    form.set("quote_id", "a1000000-0000-4000-8000-000000000001");
    form.set("request_id", "a2000000-0000-4000-8000-000000000001");
    form.set("acknowledged", "on");
    for (const data of [null, [], [{ id: "invalid", reference: "", status: "confirmed" }]]) {
      boundary.context = { supabase: { rpc: async () => ({ data, error: null }) } };
      const result = await passenger.createPassengerBooking({}, form);
      assert.equal(result.bookings, undefined);
      assert.equal(result.uncertain, true);
    }
    boundary.context = {
      supabase: {
        rpc: async () => {
          throw new Error("private transport detail");
        },
      },
    };
    const uncertain = await passenger.createPassengerBooking({}, form);
    assert.equal(uncertain.uncertain, true);
    assert.ok(!uncertain.error?.includes("private transport detail"));
    const saved = {
      id: "a3000000-0000-4000-8000-000000000001",
      reference: "TEST-ONLY",
      status: "confirmed",
    };
    boundary.context = {
      supabase: {
        rpc: async (name: string, args: { request_id: string }) => {
          assert.equal(name, "passenger_create_booking");
          assert.equal(args.request_id, form.get("request_id"));
          return { data: [saved], error: null };
        },
      },
    };
    assert.deepEqual((await passenger.createPassengerBooking({}, form)).bookings, [saved]);
    boundary.context = undefined;
    await assert.rejects(passenger.createPassengerBooking({}, form), { message: "AUTH_REQUIRED" });
  } finally {
    delete globals.__operationalBoundary;
  }
});
