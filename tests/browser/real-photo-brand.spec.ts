import { test, expect } from "@playwright/test";
test("no illustrated hero car remains and the two-line gold wordmark is centered", async ({
  page,
}) => {
  for (const path of ["/", "/login"]) {
    await page.goto(path);
    const brand = page.locator(".brand").first();
    await expect(brand).toContainText("HAMDI");
    await expect(brand.locator("span")).toHaveText("TOURISM");
    const geometry = await brand.evaluate((node) => {
      const parent = node.getBoundingClientRect();
      const child = node.querySelector("span")!.getBoundingClientRect();
      return Math.abs(parent.x + parent.width / 2 - child.x - child.width / 2);
    });
    expect(geometry).toBeLessThan(1);
    await expect(brand.locator("span")).toHaveCSS("color", "rgb(197, 164, 109)");
  }
  await page.goto("/");
  await expect(page.locator(".car-stage > svg")).toHaveCount(0);
  await expect(
    page.getByText("Approved real vehicle photography is currently unavailable."),
  ).toBeVisible();
});
