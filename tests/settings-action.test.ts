import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

test("business settings preserve authorization, validation and uncertain-save handling", async () => {
  const state = { authorized: false, transportFails: true, revalidated: [] as string[], writes: 0 };
  const globals = globalThis as typeof globalThis & { __settingsSprint?: typeof state };
  globals.__settingsSprint = state;
  try {
    const compiled = await build({
      entryPoints: ["src/app/admin/settings/actions.ts"],
      bundle: true,
      write: false,
      platform: "node",
      format: "cjs",
      plugins: [
        {
          name: "offline-settings-boundary",
          setup(b) {
            const mocks: Record<string, string> = {
              "@/lib/auth": `export const requireOwner=async()=>{const s=globalThis.__settingsSprint;if(!s.authorized)throw new Error('AUTH_REQUIRED');return {member:{organization_id:'test-org'},supabase:{from:()=>({insert:async()=>{s.writes++;if(s.transportFails)throw new Error('private transport detail');return {error:null}}})}}}`,
              "next/cache":
                "export const revalidatePath=p=>globalThis.__settingsSprint.revalidated.push(p)",
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
    const mod = {
      exports: {} as {
        saveSettings: (
          previous: object,
          form: FormData,
        ) => Promise<{ error?: string; success?: string }>;
      },
    };
    new Function("require", "module", "exports", compiled.outputFiles[0].text)(
      createRequire(import.meta.url),
      mod,
      mod.exports,
    );
    const form = new FormData();
    await assert.rejects(mod.exports.saveSettings({}, form), { message: "AUTH_REQUIRED" });
    state.authorized = true;
    assert.ok((await mod.exports.saveSettings({}, form)).error);
    assert.equal(state.writes, 0);
    for (const [key, value] of Object.entries({
      display_name: "Local settings fixture",
      contact_email: "",
      phone: "",
      whatsapp: "",
      address: "",
      about_text: "",
      booking_policy: "",
      cancellation_policy: "",
      currency: "AED",
      minimum_notice_hours: "0",
      turnaround_minutes: "15",
      brand_color: "#c5a46d",
      ink_color: "#101827",
      canvas_color: "#fffaf0",
      font_family: "system",
    }))
      form.set(key, value);
    const failed = await mod.exports.saveSettings({}, form);
    assert.match(failed.error!, /could not be confirmed/);
    assert.ok(!failed.error?.includes("private transport detail"));
    assert.equal(failed.success, undefined);
    assert.deepEqual(state.revalidated, []);
    state.transportFails = false;
    assert.equal((await mod.exports.saveSettings({}, form)).success, "Business settings saved.");
    assert.deepEqual(state.revalidated, ["/", "/admin/settings"]);
  } finally {
    delete globals.__settingsSprint;
  }
});
