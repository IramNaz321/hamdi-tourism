import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import type { LocationSharing } from "../../src/lib/location-sharing";
let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ["src/lib/location-sharing.ts"],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "DriverGPS",
    platform: "browser",
  });
  bundle = result.outputFiles[0].text;
});
async function harness(page: import("@playwright/test").Page, allow: boolean) {
  await page.route("**/__gps-test", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      headers: { "Permissions-Policy": `geolocation=${allow ? "(self)" : "()"}` },
      body: '<button id="share">Start sharing with consent</button><button id="stop">Stop sharing</button><p id="status">Not sharing</p>',
    }),
  );
  await page.goto("/__gps-test");
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const fixes: unknown[] = [];
    Object.assign(window, { testFixes: fixes });
    const Api = (window as unknown as { DriverGPS: { LocationSharing: typeof LocationSharing } })
      .DriverGPS;
    const controller = new Api.LocationSharing({
      geolocation: navigator.geolocation,
      send: async (fix) => {
        fixes.push(fix);
        return {};
      },
      revoke: async () => {},
      report: (message) => {
        document.querySelector("#status")!.textContent = message;
      },
    });
    document.querySelector("#share")!.addEventListener("click", () => controller.start());
    document.querySelector("#stop")!.addEventListener("click", () => controller.stop());
  });
}
test("browser GPS controller uses explicit consent and stops an emulated device watcher", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 25, longitude: 55, accuracy: 20 });
  await harness(page, true);
  expect(
    await page.evaluate(() => (window as unknown as { testFixes: unknown[] }).testFixes.length),
  ).toBe(0);
  await page.locator("#share").click();
  await expect(page.locator("#status")).toHaveText("Sharing your current GPS location.");
  expect(
    await page.evaluate(() => (window as unknown as { testFixes: unknown[] }).testFixes.length),
  ).toBe(1);
  await page.locator("#stop").click();
  await expect(page.locator("#status")).toHaveText("Location sharing stopped.");
  await context.setGeolocation({ latitude: 26, longitude: 56, accuracy: 20 });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => (window as unknown as { testFixes: unknown[] }).testFixes.length),
  ).toBe(1);
});
test("browser permission denial never produces or sends a GPS fix", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 25, longitude: 55 });
  await harness(page, false);
  await page.locator("#share").click();
  await expect(page.locator("#status")).toContainText("Location permission denied");
  expect(
    await page.evaluate(() => (window as unknown as { testFixes: unknown[] }).testFixes.length),
  ).toBe(0);
});
test("driver-only geolocation header and unavailable passenger tracking preserve privacy", async ({
  request,
  page,
}) => {
  const driver = await request.get("/driver-account", { maxRedirects: 0 });
  expect(driver.headers()["permissions-policy"]).toContain("geolocation=(self)");
  const home = await request.get("/");
  expect(home.headers()["permissions-policy"]).toContain("geolocation=()");
  expect(home.headers()["permissions-policy"]).toContain("microphone=(self)");
  expect(home.headers()["permissions-policy"]).toContain("camera=()");
  await page.goto("/track/10000000-0000-4000-8000-000000000001");
  await expect(
    page.getByRole("heading", { name: "Tracking unavailable", exact: true }),
  ).toBeVisible();
  const response = await request.get("/track/10000000-0000-4000-8000-000000000001");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
});
