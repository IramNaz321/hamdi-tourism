import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {TurnstileChallenge} from './src/components/turnstile-challenge';function Harness(){const[token,setToken]=useState('');const[show,setShow]=useState(true);return <>{show&&<TurnstileChallenge action="sign_in" onToken={setToken}/>}<input aria-label="Challenge token" value={token} readOnly/><button disabled={!token}>Submit test form</button><button onClick={()=>setShow(false)}>Close check</button></>}createRoot(document.getElementById('root')).render(<Harness/>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY": '"local-public-key"',
    },
    plugins: [
      {
        name: "offline-provider-loader",
        setup(b) {
          b.onResolve({ filter: /^next\/script$/ }, () => ({
            path: "script",
            namespace: "fixture",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `import {useEffect} from 'react';export default function Script({onReady,onError}){useEffect(()=>{if(globalThis.testChallengeMode==='load-error')onError();else onReady();},[]);return null;}`,
            loader: "js",
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
  });
  bundle = result.outputFiles[0].text;
});
async function mount(page: Page, mode: string) {
  await page.route("**/__challenge-status", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: '<div id="root"></div>' }),
  );
  await page.goto("/__challenge-status");
  await page.evaluate((mode) => {
    Object.assign(window, {
      testChallengeMode: mode,
      turnstile: {
        render: (_element: unknown, callbacks: unknown) => {
          if (mode === "render-error") throw new Error("SDK render failure");
          Object.assign(window, { testChallengeCallbacks: callbacks });
          return "local-widget";
        },
        remove: () => {
          throw new Error("SDK cleanup failure");
        },
      },
    });
  }, mode);
  await page.addScriptTag({ content: bundle });
}
test("security-check expiration clears tokens and unmounted widgets cannot revive them", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mount(page, "normal");
  await expect(page.getByRole("status")).toHaveText("Complete the security check to continue.");
  await page.evaluate(() => {
    (
      window as unknown as { testChallengeCallbacks: { callback: (token: string) => void } }
    ).testChallengeCallbacks.callback("local-verified-token");
  });
  await expect(page.getByRole("button", { name: "Submit test form" })).toBeEnabled();
  await page.evaluate(() => {
    (
      window as unknown as { testChallengeCallbacks: Record<string, () => void> }
    ).testChallengeCallbacks["expired-callback"]();
  });
  await expect(page.getByRole("status")).toContainText("expired");
  await expect(page.getByLabel("Challenge token")).toHaveValue("");
  await page.getByRole("button", { name: "Close check" }).click();
  await page.evaluate(() => {
    (
      window as unknown as { testChallengeCallbacks: { callback: (token: string) => void } }
    ).testChallengeCallbacks.callback("late-stale-token");
  });
  await expect(page.getByRole("button", { name: "Submit test form" })).toBeDisabled();
  expect(errors).toEqual([]);
});
test("loader and widget failures show an explicit unavailable state without enabling submission", async ({
  page,
}) => {
  for (const mode of ["load-error", "render-error"]) {
    await mount(page, mode);
    await expect(page.getByRole("alert")).toContainText("Security check is unavailable");
    await expect(page.getByRole("button", { name: "Reload security check" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit test form" })).toBeDisabled();
  }
});
