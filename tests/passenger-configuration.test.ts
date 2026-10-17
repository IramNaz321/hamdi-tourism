import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
async function compile(entry: string, mocks: Record<string, string>) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    jsx: "automatic",
    plugins: [
      {
        name: "passenger-config-boundary",
        setup(b) {
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
  const compiled = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", result.outputFiles[0].text)(
    createRequire(import.meta.url),
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
test("confirmed passengers remain authenticated without a configured business, rather than redirecting into a login loop", async () => {
  const moduleExports = await compile("src/lib/passenger.ts", {
    "server-only": "",
    "next/navigation": "export const redirect=p=>{throw new Error('Unexpected redirect:'+p)}",
    "./website": "export const publicBusinessId=()=>null",
    "./supabase/server": `export const isConfigured=()=>true;export const createClient=async()=>({auth:{getUser:async()=>({data:{user:{id:'local-passenger',email_confirmed_at:'confirmed'}},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})});`,
  });
  const context = await (
    moduleExports.requirePassenger as () => Promise<{ organizationId: null; user: { id: string } }>
  )();
  assert.equal(context.organizationId, null);
  assert.equal(context.user.id, "local-passenger");
});
test("unconfigured authenticated dashboard makes no business queries and offers logout without fabricating booking history", async () => {
  const moduleExports = await compile("src/app/passenger/page.tsx", {
    "@/lib/passenger":
      "export const requirePassenger=async()=>({organizationId:null,supabase:{rpc:()=>{throw new Error('Must not query unconfigured business')}}})",
    "next/link": "export default function Link(){return null}",
    "@/components/passenger-forms": "export const PassengerProfileForm=()=>null",
    "./actions": "export const passengerLogout=async()=>{}",
  });
  const element = await (
    moduleExports.default as (p: { searchParams: Promise<object> }) => Promise<unknown>
  )({ searchParams: Promise.resolve({}) });
  let text = "";
  let logout = false;
  const visit = (node: unknown) => {
    if (typeof node === "string") text += node + " ";
    else if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === "object" && "props" in node) {
      const e = node as { type: unknown; props: { children?: unknown; action?: unknown } };
      if (e.type === "form" && typeof e.props.action === "function") logout = true;
      visit(e.props.children);
    }
  };
  visit(element);
  assert.match(text, /You are signed in/);
  assert.match(text, /booking history could not be loaded/);
  assert.ok(logout);
  assert.doesNotMatch(text, /No journeys in this part/);
});
