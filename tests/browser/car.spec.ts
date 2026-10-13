import { test, expect } from "@playwright/test";

test("car rev is user-triggered, mute persists, and sound stops immediately", async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const audio: AudioContext[] = [];
    Object.assign(window, { __carAudio: audio });
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        audio.push(this);
      }
    };
  });
  await page.goto("/");
  const mute = page.getByRole("button", { name: "Mute engine sound" });
  await expect(mute).toHaveAttribute("aria-pressed", "false");
  expect(
    await page.evaluate(
      () => (window as unknown as { __carAudio: AudioContext[] }).__carAudio.length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Rev the car engine", exact: true }).click();
  await expect(page.locator('[data-car-revving="true"]')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __carAudio: AudioContext[] }).__carAudio[0]?.state,
      ),
    )
    .toBe("running");
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __carAudio: AudioContext[] }).__carAudio[0]?.state,
      ),
    )
    .toBe("closed");
  await page.getByRole("button", { name: "Rev engine", exact: true }).click();
  await expect(page.locator('[data-car-revving="true"]')).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __carAudio: AudioContext[] }).__carAudio.length,
    ),
  ).toBe(1);
  await page.reload();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
});

test("car controls work by keyboard and respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Mute engine sound" }).click();
  const car = page.getByRole("button", { name: "Rev the car engine", exact: true });
  await car.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-car-revving="true"]')).toBeVisible();
  expect(await car.evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await expect(page.locator('[data-car-revving="false"]')).toBeVisible();
});
