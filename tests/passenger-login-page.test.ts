import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

test("Passenger login restores confirmed sessions by role, denies membership errors and keeps recovery reachable", async () => {
  const boundary: { client?: unknown } = {};
  const result = await build({
    entryPoints: ["src/app/passenger/login/page.tsx"],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    jsx: "automatic",
    plugins: [
      {
        name: "auth-page-boundary",
        setup(build) {
          const mocks: Record<string, string> = {
            "@/lib/supabase/server":
              "export const isConfigured=()=>true;export const createClient=async()=>globalThis.__passengerPage.client;",
            "next/navigation": "export const redirect=(path)=>{throw new Error('REDIRECT:'+path)};",
            "next/link": "export default function Link(){return null}",
            "@/components/passenger-forms": "export const PassengerAuthForm=()=>null;",
          };
          build.onResolve(
            {
              filter:
                /^(next\/(navigation|link)|@\/lib\/supabase\/server|@\/components\/passenger-forms)$/,
            },
            (args) => ({ path: args.path, namespace: "mock" }),
          );
          build.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
            contents: mocks[args.path],
            loader: "js",
          }));
        },
      },
    ],
  });
  const globals = globalThis as typeof globalThis & { __passengerPage?: typeof boundary };
  globals.__passengerPage = boundary;
  try {
    const compiled = {
      exports: {} as {
        default: (props: {
          searchParams: Promise<{ next?: string; mode?: string }>;
        }) => Promise<unknown>;
      },
    };
    new Function("require", "module", "exports", result.outputFiles[0].text)(
      createRequire(import.meta.url),
      compiled,
      compiled.exports,
    );
    const page = compiled.exports.default;
    const props = { searchParams: Promise.resolve({}) };
    for (const [member, path] of [
      [null, "/passenger"],
      [{ role: "driver", active: true }, "/driver-account"],
      [{ role: "owner", active: true }, "/admin"],
      [{ role: "driver", active: false }, "/access-pending"],
    ] as const) {
      boundary.client = {
        auth: {
          getUser: async () => ({
            data: { user: { id: "local", email_confirmed_at: "confirmed" } },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: member, error: null }) }),
          }),
        }),
      };
      await assert.rejects(page(props), { message: `REDIRECT:${path}` });
    }
    boundary.client = {
      auth: {
        getUser: async () => ({
          data: { user: { id: "local", email_confirmed_at: "confirmed" } },
          error: null,
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { code: "missing_schema" } }),
          }),
        }),
      }),
    };
    await assert.rejects(page(props), { message: "Unable to verify account access." });
    boundary.client = {
      auth: {
        getUser: async () => {
          throw new Error("Recovery must not query session");
        },
      },
    };
    assert.ok(await page({ searchParams: Promise.resolve({ mode: "recovery" }) }));
  } finally {
    delete globals.__passengerPage;
  }
});
