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

test("offline AI fixture: session history, loading and English/Arabic/Urdu rendering remain bounded and plain text", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "languages", { get: () => ["ur-PK", "en-US"] }),
  );
  const questions: Record<string, unknown>[] = [];
  let release: (() => void) | undefined;
  await page.route("**/api/concierge", async (route) => {
    const body = route.request().postDataJSON();
    questions.push(body);
    if (questions.length === 1)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route.fulfill({
      json: {
        answer:
          body.language === "ar"
            ? "راجع صفحة الحجز لمعرفة الخيارات المنشورة."
            : body.language === "ur"
              ? "دستیاب معلومات کے لیے بکنگ صفحہ دیکھیں۔"
              : "Review published options on the booking page.",
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("ur");
  const window = page.getByRole("region", { name: "Travel concierge" });
  await expect(window).toHaveAttribute("dir", "rtl");
  await page.getByLabel("Your question").fill("میں بکنگ کیسے کروں؟");
  await page.getByRole("button", { name: "Ask concierge", exact: true }).click();
  await expect(page.getByText("Checking published information…")).toBeVisible();
  await expect.poll(() => questions.length).toBe(1);
  release!();
  await expect(page.getByRole("log")).toContainText("دستیاب معلومات");
  for (const language of ["ar", "en"]) {
    await page.getByLabel("Language", { exact: true }).selectOption(language);
    await expect(window).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
    await page.getByLabel("Your question").fill(language === "ar" ? "كيف أحجز؟" : "How do I book?");
    await page.getByRole("button", { name: "Ask concierge", exact: true }).click();
    await expect(page.getByLabel("Your question")).toHaveValue("");
  }
  expect(questions[2].history).toHaveLength(4);
  await page.getByRole("button", { name: "Close travel concierge" }).click();
  await expect(page.getByRole("button", { name: "Travel concierge", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("How do I book?");
  await page.keyboard.press("Escape");
  await expect(window).toHaveCount(0);
});

test("offline speech fixture: playback requires explicit unmute and click, Stop and close cancel it", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { speaks: 0, cancels: 0, text: "", lang: "" };
    Object.assign(window, {
      testPlayback: state,
      SpeechSynthesisUtterance: class {
        constructor(public text: string) {}
        lang = "";
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ lang: "en-US", localService: true }],
        cancel: () => state.cancels++,
        speak: (utterance: { text: string; lang: string }) => {
          state.speaks++;
          state.text = utterance.text;
          state.lang = utterance.lang;
        },
      },
    });
  });
  await page.route("**/api/concierge", (route) =>
    route.fulfill({ json: { answer: "Please review the booking page." } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByLabel("Your question").fill("How do I book?");
  await page.getByRole("button", { name: "Ask concierge", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("Please review the booking page.");
  await expect(page.getByRole("button", { name: "Read answer aloud" })).toBeDisabled();
  const state = () =>
    page.evaluate(
      () =>
        (window as unknown as { testPlayback: { speaks: number; cancels: number; lang: string } })
          .testPlayback,
    );
  expect((await state()).speaks).toBe(0);
  await page.getByRole("button", { name: "Unmute voice replies" }).click();
  expect((await state()).speaks).toBe(0);
  await page.getByRole("button", { name: "Read answer aloud" }).click();
  expect((await state()).speaks).toBe(1);
  expect((await state()).lang).toBe("en-AE");
  const before = (await state()).cancels;
  await page.getByRole("button", { name: "Stop voice", exact: true }).click();
  expect((await state()).cancels).toBeGreaterThan(before);
  await page.getByRole("button", { name: "Mute voice replies", exact: true }).click();
  await expect(page.getByRole("button", { name: "Read answer aloud" })).toBeDisabled();
  const closes = (await state()).cancels;
  await page.getByRole("button", { name: "Close travel concierge" }).click();
  expect((await state()).cancels).toBeGreaterThan(closes);
});

test("unsupported speech, provider setup and HTTP errors preserve usable text and contact fallbacks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
    });
  });
  let status = 503;
  await page.route("**/api/concierge", (route) =>
    route.fulfill({
      status,
      json: {
        code: status === 503 ? "configuration_required" : undefined,
        error: "private provider detail",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  await page.getByRole("button", { name: "Use microphone" }).click();
  await expect(
    page.getByText("Voice input is unavailable in this browser. Please type your question."),
  ).toBeVisible();
  await page.getByLabel("Your question").fill("Airport transfer?");
  await page.getByRole("button", { name: "Ask concierge", exact: true }).click();
  const concierge = page.getByRole("complementary", { name: "Travel concierge" });
  await expect(concierge.getByRole("alert")).toContainText("has not been enabled");
  await expect(concierge).not.toContainText("private provider detail");
  await expect(concierge.getByRole("link", { name: "Contact our team" })).toBeVisible();
  status = 429;
  await page.getByRole("button", { name: "Ask concierge", exact: true }).click();
  await expect(concierge.getByRole("alert")).toContainText("limit reached");
  await expect(page.getByLabel("Your question")).toHaveValue("Airport transfer?");
});

test("stopping speech rejects late transcripts and closing cancels an in-flight chat request", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, {
      SpeechRecognition: class {
        onresult: ((event: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          Object.assign(window, { lateTranscript: this.onresult });
        }
        abort() {}
      },
    });
  });
  let reached = false;
  let release: (() => void) | undefined;
  await page.route("**/api/concierge", async (route) => {
    reached = true;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await route.fulfill({ json: { answer: "late response must not appear" } });
    } catch {
      /* Browser cancellation is expected. */
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  await page.getByRole("button", { name: "Use microphone" }).click();
  await page.getByRole("button", { name: "Stop voice", exact: true }).click();
  await page.evaluate(() => {
    (window as unknown as { lateTranscript: (event: unknown) => void }).lateTranscript({
      results: [[{ transcript: "late microphone result" }]],
    });
  });
  await expect(page.getByLabel("Your question")).toHaveValue("");
  await page.getByLabel("Your question").fill("How do I book?");
  await page.getByRole("button", { name: "Ask concierge", exact: true }).click();
  await expect.poll(() => reached).toBe(true);
  const aborted = page.waitForEvent("requestfailed", {
    predicate: (request) => request.url().includes("/api/concierge"),
  });
  await page.getByRole("button", { name: "Close travel concierge" }).click();
  await aborted;
  release!();
  await page.getByRole("button", { name: "Travel concierge", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Travel concierge" }).getByRole("alert"),
  ).toContainText("Response stopped");
  await expect(page.getByRole("log")).not.toContainText("late response must not appear");
});
