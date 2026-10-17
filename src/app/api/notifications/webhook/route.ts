import { readLimitedBody } from "@/lib/bounded-body";
import { NextResponse } from "next/server";
import { verifyNotificationEvent } from "@/lib/notification-adapter";
import { createServiceClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!process.env.RESEND_WEBHOOK_SECRET)
    return NextResponse.json({ error: "Provider unavailable" }, { status: 503 });
  let event;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 131072) throw new Error("Size");
    const body = await readLimitedBody(request, 131072);
    if (body.length > 131072) throw new Error("Size");
    event = verifyNotificationEvent(
      body,
      {
        "svix-id": request.headers.get("svix-id") ?? "",
        "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
        "svix-signature": request.headers.get("svix-signature") ?? "",
      },
      process.env.RESEND_WEBHOOK_SECRET,
    );
    if (!event.data?.email_id) throw new Error("Event");
  } catch {
    return NextResponse.json({ error: "Invalid provider signature" }, { status: 400 });
  }
  try {
    const { data, error } = await createServiceClient().rpc("notification_delivered", {
      provider_message: event.data.email_id,
      event_type: event.type,
    });
    if (error || data !== true) throw new Error("Store");
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Delivery evidence unavailable; retry required" },
      { status: 503 },
    );
  }
}
