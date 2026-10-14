import { test, expect } from "@playwright/test";
test("cinematic showcase is labelled decorative, track navigation works and language changes hero", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Luxury in Every Journey" }),
  ).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Journey visual preview" })).toContainText(
    "No active trip shown",
  );
  await expect(page.getByText("45 min / 32 km")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Watch Video" })).toHaveCount(0);
  await page.getByRole("link", { name: "Discover our service" }).click();
  await expect(page).toHaveURL(/#services$/);
  await page.goto("/track");
  await expect(page.getByRole("heading", { name: "Track Your Ride" })).toBeVisible();
  await page.getByLabel("Booking tracking ID").fill("invalid");
  await page.getByRole("button", { name: "Open protected tracking" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("valid tracking ID");
  await page.goto("/");
  await page.getByLabel("Website language").selectOption("ar");
  await expect(page.getByRole("heading", { name: "رحلتك، بتواصل رائع" })).toBeVisible();
  await expect(page.locator(".cinematic-copy")).toHaveAttribute("dir", "rtl");
});
test("routing endpoint never provides sample ETA or coordinates without configured authorized tracking", async ({
  request,
}) => {
  const response = await request.post("/api/tracking/route", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: { tripId: "a0000000-0000-4000-8000-000000000001" },
  });
  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({
    error: "ETA unavailable. Road routing is not configured.",
  });
  const crossOrigin = await request.post("/api/tracking/route", {
    headers: { Origin: "https://untrusted.invalid" },
    data: { tripId: "a0000000-0000-4000-8000-000000000001" },
  });
  expect(crossOrigin.status()).toBe(403);
  expect(await crossOrigin.json()).toEqual({ error: "ETA unavailable" });
});
