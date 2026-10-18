import { NextResponse } from "next/server";
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
  if (
    process.env.NOTIFICATION_EMAIL_ENABLED !== "true" ||
    !process.env.RESEND_API_KEY ||
    !process.env.NOTIFICATION_FROM ||
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
    const { data, error } = await service.rpc("notification_claim");
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
    const { data: ownerData, error: ownerError } = await service.rpc("owner_notification_claim");
    if (ownerError) throw new Error("Owner claim");
    const ownerRows = (ownerData ?? []).map(parseOwnerBookingNotification);
    for (const row of ownerRows) {
      processed++;
      let providerId: string | null = null;
      let ok = false;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `hamdi-owner-booking:${row.id}`,
          },
          body: JSON.stringify({
            from: process.env.NOTIFICATION_FROM,
            to: [ownerBookingNotificationRecipient],
            subject: ownerBookingNotificationSubject(row.reference),
            text: ownerBookingNotificationText(row),
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
