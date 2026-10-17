import { test } from "node:test";
import assert from "node:assert/strict";
import { authCaptcha } from "../src/lib/auth-captcha";
test("configured Auth CAPTCHA requires a bounded token and passes it once to the provider", () => {
  const form = new FormData();
  assert.ok(authCaptcha(form, "public-site-key").error);
  form.set("captcha_token", "single-use-token");
  assert.deepEqual(authCaptcha(form, "public-site-key"), {
    options: { captchaToken: "single-use-token" },
  });
  form.set("captcha_token", "x".repeat(2049));
  assert.ok(authCaptcha(form, "public-site-key").error);
  form.delete("captcha_token");
  assert.deepEqual(authCaptcha(form, undefined), { options: undefined });
});

test("provider CAPTCHA failures request a fresh challenge without exposing provider detail", async () => {
  const { authErrorMessage } = await import("../src/lib/auth-errors");
  assert.match(authErrorMessage({ code: "captcha_failed", status: 400 }), /fresh check/);
});

test("permission diagnostics never log raw errors or untrusted provider codes", async () => {
  const { reportAccessFailure } = await import("../src/lib/access-diagnostics");
  const entries: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    entries.push(args);
  };
  try {
    reportAccessFailure("admin", { code: "42501", message: "private diagnostic payload" });
    reportAccessFailure("staff-login", {
      code: "untrusted / credential payload",
      details: "private payload",
    });
    assert.deepEqual(entries, [
      ["Account permission check failed", { stage: "admin", code: "42501" }],
      ["Account permission check failed", { stage: "staff-login", code: "unavailable" }],
    ]);
  } finally {
    console.error = original;
  }
});
