import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

type DriverRecord = Record<string, string | number | boolean | null>;
type Context = {
  member: { role: string; organization_id: string };
  supabase: { from: (table: string) => { insert: (record: DriverRecord) => Promise<unknown> } };
};
type Boundary = { context?: Context; inserted: DriverRecord[]; revalidated: string[] };
type SaveAction = (
  entity: string,
  id: string | null,
  previous: object,
  form: FormData,
) => Promise<{ error?: string }>;

test("driver create action validates role, persists only approved fields and redirects on success", async () => {
  const boundary: Boundary = { inserted: [], revalidated: [] };
  const globals = globalThis as typeof globalThis & { __recordBoundary?: Boundary };
  globals.__recordBoundary = boundary;
  try {
    const result = await build({
      entryPoints: ["src/app/admin/actions.ts"],
      bundle: true,
      platform: "node",
      format: "cjs",
      write: false,
      plugins: [
        {
          name: "offline-record-action",
          setup(buildContext) {
            const mocks: Record<string, string> = {
              "@/lib/auth":
                "export const requireStaff=async()=>globalThis.__recordBoundary.context",
              "next/cache":
                "export const revalidatePath=path=>globalThis.__recordBoundary.revalidated.push(path)",
              "next/navigation": "export const redirect=path=>{throw new Error('REDIRECT:'+path)}",
            };
            buildContext.onResolve({ filter: /.*/ }, (args) =>
              args.path in mocks ? { path: args.path, namespace: "mock" } : undefined,
            );
            buildContext.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
              contents: mocks[args.path],
              loader: "js",
            }));
          },
        },
      ],
    });
    const compiledModule = { exports: {} as Record<string, SaveAction> };
    new Function("require", "module", "exports", result.outputFiles[0].text)(
      createRequire(import.meta.url),
      compiledModule,
      compiledModule.exports,
    );
    const saveRecord = compiledModule.exports.saveRecord;
    const form = new FormData();
    for (const [key, value] of Object.entries({
      name: "Test-only driver",
      phone: "+971501234567",
      email: "DRIVER@EXAMPLE.TEST",
      license_number: "TEST-LICENCE-001",
      license_expiry: "2028-02-29",
      status: "available",
      account_status: "active",
    }))
      form.set(key, value);

    boundary.context = {
      member: { role: "dispatcher", organization_id: "test-org" },
      supabase: {
        from: () => ({
          insert: async () => {
            throw new Error("Dispatcher must not reach the database write.");
          },
        }),
      },
    };
    assert.equal(
      (await saveRecord("drivers", null, {}, form)).error,
      "You do not have permission to change these records.",
    );
    assert.equal(boundary.inserted.length, 0);

    boundary.context = {
      member: { role: "owner", organization_id: "test-org" },
      supabase: {
        from: (table) => ({
          insert: async (record) => {
            assert.equal(table, "drivers");
            boundary.inserted.push(record);
            return { error: null };
          },
        }),
      },
    };
    form.set("phone", "not-a-phone");
    assert.equal(
      (await saveRecord("drivers", null, {}, form)).error,
      "Enter a valid phone number.",
    );
    assert.equal(boundary.inserted.length, 0);
    form.set("phone", "+971501234567");
    form.set("email", "not-an-email");
    assert.equal(
      (await saveRecord("drivers", null, {}, form)).error,
      "Enter a valid email address.",
    );
    assert.equal(boundary.inserted.length, 0);

    form.set("email", "DRIVER@EXAMPLE.TEST");
    await assert.rejects(saveRecord("drivers", null, {}, form), {
      message: "REDIRECT:/admin/drivers?notice=saved",
    });
    assert.deepEqual(boundary.inserted, [
      {
        name: "Test-only driver",
        phone: "+971501234567",
        email: "driver@example.test",
        license_number: "TEST-LICENCE-001",
        license_expiry: "2028-02-29",
        status: "available",
        account_status: "active",
        notes: null,
        organization_id: "test-org",
      },
    ]);
    assert.deepEqual(boundary.revalidated, ["/admin"]);
  } finally {
    delete globals.__recordBoundary;
  }
});
