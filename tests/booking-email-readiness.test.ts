import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingEmailReadiness } from "../src/lib/booking-email-readiness";
test("booking email draft is harmless, single-recipient and requires approval", () => {
  const result = bookingEmailReadiness({});
  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.testEmailDraft.to, ["Hamid.shah@mail.ru"]);
  assert.equal(result.testEmailDraft.subject, "TEST — Not a Real Booking");
  assert.equal(result.emailsSent, false);
  assert.equal(result.databaseWrites, false);
  assert.equal(result.sendingRequiresSeparateExplicitApproval, true);
});
test("email preparation never exposes secrets or treats setup as delivery acceptance", () => {
  const env = {
    BREVO_API_KEY: "private-provider-canary",
    BREVO_SENDER_EMAIL: "irumnaaz2020@gmail.com",
    NOTIFICATION_WORKER_SECRET: "private-worker-canary-at-least-32-characters",
    NOTIFICATION_EMAIL_ENABLED: "false",
  };
  const result = bookingEmailReadiness(env);
  assert.equal(result.status, "PREPARED_NOT_LIVE_VERIFIED");
  assert.equal(result.deliveryVerified, false);
  assert.ok(!JSON.stringify(result).includes(env.BREVO_API_KEY));
  assert.ok(!JSON.stringify(result).includes(env.NOTIFICATION_WORKER_SECRET));
  assert.equal(
    bookingEmailReadiness({ ...env, NOTIFICATION_EMAIL_ENABLED: "true" }).status,
    "BLOCKED",
  );
  assert.equal(
    bookingEmailReadiness({ ...env, BREVO_SENDER_EMAIL: "someone@example.test" }).status,
    "BLOCKED",
  );
});
