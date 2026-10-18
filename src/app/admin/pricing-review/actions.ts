"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";

export type FareDraftState = { error?: string; success?: string };

const amount = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/).transform(Number);

export async function saveFareDraft(
  _: FareDraftState,
  form: FormData,
): Promise<FareDraftState> {
  const { supabase, member } = await requireOwner();
  const parsed = z
    .object({
      route_id: z.uuid(),
      category: z.enum(["sedan", "suv", "van", "luxury"]),
      price_aed: amount.pipe(z.number().gt(0).max(10000000)),
      additional_charges_aed: amount.pipe(z.number().min(0).max(10000000)),
      return_fare_aed: z.union([z.literal(""), amount.pipe(z.number().gt(0).max(10000000))]),
      confirm: z.literal("yes"),
    })
    .safeParse({
      route_id: form.get("route_id"),
      category: form.get("category"),
      price_aed: form.get("price_aed"),
      additional_charges_aed: form.get("additional_charges_aed"),
      return_fare_aed: form.get("return_fare_aed"),
      confirm: form.get("confirm"),
    });
  if (!parsed.success) return { error: "Enter valid AED amounts and confirm this unpublished draft." };

  const [route, vehicle, existing] = await Promise.all([
    supabase
      .from("routes")
      .select("id,name,pickup_location_id,dropoff_location_id")
      .eq("organization_id", member.organization_id)
      .eq("id", parsed.data.route_id)
      .eq("archived", false)
      .maybeSingle(),
    supabase
      .from("vehicles")
      .select("id")
      .eq("organization_id", member.organization_id)
      .eq("category", parsed.data.category)
      .eq("archived", false)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("route_pricing")
      .select("id")
      .eq("organization_id", member.organization_id)
      .eq("route_id", parsed.data.route_id)
      .eq("vehicle_category", parsed.data.category)
      .eq("archived", false)
      .maybeSingle(),
  ]);
  if (route.error || vehicle.error || existing.error) {
    console.error("Fare draft validation failed", {
      code: route.error?.code ?? vehicle.error?.code ?? existing.error?.code ?? "unknown",
    });
    return { error: "Unable to verify this route and vehicle category. Refresh and try again." };
  }
  if (!route.data) return { error: "Choose an existing active route." };
  if (!vehicle.data) return { error: "Add a real vehicle in this category before drafting a fare." };
  if (existing.data)
    return {
      error: "A fare already exists for this route and category. Review it in Route pricing instead.",
    };

  const { error } = await supabase.from("route_pricing").insert({
    organization_id: member.organization_id,
    route_id: route.data.id,
    name: route.data.name,
    pickup_location_id: route.data.pickup_location_id,
    dropoff_location_id: route.data.dropoff_location_id,
    vehicle_category: parsed.data.category,
    price_aed: parsed.data.price_aed,
    additional_charges_aed: parsed.data.additional_charges_aed,
    return_fare_aed: parsed.data.return_fare_aed || null,
    public_listed: false,
  });
  if (error) {
    console.error("Fare draft save failed", { code: error.code });
    return {
      error:
        error.code === "23505"
          ? "A fare was added at the same time. Refresh to review it."
          : "The unpublished fare draft could not be saved. Check the entries and try again.",
    };
  }
  revalidatePath("/admin/pricing-review");
  revalidatePath("/admin/route_pricing");
  revalidatePath("/admin/settings");
  return { success: "Saved as unpublished. It cannot be quoted until an owner publishes it." };
}
