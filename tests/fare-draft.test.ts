import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

test("fare review uses existing organization/route/fleet and never publishes or overwrites", async () => {
  const state = {
    existing: false,
    fail: false,
    inserts: [] as Record<string, unknown>[],
    filters: [] as unknown[],
  };
  const g = globalThis as typeof globalThis & { __fareTest?: typeof state };
  g.__fareTest = state;
  const result = await build({
    entryPoints: ["src/app/admin/pricing-review/actions.ts"],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    plugins: [
      {
        name: "isolated-fare-boundary",
        setup(b) {
          const mocks: Record<string, string> = {
            "next/cache": "export const revalidatePath=()=>{}",
            "@/lib/auth": `export const requireOwner=async()=>({member:{organization_id:'a0000000-0000-4000-8000-000000000001'},supabase:{from:(table)=>{const s=globalThis.__fareTest;if(s.fail)throw Error('private transport');const query={select:()=>query,eq:(k,v)=>{s.filters.push([k,v]);return query},limit:()=>query,maybeSingle:async()=>({data:table==='routes'?{id:'a0000000-0000-4000-8000-000000000002',name:'Local fixture',pickup_location_id:'a0000000-0000-4000-8000-000000000003',dropoff_location_id:'a0000000-0000-4000-8000-000000000004'}:table==='vehicles'?{id:'a0000000-0000-4000-8000-000000000005'}:s.existing?{id:'existing'}:null,error:null}),insert:async(row)=>{if(table!=='route_pricing')throw Error('unexpected creation');s.inserts.push(row);return {error:null}}};return query}}})`,
          };
          b.onResolve({ filter: /.*/ }, (a) =>
            a.path in mocks ? { path: a.path, namespace: "fixture" } : undefined,
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
            loader: "js",
            contents: mocks[a.path],
          }));
        },
      },
    ],
  });
  const mod = {
    exports: {} as {
      saveFareDraft: (s: object, f: FormData) => Promise<{ success?: string; error?: string }>;
    },
  };
  new Function("require", "module", "exports", result.outputFiles[0].text)(
    createRequire(import.meta.url),
    mod,
    mod.exports,
  );
  const f = new FormData();
  Object.entries({
    route_id: "a0000000-0000-4000-8000-000000000002",
    category: "sedan",
    price_aed: "100",
    additional_charges_aed: "0",
    return_fare_aed: "",
    confirm: "yes",
  }).forEach(([k, v]) => f.set(k, v));
  try {
    assert.match((await mod.exports.saveFareDraft({}, f)).success!, /unpublished/);
    assert.equal(state.inserts.length, 1);
    assert.equal(state.inserts[0].public_listed, false);
    assert.equal(state.inserts[0].organization_id, "a0000000-0000-4000-8000-000000000001");
    state.existing = true;
    assert.match((await mod.exports.saveFareDraft({}, f)).error!, /already exists/);
    assert.equal(state.inserts.length, 1);
    state.fail = true;
    assert.match((await mod.exports.saveFareDraft({}, f)).error!, /could not be confirmed/);
    state.fail = false;
    f.delete("confirm");
    assert.match((await mod.exports.saveFareDraft({}, f)).error!, /confirm/);
    assert.equal(state.inserts.length, 1);
  } finally {
    delete g.__fareTest;
  }
});
