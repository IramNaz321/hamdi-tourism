import { test } from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage } from "../src/lib/auth-errors";
test("login errors distinguish password, email confirmation, rate and transport without raw provider detail", () => {
  assert.match(authErrorMessage({ code: "invalid_credentials" }), /Forgot your password/);
  assert.match(authErrorMessage({ code: "email_not_confirmed" }), /Confirm your email/);
  assert.match(authErrorMessage({ status: 429 }), /Too many attempts/);
  assert.match(authErrorMessage({ status: 401 }), /could not be verified/);
  assert.match(authErrorMessage({ status: 503 }), /temporarily unavailable/);
  assert.equal(
    authErrorMessage({ code: "private-secret-provider-detail" }).includes("private-secret"),
    false,
  );
});
