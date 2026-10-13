import { Webhook } from "svix";
export function verifyNotificationEvent(
  body: string,
  headers: Record<string, string>,
  secret: string,
) {
  new Webhook(secret).verify(body, headers);
  return JSON.parse(body) as { type: string; data: { email_id: string } };
}
export const notificationSubject = (kind: string) => `Hamdi Tourism · ${kind.replaceAll("_", " ")}`;
export const notificationText = (
  kind: string,
  reference: string,
  origin: string,
  bookingId: string,
) =>
  `${reference}: ${kind.replaceAll("_", " ")}.\nView your verified booking status and policies: ${origin}/passenger/bookings/${bookingId}\nThis notice does not approve a refund or payment. Only your booking page and verified provider records establish the current status.`;
