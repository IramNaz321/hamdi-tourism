import { test, expect } from "@playwright/test";
test("four approved service categories appear in homepage, enquiry and booking without inventing fleet", async ({
  page,
}) => {
  await page.goto("/");
  const categories = page.getByRole("region", { name: "Vehicle categories" });
  await expect(categories.getByRole("heading")).toHaveCount(4);
  for (const name of ["Normal Sedan", "Luxury Sedan", "7-Seater", "5-Passenger Vehicle"])
    await expect(categories.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator('select[name="category"] option')).toHaveCount(4);
  await page.goto("/book");
  await expect(
    page.getByRole("region", { name: "Vehicle categories" }).getByRole("heading"),
  ).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "Online booking is currently unavailable" }),
  ).toBeVisible();
});
test("microphone requires a click, transcripts need review, mute defaults on and closing stops capture", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { starts: 0, stops: 0 };
    Object.assign(window, {
      testSpeech: state,
      SpeechRecognition: class {
        lang = "";
        continuous = false;
        interimResults = false;
        onresult: ((event: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          state.starts++;
          this.onresult?.({ results: [[{ transcript: "Can I book an airport transfer?" }]] });
        }
        abort() {
          state.stops++;
          this.onend?.();
        }
      },
    });
  });
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/concierge")) requests++;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { testSpeech: { starts: number } }).testSpeech.starts,
    ),
  ).toBe(0);
  await expect(page.getByRole("button", { name: "Unmute voice replies" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Use microphone" }).click();
  await expect(page.getByLabel("Your question")).toHaveValue("Can I book an airport transfer?");
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Close travel concierge" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { testSpeech: { stops: number } }).testSpeech.stops,
    ),
  ).toBeGreaterThan(0);
});
test("microphone denial is explicit and does not send questions", async ({ page }) => {
  await page.addInitScript(() =>
    Object.assign(window, {
      SpeechRecognition: class {
        onerror: ((event: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          this.onerror?.({ error: "not-allowed" });
          this.onend?.();
        }
        abort() {
          this.onend?.();
        }
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  await page.getByRole("button", { name: "Use microphone" }).click();
  await expect(
    page.getByText("Microphone permission was denied. Please type your question."),
  ).toBeVisible();
  await expect(page.getByLabel("Your question")).toHaveValue("");
});
