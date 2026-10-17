import { test, expect } from "@playwright/test";
import { build } from "esbuild";

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
  expect(
    await page.locator(".cinematic-backdrop img").evaluate((node) => node.getAnimations().length),
  ).toBe(0);
  await expect(page.locator('[data-car-revving="false"]')).toBeVisible();
});

test("existing flat scene accelerates, returns exactly, replays and never moves booking controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mute engine sound" }).click();
  const car = page.getByRole("button", { name: "Rev the car engine", exact: true });
  const photo = page.locator(".cinematic-backdrop img");
  const original = await photo.getAttribute("src");
  const booking = page.getByRole("link", { name: "Book Your Transfer", exact: true });
  const position = () =>
    booking.evaluate((node) => {
      const b = node.getBoundingClientRect();
      return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height };
    });
  const bounds = await position();
  await car.click();
  await expect(page.locator('[data-car-motion="flat-scene"]')).toHaveAttribute(
    "data-car-revving",
    "true",
  );
  const positions = await photo.evaluate((node) => {
    const animation = node.getAnimations()[0];
    if (!animation) throw Error("Expected active scene animation");
    animation.pause();
    animation.currentTime = 960;
    const early = new DOMMatrix(getComputedStyle(node).transform).m41;
    animation.currentTime = 2240;
    const fast = new DOMMatrix(getComputedStyle(node).transform).m41;
    animation.currentTime = 3200;
    const end = new DOMMatrix(getComputedStyle(node).transform);
    return {
      early,
      fast,
      endsAtOrigin:
        Math.abs(end.m41) < 0.01 && Math.abs(end.m42) < 0.01 && Math.abs(end.m11 - 1) < 0.001,
      duration: animation.effect?.getComputedTiming().duration,
    };
  });
  expect(Math.abs(positions.fast)).toBeGreaterThan(Math.abs(positions.early) * 3);
  expect(positions.endsAtOrigin).toBe(true);
  expect(positions.duration).toBe(3200);
  expect(await position()).toEqual(bounds);
  await expect(page.locator('[data-car-revving="false"]')).toBeVisible();
  await car.click();
  await expect(page.locator('[data-car-revving="true"]')).toBeVisible();
  await expect(photo).toHaveAttribute("src", original!);
  await expect(booking).toHaveAttribute("href", "/book");
  await car.click();
  expect(await photo.evaluate((node) => node.getAnimations().length)).toBe(1);
});

test("unsupported audio keeps the cinematic effect and mute usable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { AudioContext: undefined, webkitAudioContext: undefined });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Rev engine", exact: true }).click();
  await expect(page.locator('[data-car-revving="true"]')).toBeVisible();
  await expect(page.locator(".car-controls")).toContainText("Sound is unavailable in this browser");
  await page.getByRole("button", { name: "Mute engine sound" }).click();
  await expect(page.locator('[data-car-revving="true"]')).toBeVisible();
});

test("native Web Audio renders audible startup and rising rev without clipping or a lingering loop", async ({
  page,
}) => {
  const bundle = await build({
    stdin: {
      contents: `import {playEngineStartup} from './src/lib/car-engine-audio';window.renderEngine=async()=>{const audio=new OfflineAudioContext(1,48000*3.1,48000);playEngineStartup(audio);const data=(await audio.startRendering()).getChannelData(0);function rms(a,b){let sum=0;const begin=Math.floor(a*48000),end=Math.floor(b*48000);for(let i=begin;i<end;i++)sum+=data[i]*data[i];return Math.sqrt(sum/(end-begin));}let peak=0;for(const sample of data)peak=Math.max(peak,Math.abs(sample));return {crank:rms(.05,.25),idle:rms(.55,.85),rev:rms(1.3,1.65),tail:rms(2.9,3.05),peak};};`,
      resolveDir: process.cwd(),
      loader: "js",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
  });
  await page.goto("/");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const sound = await page.evaluate(() =>
    (
      window as unknown as {
        renderEngine: () => Promise<{
          crank: number;
          idle: number;
          rev: number;
          tail: number;
          peak: number;
        }>;
      }
    ).renderEngine(),
  );
  expect(sound.crank).toBeGreaterThan(0.00001);
  expect(sound.rev).toBeGreaterThan(sound.idle * 1.2);
  expect(sound.peak).toBeGreaterThan(0.005);
  expect(sound.peak).toBeLessThan(0.75);
  expect(sound.tail).toBeLessThan(0.00001);
});
