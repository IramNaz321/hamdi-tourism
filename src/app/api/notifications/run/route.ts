import { NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/auth";
import {
  notificationSubject,
  notificationText,
  ownerBookingNotificationRecipient,
  ownerBookingNotificationSubject,
  ownerBookingNotificationText,
  parseOwnerBookingNotification,
  parsePassengerNotificationBatch,
} from "@/lib/notification-adapter";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  const brevoConfigured =
    !!process.env.BREVO_API_KEY?.trim() &&
    z.email().safeParse(process.env.BREVO_SENDER_EMAIL?.trim()).success;
  const passengerConfigured = !!process.env.RESEND_API_KEY && !!process.env.NOTIFICATION_FROM;
  if (
    process.env.NOTIFICATION_EMAIL_ENABLED !== "true" ||
    (!brevoConfigured && !passengerConfigured) ||
    (process.env.NOTIFICATION_WORKER_SECRET?.length ?? 0) < 32
  )
    return NextResponse.json({ error: "Email delivery disabled" }, { status: 503 });
  const expected = Buffer.from(`Bearer ${process.env.NOTIFICATION_WORKER_SECRET}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  try {
    const origin = siteOrigin();
    const service = createServiceClient();
    // Existing passenger transactional mail remains on its configured adapter.
    // Never claim its outbox when that adapter is not configured.
    const { data, error } = passengerConfigured
      ? await service.rpc("notification_claim")
      : { data: [], error: null };
    if (error) throw new Error("Claim");
    let accepted = 0,
      processed = 0;
    for (const row of parsePassengerNotificationBatch(data ?? [])) {
      processed++;
      let providerId: string | null = null;
      let ok = false;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `hamdi-notice:${row.id}`,
          },
          body: JSON.stringify({
            from: process.env.NOTIFICATION_FROM,
            to: [row.email],
            subject: notificationSubject(row.kind),
            text: notificationText(row.kind, row.reference, origin, row.booking_id),
          }),
          signal: AbortSignal.timeout(10000),
        });
        const result = await response.json();
        providerId =
          response.ok && typeof result.id === "string" && result.id.length <= 200
            ? result.id
            : null;
        ok = response.ok && !!providerId;
      } catch {
        ok = false;
      }
      const { error: saveError } = await service.rpc("notification_result", {
        notification: row.id,
        provider_message: providerId,
        was_accepted: ok,
        lease: row.lease,
      });
      if (saveError) throw new Error("Result");
      if (ok) accepted++;
    }
    const { data: ownerData, error: ownerError } = brevoConfigured
      ? await service.rpc("owner_notification_claim")
      : { data: [], error: null };
    if (ownerError) throw new Error("Owner claim");
    const ownerRows = (ownerData ?? []).map(parseOwnerBookingNotification);
    for (const row of ownerRows) {
      processed++;
      let providerId: string | null = null;
      let ok = false;
      try {
        // Brevo deduplicates for 15 minutes. Refuse any send outside the
        // persisted, shorter window (including lease recovery after a crash).
        const age = Date.now() - Date.parse(row.first_attempt_at);
        if (age < -5000 || age >= 10 * 60 * 1000) throw new Error("Retry window expired");
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": process.env.BREVO_API_KEY!,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sender: { name: "HAMDI TOURISM", email: process.env.BREVO_SENDER_EMAIL!.trim() },
            to: [{ email: ownerBookingNotificationRecipient }],
            subject: ownerBookingNotificationSubject(row.reference),
            textContent: ownerBookingNotificationText(row),
            headers: { IdempotencyKey: `hamdi-owner-booking:${row.id}` },
          }),
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        });
        const result = await response.json();
        providerId =
          response.ok &&
          typeof result.messageId === "string" &&
          result.messageId.trim().length > 0 &&
          result.messageId.length <= 200
            ? result.messageId
            : null;
        ok = response.ok && !!providerId;
      } catch {
        ok = false;
      }
      const { error: saveError } = await service.rpc("owner_notification_result", {
        notification: row.booking_id,
        provider_message: providerId,
        was_accepted: ok,
        lease: row.lease,
      });
      if (saveError) throw new Error("Owner result");
      if (ok) accepted++;
    }
    return NextResponse.json({ processed, accepted });
  } catch {
    return NextResponse.json(
      { error: "Notification processing unavailable; retry required" },
      { status: 503 },
    );
  }
}
