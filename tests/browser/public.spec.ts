import { test, expect } from "@playwright/test";
test("public services and contact render without fictional business data", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A smooth arrival. A better journey." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Airport transfers", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Plan your journey" }).click();
  await expect(page.getByRole("heading", { name: "Where can we take you?" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true });
});
test("unconfigured login is explicit and does not submit credentials", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByText("Admin access is not available yet.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in securely" })).toBeDisabled();
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeDisabled();
});
test("anonymous admin access redirects before exposing business data", async ({ page }) => {
  for (const path of ["/admin", "/admin/bookings", "/admin/staff", "/admin/vehicles/new"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  }
});
test("invalid invitation and recovery links show a safe error", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=invalid&type=invite&next=https://example.test");
  await expect(page).toHaveURL(/\/login\?notice=invalid-link/);
  await expect(
    page.getByRole("alert").filter({ hasText: "This link is invalid or has expired" }),
  ).toBeVisible();
  expect(new URL(page.url()).origin).toBe("http://127.0.0.1:3000");
});
test("public responses include security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});
