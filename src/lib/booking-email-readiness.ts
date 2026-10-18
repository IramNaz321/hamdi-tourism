import { z } from "zod";
import { ownerBookingNotificationRecipient } from "./notification-adapter";

/** Offline preparation only: no provider calls, credentials or database records in output. */
export function bookingEmailReadiness(env: Record<string, string | undefined>) {
  const present = (key: string) => !!env[key]?.trim();
  const sender = env.BREVO_SENDER_EMAIL?.trim();
  const checks = {
    apiKeyPresent: present("BREVO_API_KEY"),
    senderEmailValid: z.email().safeParse(sender).success,
    senderMatchesClientApprovedAddress: sender?.toLowerCase() === "irumnaaz2020@gmail.com",
    workerSecretStrong: (env.NOTIFICATION_WORKER_SECRET?.length ?? 0) >= 32,
    deliveryDisabled: env.NOTIFICATION_EMAIL_ENABLED !== "true",
  };
  return {
    status: Object.values(checks).every(Boolean) ? "PREPARED_NOT_LIVE_VERIFIED" : "BLOCKED",
    checks,
    testEmailDraft: {
      to: [ownerBookingNotificationRecipient],
      subject: "TEST — HAMDI TOURISM Booking Notification",
      text: "This is a system test, NOT a real booking.",
    },
    emailsSent: false,
    databaseWrites: false,
    enablementChanged: false,
    senderVerification: "client-reported; not independently verified by this offline check",
    productionMigrations: "010 then 012 require separate approval and verified recovery",
    deliveryVerified: false,
    sendingRequiresSeparateExplicitApproval: true,
  };
}
