import { test, expect } from "@playwright/test";

test("homepage car showcase is static and does not move the page on desktop or mobile", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const image = page.locator(".cinematic-backdrop img");
    await expect(image).toBeVisible();
    const initial = await image.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        animation: getComputedStyle(node).animationName,
        animations: node.getAnimations().length,
        scrollY,
      };
    });
    expect(initial.animation).toBe("none");
    expect(initial.animations).toBe(0);
    await page.waitForTimeout(1200);
    const after = await image.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, scrollY };
    });
    expect(after).toEqual({
      x: initial.x,
      y: initial.y,
      width: initial.width,
      height: initial.height,
      scrollY: initial.scrollY,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(
      page.locator(".cinematic-engine, .cinematic-car-hotspot, .car-controls"),
    ).toHaveCount(0);
  }
});

test("homepage remains static with reduced motion enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const image = page.locator(".cinematic-backdrop img");
  await expect(image).toBeVisible();
  expect(await image.evaluate((node) => node.getAnimations().length)).toBe(0);
  await expect(page.locator(".cinematic-engine")).toHaveCount(0);
});
