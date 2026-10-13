import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/auth";
import { notificationSubject, notificationText } from "@/lib/notification-adapter";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (
    process.env.NOTIFICATION_EMAIL_ENABLED !== "true" ||
    !process.env.RESEND_API_KEY ||
    !process.env.NOTIFICATION_FROM ||
    !process.env.NOTIFICATION_WORKER_SECRET
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
    let accepted = 0;
    for (const row of data ?? []) {
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
        providerId = result.id ?? null;
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
    return NextResponse.json({ processed: data?.length ?? 0, accepted });
  } catch {
    return NextResponse.json(
      { error: "Notification processing unavailable; retry required" },
      { status: 503 },
    );
  }
}
