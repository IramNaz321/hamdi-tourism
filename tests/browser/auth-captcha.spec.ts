import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";
let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {AuthForm} from './src/components/auth-form';import {PassengerAuthForm} from './src/components/passenger-forms';globalThis.localAuthSubmissions=[];createRoot(document.getElementById('root')).render(<><section aria-label="Staff"><AuthForm mode="login" configured /></section><section aria-label="Passenger"><PassengerAuthForm mode="login" configured /></section></>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY": '"local-public-test-key"',
    },
    plugins: [
      {
        name: "offline-auth-boundary",
        setup(b) {
          b.onResolve({ filter: /^@\/app\/(auth|passenger)\/actions$/ }, () => ({
            path: "actions",
            namespace: "fixture",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            contents:
              args.path === "challenge"
                ? `import React from 'react';export function TurnstileChallenge({onToken}){return <button type="button" onClick={()=>onToken('local-single-use-token')}>Complete local security check</button>}`
                : `async function submit(previous,form){globalThis.localAuthSubmissions.push(form.get('captcha_token'));return {error:'Local rejected submission'};}export const login=submit,resetPassword=submit,updatePassword=submit,passengerLogin=submit,passengerRegister=submit,passengerRecovery=submit,savePassengerProfile=submit,requestCancellation=submit;`,
            loader: "tsx",
            resolveDir: process.cwd(),
          }));
          b.onResolve({ filter: /turnstile-challenge$/ }, () => ({
            path: "challenge",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /^next\/link$/ }, () => ({
            path: resolve("tests/browser/link-fixture.tsx"),
          }));
        },
      },
    ],
  });
  bundle = result.outputFiles[0].text;
});
test("Staff and Passenger forms gate submission on CAPTCHA and discard consumed tokens after errors", async ({
  page,
}) => {
  await page.goto("/");
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle });
  for (const name of ["Staff", "Passenger"]) {
    const form = page.getByRole("region", { name, exact: true });
    const submit = form.getByRole("button", {
      name: name === "Staff" ? "Sign in securely" : "Sign in",
      exact: true,
    });
    await expect(submit).toBeDisabled();
    await form.locator('input[name="email"]').fill("offline@example.invalid");
    await form.locator('input[name="password"]').fill("local-test-only");
    await form.getByRole("button", { name: "Complete local security check" }).click();
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(form.getByRole("alert")).toHaveText("Local rejected submission");
    await expect(submit).toBeDisabled();
    await expect(form.locator('input[name="captcha_token"]')).toHaveValue("");
  }
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { localAuthSubmissions: string[] }).localAuthSubmissions,
    ),
  ).toEqual(["local-single-use-token", "local-single-use-token"]);
});
