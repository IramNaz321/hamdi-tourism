import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";
let bundle: string;
// Isolated production-component tests use test-only action fixtures, not hosted login/bookings.
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {PassengerBookingForm} from './src/components/passenger-booking';const id='a0000000-0000-4000-8000-000000000001';createRoot(document.getElementById('root')).render(<PassengerBookingForm locations={[{id,name:'Test pickup',kind:'airport'},{id:'a0000000-0000-4000-8000-000000000002',name:'Test dropoff',kind:'hotel'}]} fleet={[{id:'a6000000-0000-4000-8000-000000000001',name:'Test vehicle',category:'sedan',capacity:4,luggage_capacity:4}]} />);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "test-actions-only",
        setup(b) {
          b.onResolve({ filter: /^@\/app\/passenger\/actions$/ }, () => ({
            path: "actions",
            namespace: "fixture",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `export async function quotePassenger(previous,form){await new Promise(r=>setTimeout(r,100));return {quote:{id:'a9000000-0000-4000-8000-000000000001',expires_at:'2099-01-01T00:00:00Z',pricing:{total_aed:115,outbound_aed:115,return_aed:null,base_fare:100,additional_charges:5,extras:[{id:'a5000000-0000-4000-8000-000000000001',name:'Test extra',price_aed:10,charge_basis:'per_leg'}]},terms:{terms:'Test terms',privacy:'Test privacy',booking_policy:'Test-only booking policy',cancellation_policy:'Test-only cancellation policy'}}};}export async function createPassengerBooking(previous,form){if(!form.get('request_id')||form.get('acknowledged')!=='on')return {error:'Invalid request'};return {bookings:[{id:'a8000000-0000-4000-8000-000000000001',reference:'TEST-ONLY',status:globalThis.testBookingStatus??'pending'}]};}`,
            loader: "js",
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
test("unconfigured booking and passenger accounts remain honest and private", async ({
  page,
  request,
}) => {
  await page.goto("/book");
  await expect(
    page.getByRole("heading", { name: "Online booking is currently unavailable" }),
  ).toBeVisible();
  await page.goto("/passenger/login");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  await page.goto("/passenger/register");
  await expect(page.getByRole("button", { name: "Create passenger account" })).toBeDisabled();
  const response = await request.get("/passenger");
  expect(response.url()).toContain("/passenger/login");
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("concierge supports RTL and honestly reports absent provider configuration", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  await page
    .getByRole("complementary", { name: "Travel concierge" })
    .getByLabel("Language")
    .selectOption("ar");
  await page.getByLabel("Your question").fill("ما هي خدمة النقل؟");
  await expect(page.getByLabel("Your question")).toHaveCSS("direction", "rtl");
  await page.getByRole("button", { name: "Ask concierge" }).click();
  await expect(
    page.getByRole("complementary", { name: "Travel concierge" }).getByRole("alert"),
  ).toContainText("currently unavailable");
  const stripe = await request.post("/api/payments/webhook", { data: "unverified" });
  expect(stripe.status()).toBe(503);
  const email = await request.post("/api/notifications/run");
  expect(email.status()).toBe(503);
});
test("booking component retains journey through quotes, invalidates edited quotes and confirms pending request only", async ({
  page,
}) => {
  await page.route("**/__booking-ui-test", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: '<div id="root"></div>' }),
  );
  await page.goto("/__booking-ui-test");
  await page.addScriptTag({ content: bundle });
  await page.getByLabel("Pickup location").selectOption("a0000000-0000-4000-8000-000000000001");
  await page.getByLabel("Drop-off location").selectOption("a0000000-0000-4000-8000-000000000002");
  await page.getByLabel("Pickup date (UAE)").fill("2099-01-01");
  await page.getByLabel("Pickup time (UAE)").fill("10:00");
  await page.getByRole("button", { name: "Calculate fare" }).click();
  await expect(page.getByRole("heading", { name: "Review your booking request" })).toBeVisible();
  await expect(page.getByLabel("Pickup date (UAE)")).toHaveValue("2099-01-01");
  await page.getByLabel(/Test extra/).check();
  await expect(page.getByRole("heading", { name: "Review your booking request" })).toHaveCount(0);
  await page.getByRole("button", { name: "Calculate fare" }).click();
  await expect(page.getByRole("heading", { name: "Review your booking request" })).toBeVisible();
  await page.getByLabel(/I agree to the terms/).check();
  await page.getByRole("button", { name: "Request booking", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Booking request received" })).toBeVisible();
  await expect(
    page.getByText("Your reservation is pending review", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "View TEST-ONLY · pending" })).toBeVisible();
});

test("idempotent booking receipts show the recorded confirmed status without claiming pending review", async ({
  page,
}) => {
  await page.route("**/__booking-status-test", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: '<div id="root"></div>' }),
  );
  await page.goto("/__booking-status-test");
  await page.evaluate(() => Object.assign(window, { testBookingStatus: "confirmed" }));
  await page.addScriptTag({ content: bundle });
  await page.getByLabel("Pickup location").selectOption("a0000000-0000-4000-8000-000000000001");
  await page.getByLabel("Drop-off location").selectOption("a0000000-0000-4000-8000-000000000002");
  await page.getByLabel("Pickup date (UAE)").fill("2099-01-01");
  await page.getByLabel("Pickup time (UAE)").fill("10:00");
  await page.getByRole("button", { name: "Calculate fare" }).click();
  await page.getByLabel(/I agree to the terms/).check();
  await page.getByRole("button", { name: "Request booking", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your saved booking" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View TEST-ONLY · confirmed" })).toBeVisible();
  await expect(page.getByText("Your reservation is pending review", { exact: false })).toHaveCount(
    0,
  );
});
