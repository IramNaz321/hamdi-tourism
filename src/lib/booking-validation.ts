import { z } from "zod";
export function uaeDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Enter a valid date and time.");
  const date = new Date(`${value}:00+04:00`);
  if (
    Number.isNaN(date.getTime()) ||
    new Date(date.getTime() + 14400000).toISOString().slice(0, 16) !== value
  )
    throw new Error("Enter a valid date and time.");
  return date.toISOString();
}
export const journeySchema = z
  .object({
    pickup_id: z.uuid(),
    dropoff_id: z.uuid(),
    pickup_at: z.string().transform(uaeDateTime),
    return_at: z.string().transform((v) => (v ? uaeDateTime(v) : null)),
    passengers: z.coerce.number().int().min(1).max(1000),
    luggage: z.coerce.number().int().min(0).max(1000),
    category: z.enum(["sedan", "suv", "van", "luxury"]),
    transfer_type: z.enum(["one_way", "return"]),
    flight: z.string().trim().max(200),
    extras: z.array(z.uuid()).max(20),
  })
  .superRefine((data, ctx) => {
    if (data.pickup_id === data.dropoff_id)
      ctx.addIssue({ code: "custom", message: "Choose different pickup and drop-off locations." });
    if (new Date(data.pickup_at) <= new Date())
      ctx.addIssue({ code: "custom", message: "Choose a future pickup time." });
    if (data.transfer_type === "return" && (!data.return_at || data.return_at <= data.pickup_at))
      ctx.addIssue({ code: "custom", message: "Return pickup must follow the outbound pickup." });
    if (data.transfer_type === "one_way" && data.return_at)
      ctx.addIssue({ code: "custom", message: "Choose a return transfer to add a return time." });
    if (new Set(data.extras).size !== data.extras.length)
      ctx.addIssue({ code: "custom", message: "Choose each optional extra once." });
  });
export function journeyData(form: FormData) {
  return {
    pickup_id: form.get("pickup_id"),
    dropoff_id: form.get("dropoff_id"),
    pickup_at: `${form.get("pickup_date") ?? ""}T${form.get("pickup_time") ?? ""}`,
    return_at: form.get("transfer_type") === "return" ? String(form.get("return_at") ?? "") : "",
    passengers: form.get("passengers"),
    luggage: form.get("luggage"),
    category: form.get("category"),
    transfer_type: form.get("transfer_type"),
    flight: String(form.get("flight") ?? ""),
    extras: form.getAll("extras"),
  };
}
export type Quote = {
  pricing_id: string;
  currency: "AED";
  base_fare: number;
  additional_charges: number;
  outbound_aed: number;
  return_aed: number | null;
  total_aed: number;
  extras: { id: string; name: string; price_aed: number; charge_basis: string }[];
};
