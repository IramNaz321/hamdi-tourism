import { z } from "zod";
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);
export const settingsSchema = z.object({
  display_name: z.string().trim().min(1).max(200),
  contact_email: z.union([z.email().max(254), z.literal("")]).transform((v) => v || null),
  phone: optional(100),
  whatsapp: z
    .string()
    .trim()
    .regex(/^(\+?[0-9]{7,15})?$/, "Use an international number without spaces.")
    .transform((v) => v || null),
  address: optional(4000),
  about_text: optional(4000),
  booking_policy: optional(4000),
  cancellation_policy: optional(4000),
  currency: z.literal("AED"),
  published: z.boolean(),
  enquiries_enabled: z.boolean(),
  minimum_notice_hours: z.coerce.number().int().min(0).max(8760),
  turnaround_minutes: z.coerce.number().int().min(0).max(1440),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ink_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  canvas_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  font_family: z.enum(["system", "serif"]),
});
