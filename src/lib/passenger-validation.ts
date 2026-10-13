import { z } from "zod";
import { journeySchema } from "./booking-validation";
export const passengerContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(7).max(100),
});
export const passengerJourneySchema = journeySchema.safeExtend({ vehicle_id: z.uuid() });
export const bookingSubmissionSchema = z.object({
  quote_id: z.uuid(),
  request_id: z.uuid(),
  notes: z.string().trim().max(4000),
  acknowledged: z.literal(true),
});
export const languageSchema = z.enum(["en", "ar", "ur", "hi"]);
export const conciergeInput = z
  .object({
    message: z.string().trim().min(1).max(1500),
    language: languageSchema,
    bookingId: z.uuid().optional(),
    token: z.string().max(2048).optional(),
  })
  .strict();
export const passengerReturnPath = (value: unknown) =>
  typeof value === "string" &&
  (value === "/passenger" ||
    value === "/book" ||
    /^\/book\?vehicle=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value) ||
    /^\/passenger\/bookings\/[a-f0-9-]{36}$/.test(value))
    ? value
    : "/passenger";
export function bookingPaymentState(paid: number, refunded: number, price: number) {
  if (paid === 0) return "Unpaid";
  if (refunded >= paid) return "Refunded";
  if (refunded > 0) return "Partially refunded";
  return paid >= price ? "Payment verified" : "Partially paid";
}
