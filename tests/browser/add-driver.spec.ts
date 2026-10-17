import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";

let bundle: string;

test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {RecordForm} from './src/components/record-form';import Records from './src/app/admin/[entity]/page';const root=createRoot(document.getElementById('root'));root.render(<RecordForm entity="drivers" related={{}} />);globalThis.renderSavedDrivers=async()=>{const view=await Records({params:Promise.resolve({entity:'drivers'}),searchParams:Promise.resolve({notice:'saved'})});root.render(view);};`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "offline-driver-form",
        setup(buildContext) {
          buildContext.onResolve({ filter: /^@\/app\/admin\/actions$/ }, () => ({
            path: "actions",
            namespace: "fixture",
          }));
          buildContext.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
            path: "auth",
            namespace: "fixture",
          }));
          buildContext.onResolve({ filter: /^next\/navigation$/ }, () => ({
            path: "navigation",
            namespace: "fixture",
          }));
          buildContext.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            contents:
              args.path === "auth"
                ? `const record={id:'a0000000-0000-4000-8000-000000000001',updated_at:'2026-10-17T08:00:00Z',archived:false,name:'Test-only driver',phone:'+971501234567',license_number:'TEST-LICENCE-001',status:'available'};export async function requireStaff(){return {member:{organization_id:'test-org',role:'owner'},supabase:{from(){return {select(){return this},eq(){return this},order(){return this},range(){return Promise.resolve({data:[record],count:1,error:null})}}}}}}`
                : args.path === "navigation"
                  ? `export function notFound(){throw new Error('Unexpected notFound')};export function redirect(path){throw new Error('Unexpected redirect:'+path)}`
                  : `export async function saveRecord(entity,id,previous,form){globalThis.driverSubmissions.push(Object.fromEntries(form.entries()));return {error:'Local test rejection'};}export async function searchOptions(){return {options:[],error:undefined};}export async function archiveRecord(){}`,
            loader: "js",
          }));
          buildContext.onResolve({ filter: /^next\/link$/ }, () => ({
            path: resolve("tests/browser/link-fixture.tsx"),
          }));
        },
      },
    ],
  });
  bundle = result.outputFiles[0].text;
});

test("Add Driver form enforces browser constraints and presents server errors accessibly", async ({
  page,
}) => {
  await page.route("**/__add-driver-ui-test", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: '<div id="root"></div>' }),
  );
  await page.goto("/__add-driver-ui-test");
  await page.evaluate(() => {
    (globalThis as typeof globalThis & { driverSubmissions: unknown[] }).driverSubmissions = [];
  });
  await page.addScriptTag({ content: bundle });
  const submissions = () =>
    page.evaluate(
      () => (globalThis as typeof globalThis & { driverSubmissions: unknown[] }).driverSubmissions,
    );

  const name = page.getByLabel("Full name *");
  const phone = page.getByLabel("Phone *");
  const email = page.getByLabel("Email");
  const licence = page.getByLabel("Driving licence number *");
  const expiry = page.getByLabel("Licence expiry");
  const availability = page.getByLabel("Availability *");
  const accountStatus = page.getByLabel("Account status *");
  const submit = page.getByRole("button", { name: "Save record" });

  await expect(name).toHaveAttribute("required", "");
  await expect(phone).toHaveAttribute("type", "tel");
  await expect(phone).toHaveAttribute("required", "");
  await expect(email).toHaveAttribute("type", "email");
  await expect(licence).toHaveAttribute("required", "");
  await expect(expiry).toHaveAttribute("type", "date");
  await expect(expiry).not.toHaveAttribute("required", "");
  await expect(availability.locator("option")).toHaveText(["available", "on trip", "unavailable"]);
  await expect(accountStatus.locator("option")).toHaveText(["active", "inactive"]);
  await expect(submit).toBeEnabled();

  await submit.click();
  expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  expect(await submissions()).toEqual([]);

  await name.fill("Test-only driver");
  await phone.fill("+971501234567");
  await email.fill("not-an-email");
  await licence.fill("TEST-LICENCE-001");
  await submit.click();
  expect(await email.evaluate((input: HTMLInputElement) => input.validity.typeMismatch)).toBe(true);
  expect(await submissions()).toEqual([]);

  await email.fill("driver@example.test");
  await expiry.fill("2028-02-29");
  await availability.selectOption("available");
  await accountStatus.selectOption("active");
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText("Local test rejection");
  await expect(name).toHaveValue("Test-only driver");
  expect(await submissions()).toEqual([
    {
      name: "Test-only driver",
      phone: "+971501234567",
      email: "driver@example.test",
      license_number: "TEST-LICENCE-001",
      license_expiry: "2028-02-29",
      status: "available",
      account_status: "active",
      notes: "",
      updated_at: "",
    },
  ]);

  await page.evaluate(async () => {
    await (
      globalThis as typeof globalThis & { renderSavedDrivers: () => Promise<void> }
    ).renderSavedDrivers();
  });
  await expect(page.getByRole("status")).toHaveText("Record saved.");
  await expect(page.getByRole("row", { name: /Test-only driver/ })).toBeVisible();
});
