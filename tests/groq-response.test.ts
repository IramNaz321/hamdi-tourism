import { test } from "node:test";
import assert from "node:assert/strict";
import {
  conciergeSystem,
  extractGroqResponse,
  groqCompletionOptions,
  groqResponseMetadata,
} from "../src/lib/concierge";
const completion = (content: unknown, finish_reason = "stop", extra = {}) => ({
  choices: [{ finish_reason, message: { role: "assistant", content, ...extra } }],
});
test("GPT-OSS gets a bounded reasoning budget without returning internal reasoning", () => {
  assert.deepEqual(groqCompletionOptions("openai/gpt-oss-20b"), {
    max_completion_tokens: 2048,
    reasoning_effort: "low",
    include_reasoning: false,
  });
  assert.equal(groqCompletionOptions("openai/gpt-oss-120b").reasoning_effort, "low");
  assert.deepEqual(groqCompletionOptions("other-model"), { max_completion_tokens: 512 });
});
test("only complete visible answers are accepted across supported scripts", () => {
  for (const answer of [
    "Request a transfer on /book.",
    "بکنگ کی درخواست دیں۔",
    "اطلب النقل عبر صفحة الحجز.",
    "Transfer ke liye booking page kholein.",
  ]) {
    assert.equal(
      extractGroqResponse(completion(answer, "stop", { reasoning: "private internal reasoning" })),
      answer,
    );
  }
  for (const payload of [
    completion(null, "length"),
    completion("truncated", "length"),
    completion(""),
    completion("answer", "stop", { tool_calls: [] }),
  ]) {
    assert.throws(() => extractGroqResponse(payload));
  }
});
test("diagnostic metadata identifies exhausted reasoning budget without leaking content", () => {
  const payload = {
    ...completion(null, "length", { reasoning: "private-canary" }),
    usage: { completion_tokens: 80 },
  };
  assert.deepEqual(groqResponseMetadata(payload), {
    finishReason: "length",
    visibleContentPresent: false,
    completionTokens: 80,
  });
  assert.ok(!JSON.stringify(groqResponseMetadata(payload)).includes("private-canary"));
  assert.equal(
    groqResponseMetadata(completion("private-canary", "private-canary")).finishReason,
    "unknown",
  );
  assert.ok(conciergeSystem.includes("Roman Urdu"));
});
