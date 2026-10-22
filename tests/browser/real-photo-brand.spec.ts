import { test, expect } from "@playwright/test";
test("no illustrated hero car remains and the two-line gold wordmark is centered", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/login",
    "/passenger/login",
    "/passenger/register",
    "/fleet",
    "/book",
    "/track",
  ]) {
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
  const photo = page.getByRole("img", {
    name: "Original marketing visualization of a black luxury sedan on a Dubai highway at sunset, with Burj Khalifa in the background",
  });
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(
    0,
  );
  await expect(
    page.getByText("Approved real vehicle photography is currently unavailable."),
  ).toHaveCount(0);
});

test("four local showcase photos load without Supabase inventory and keep booking unavailable", async ({
  page,
}) => {
  await page.goto("/");
  const categories = page.getByRole("region", { name: "Vehicle categories" });
  await categories.scrollIntoViewIfNeeded();
  await expect(categories.getByRole("img")).toHaveCount(4);
  for (const photo of await categories.getByRole("img").all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() => photo.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(page.getByRole("button", { name: "Get a route quote" })).toBeDisabled();
  await expect(
    page.getByText("Online transfer enquiries are not set up yet", { exact: false }),
  ).toBeVisible();
  const notes = categories.locator("details");
  await expect(notes).not.toHaveAttribute("open");
  const disclosure = notes.locator("summary");
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(notes).toHaveAttribute("open", "");
  await expect(notes.getByText("Marketing examples only.", { exact: false })).toBeVisible();
  await expect(notes.getByRole("link", { name: "Usage & provenance" })).toHaveCount(4);
  await page.keyboard.press("Enter");
  await expect(notes).not.toHaveAttribute("open");
  await page.goto("/book");
  await expect(
    page.getByRole("heading", { name: "Online booking is currently unavailable" }),
  ).toBeVisible();
  await expect(page.locator('input[name="vehicle_id"]')).toHaveCount(0);
});

test("all three dashboards reject anonymous sessions without displaying operational records", async ({
  page,
}) => {
  for (const [path, login] of [
    ["/admin", "/login"],
    ["/driver-account", "/login"],
    ["/passenger", "/passenger/login"],
  ]) {
    await page.goto(path);
    expect(new URL(page.url()).pathname).toBe(login);
    await expect(
      page.getByRole("button", {
        name: login === "/login" ? "Sign in securely" : "Sign in",
        exact: true,
      }),
    ).toBeDisabled();
  }
});
