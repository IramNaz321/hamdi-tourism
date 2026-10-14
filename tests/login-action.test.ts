import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

test("real login action dispatches roles, blocks unconfirmed accounts and preserves Auth errors", async () => {
  const state: { client?: unknown } = {};
  const result = await build({
    entryPoints: ["src/app/auth/actions.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    plugins: [
      {
        name: "local-auth-boundary",
        setup(build) {
          const mocks: Record<string, string> = {
            "@/lib/supabase/server":
              "export const isConfigured=()=>true; export const createClient=async()=>globalThis.__loginBoundary.client;",
            "@/lib/auth": "export const siteOrigin=()=> 'https://test.invalid';",
            "@/lib/tracking": "export const trackingPath=()=>null;",
            "next/navigation": "export const redirect=(path)=>{throw new Error('REDIRECT:'+path)};",
          };
          build.onResolve(
            { filter: /^(next\/navigation|@\/lib\/(supabase\/server|auth|tracking))$/ },
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
  const globals = globalThis as typeof globalThis & { __loginBoundary?: typeof state };
  globals.__loginBoundary = state;
  try {
    const actionModule = {
      exports: {} as { login: (state: object, form: FormData) => Promise<{ error?: string }> },
    };
    new Function("require", "module", "exports", result.outputFiles[0].text)(
      createRequire(import.meta.url),
      actionModule,
      actionModule.exports,
    );
    const form = new FormData();
    form.set("email", "person@example.invalid");
    form.set("password", "local-boundary-only");
    const client = (
      member: unknown,
      confirmed = true,
      error: unknown = null,
      membershipError: unknown = null,
    ) => ({
      auth: {
        signInWithPassword: async () => ({
          data: { user: { id: "local-user", email_confirmed_at: confirmed ? "confirmed" : null } },
          error,
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: member, error: membershipError }) }),
        }),
      }),
    });
    for (const [member, path] of [
      [null, "/access-pending"],
      [{ role: "driver", active: true }, "/driver-account"],
      [{ role: "owner", active: true }, "/admin"],
      [{ role: "driver", active: false }, "/access-pending"],
    ] as const) {
      state.client = client(member);
      await assert.rejects(actionModule.exports.login({}, form), { message: `REDIRECT:${path}` });
    }
    state.client = client(null, false);
    assert.match((await actionModule.exports.login({}, form)).error!, /Confirm your email/);
    state.client = client(null, true, { code: "invalid_credentials", status: 400 });
    assert.match((await actionModule.exports.login({}, form)).error!, /password/i);
    state.client = client(null, true, null, { code: "schema_missing" });
    assert.match(
      (await actionModule.exports.login({}, form)).error!,
      /permissions could not be verified/,
    );
    state.client = {
      auth: {
        signInWithPassword: async () => {
          throw new Error("transport");
        },
      },
    };
    assert.match((await actionModule.exports.login({}, form)).error!, /could not be reached/);
  } finally {
    delete globals.__loginBoundary;
  }
});
