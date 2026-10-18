import { Webhook } from "svix";
import { z } from "zod";

const ownerBookingNotificationSchema = z
  .object({
    id: z.uuid(),
    booking_id: z.uuid(),
    lease: z.uuid(),
    reference: z.string().min(1).max(100),
    pickup_name: z.string().min(1).max(200),
    dropoff_name: z.string().min(1).max(200),
    customer_name: z.string().min(1).max(200),
    customer_email: z.string().max(254).nullable(),
    customer_phone: z.string().min(1).max(200),
    pickup_at: z.iso.datetime({ offset: true }),
    passengers: z.number().int().min(1).max(1000),
    luggage: z.number().int().min(0).max(1000).nullable(),
    vehicle_category: z.enum(["sedan", "suv", "van", "luxury"]).nullable(),
    price_aed: z.number().min(0).max(10000000),
    payment_status: z.enum(["unpaid", "paid", "refunded"]),
    flight_number: z.string().max(200).nullable(),
    attempt: z.number().int().min(1).max(5),
  })
  .strict();

export type OwnerBookingNotification = z.infer<typeof ownerBookingNotificationSchema>;

export function verifyNotificationEvent(
  body: string,
  headers: Record<string, string>,
  secret: string,
) {
  new Webhook(secret).verify(body, headers);
  return z
    .object({
      type: z.string().min(1).max(100),
      data: z.object({ email_id: z.string().min(1).max(200) }),
    })
    .parse(JSON.parse(body));
}
export const notificationSubject = (kind: string) => `Hamdi Tourism · ${kind.replaceAll("_", " ")}`;
export const ownerBookingNotificationRecipient = "hamdi.tourism@mail.ru";
export function parseOwnerBookingNotification(value: unknown): OwnerBookingNotification {
  return ownerBookingNotificationSchema.parse(value);
}
function safeEmailLine(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").trim();
}
export function ownerBookingNotificationSubject(reference: string) {
  return `New booking request · ${safeEmailLine(reference)}`;
}
export function ownerBookingNotificationText(booking: OwnerBookingNotification) {
  const requestedAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(booking.pickup_at));
  return [
    "HAMDI TOURISM has received a new booking request.",
    `Booking reference: ${safeEmailLine(booking.reference)}`,
    `Customer: ${safeEmailLine(booking.customer_name)}`,
    `Customer email: ${safeEmailLine(booking.customer_email ?? "Not provided")}`,
    `Customer phone: ${safeEmailLine(booking.customer_phone)}`,
    `Pickup: ${safeEmailLine(booking.pickup_name)}`,
    `Drop-off: ${safeEmailLine(booking.dropoff_name)}`,
    `Requested date and time: ${requestedAt} UAE time`,
    `Passengers: ${booking.passengers}`,
    `Luggage: ${booking.luggage ?? "Not recorded"}`,
    `Vehicle category: ${booking.vehicle_category ?? "Not recorded"}`,
    `Agreed fare: AED ${booking.price_aed.toFixed(2)} · payment status: ${booking.payment_status}`,
    ...(booking.flight_number ? [`Flight number: ${safeEmailLine(booking.flight_number)}`] : []),
    "",
    "Review the booking in the authorized Admin dashboard.",
  ].join("\n");
}
export const notificationText = (
  kind: string,
  reference: string,
  origin: string,
  bookingId: string,
) =>
  `${reference}: ${kind.replaceAll("_", " ")}.\nView your verified booking status and policies: ${origin}/passenger/bookings/${bookingId}\nThis notice does not approve a refund or payment. Only your booking page and verified provider records establish the current status.`;

export function parsePassengerNotificationBatch(value: unknown) {
  return z
    .array(
      z
        .object({
          id: z.uuid(),
          booking_id: z.uuid(),
          lease: z.uuid(),
          kind: z.string().min(1).max(100),
          email: z.email(),
          reference: z.string().min(1).max(128),
          attempt: z.number().int().min(1).max(5),
        })
        .strict(),
    )
    .max(10)
    .parse(value);
}
