import { test, expect } from "@playwright/test";
test("public website renders the required sections without fictional fleet or fares", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your Journey, Our Priority" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our Fleet", exact: true })).toHaveCount(0);
  const contrast = await page
    .getByRole("link", { name: "Explore Our Fleet", exact: true })
    .evaluate((node) => {
      const style = getComputedStyle(node);
      const luminance = (color: string) => {
        const values = (color.match(/[\d.]+/g) ?? [])
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
          });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      const text = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("link", { name: "Book Your Transfer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Plan your transfer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Get a route quote" })).toBeDisabled();
  await expect(page.locator('select[name="pickup_id"] option')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  if (originalViewport) await page.setViewportSize(originalViewport);
  await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true });
});
test("transfer enquiry supports return dates and validates required input", async ({ page }) => {
  await page.goto("/#transfers");
  await expect(page.getByLabel("Return pickup (UAE)")).toHaveCount(0);
  await page.getByLabel("Transfer type").selectOption("return");
  await expect(page.getByLabel("Return pickup (UAE)")).toBeVisible();
  await page.getByLabel("Passengers", { exact: true }).fill("0");
  expect(
    await page
      .getByLabel("Passengers", { exact: true })
      .evaluate((input: HTMLInputElement) => input.validity.rangeUnderflow),
  ).toBe(true);
  await page.getByLabel("Transfer type").selectOption("one_way");
  await expect(page.getByLabel("Return pickup (UAE)")).toHaveCount(0);
});
test("responsive navigation works with keyboard and mobile menu", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Our Fleet" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } else {
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Our Fleet" }),
    ).toBeVisible();
  }
});
test("login makes missing credentials explicit and password visibility is accessible", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByText("Admin access is not available yet.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in securely" })).toBeDisabled();
  const password = page.locator('input[name="password"]');
  await password.fill("test-only-not-a-business-password");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeDisabled();
});
test("all expanded management routes protect anonymous access", async ({ page }) => {
  for (const path of [
    "/admin",
    "/admin/bookings",
    "/admin/staff",
    "/admin/settings",
    "/admin/operations",
    "/admin/reports",
    "/admin/enquiries",
    "/admin/vehicles/new",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  }
});
test("expired invite and recovery redirects stay on the current origin", async ({ page }) => {
  for (const type of ["invite", "recovery"]) {
    await page.goto(`/auth/confirm?token_hash=invalid&type=${type}&next=https://example.test`);
    await expect(page).toHaveURL(/\/login\?notice=invalid-link/);
    await expect(
      page.getByRole("alert").filter({ hasText: "This link is invalid or has expired" }),
    ).toBeVisible();
    expect(new URL(page.url()).origin).toBe("http://127.0.0.1:3000");
  }
});
test("public security headers and discovery restrictions are present", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
});
