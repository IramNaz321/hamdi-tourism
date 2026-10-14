import { test, expect } from "@playwright/test";
// Real running application screens, intentionally credential-free to avoid hosted writes/provider usage.
test("capture genuine fleet, booking, unavailable tracking and concierge screens", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Luxury in Every Journey" }),
  ).toBeVisible();
  await page.locator("#fleet").screenshot({ path: `docs/previews/${info.project.name}-fleet.png` });
  await page.goto("/fleet");
  await page.screenshot({ path: `docs/previews/${info.project.name}-gallery.png`, fullPage: true });
  await page.goto("/book");
  await expect(
    page.getByRole("heading", { name: "Online booking is currently unavailable" }),
  ).toBeVisible();
  await page.screenshot({ path: `docs/previews/${info.project.name}-booking.png`, fullPage: true });
  await page.goto("/login");
  await page.screenshot({ path: `docs/previews/${info.project.name}-login.png`, fullPage: true });
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await page.screenshot({
    path: `docs/previews/${info.project.name}-admin-access.png`,
    fullPage: true,
  });
  await page.goto("/track/a0000000-0000-4000-8000-000000000001");
  await expect(page.getByRole("heading", { name: "Tracking unavailable" })).toBeVisible();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-tracking.png`,
    fullPage: true,
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  await page.getByLabel("Your question").fill("Can I arrange an airport transfer?");
  await page.getByRole("button", { name: "Ask concierge" }).click();
  await expect(
    page.getByRole("complementary", { name: "Travel concierge" }).getByRole("alert"),
  ).toContainText("currently unavailable");
  await page.screenshot({ path: `docs/previews/${info.project.name}-concierge.png` });
});
