import { z } from "zod";
export type Role = "owner" | "manager" | "dispatcher" | "viewer";
export type Field = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "datetime-local" | "date" | "textarea" | "select";
  required?: boolean;
  options?: string[];
  relation?: string;
  min?: number;
  step?: string;
};
export type Entity = {
  title: string;
  singular: string;
  description: string;
  fields: Field[];
  columns: string[];
};
export const entities: Record<string, Entity> = {
  drivers: {
    title: "Drivers",
    singular: "driver",
    description: "Manage your chauffeur team and availability.",
    columns: ["name", "phone", "license_number", "status"],
    fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "license_number", label: "Driving licence number", type: "text", required: true },
      { name: "license_expiry", label: "Licence expiry", type: "date" },
      {
        name: "status",
        label: "Availability",
        type: "select",
        options: ["available", "on_trip", "unavailable"],
        required: true,
      },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  vehicles: {
    title: "Vehicles",
    singular: "vehicle",
    description: "Track your fleet, capacity and service availability.",
    columns: ["name", "plate_number", "capacity", "status"],
    fields: [
      { name: "name", label: "Make and model", type: "text", required: true },
      { name: "plate_number", label: "Registration plate", type: "text", required: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: ["sedan", "suv", "van", "luxury"],
        required: true,
      },
      { name: "capacity", label: "Passenger capacity", type: "number", min: 1, required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: ["available", "on_trip", "maintenance"],
        required: true,
      },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  customers: {
    title: "Customers",
    singular: "customer",
    description: "Keep customer contact details in one secure place.",
    columns: ["name", "phone", "email"],
    fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  locations: {
    title: "Locations",
    singular: "location",
    description: "Maintain the pickup and drop-off locations you serve.",
    columns: ["name", "kind", "address"],
    fields: [
      { name: "name", label: "Location name", type: "text", required: true },
      {
        name: "kind",
        label: "Type",
        type: "select",
        options: ["airport", "hotel", "residence", "office", "other"],
        required: true,
      },
      { name: "address", label: "Address", type: "textarea", required: true },
    ],
  },
  route_pricing: {
    title: "Route pricing",
    singular: "route price",
    description: "Set fixed fares in AED for each route and vehicle category.",
    columns: ["pickup_location_id", "dropoff_location_id", "vehicle_category", "price_aed"],
    fields: [
      {
        name: "pickup_location_id",
        label: "Pickup location",
        type: "select",
        relation: "locations",
        required: true,
      },
      {
        name: "dropoff_location_id",
        label: "Drop-off location",
        type: "select",
        relation: "locations",
        required: true,
      },
      {
        name: "vehicle_category",
        label: "Vehicle category",
        type: "select",
        options: ["sedan", "suv", "van", "luxury"],
        required: true,
      },
      {
        name: "price_aed",
        label: "Fare (AED)",
        type: "number",
        min: 0,
        step: "0.01",
        required: true,
      },
    ],
  },
  bookings: {
    title: "Bookings",
    singular: "booking",
    description: "Schedule transfers, assign chauffeurs and follow every journey.",
    columns: ["reference", "customer_id", "pickup_at", "status", "price_aed", "payment_status"],
    fields: [
      {
        name: "customer_id",
        label: "Customer",
        type: "select",
        relation: "customers",
        required: true,
      },
      {
        name: "pickup_location_id",
        label: "Pickup location",
        type: "select",
        relation: "locations",
        required: true,
      },
      {
        name: "dropoff_location_id",
        label: "Drop-off location",
        type: "select",
        relation: "locations",
        required: true,
      },
      {
        name: "pickup_at",
        label: "Pickup time (UAE, UTC+4)",
        type: "datetime-local",
        required: true,
      },
      { name: "passengers", label: "Passengers", type: "number", min: 1, required: true },
      { name: "driver_id", label: "Driver", type: "select", relation: "drivers" },
      { name: "vehicle_id", label: "Vehicle", type: "select", relation: "vehicles" },
      { name: "flight_number", label: "Flight number (optional)", type: "text" },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
        required: true,
      },
      {
        name: "price_aed",
        label: "Agreed fare (AED)",
        type: "number",
        min: 0,
        step: "0.01",
        required: true,
      },
      {
        name: "payment_status",
        label: "Payment status",
        type: "select",
        options: ["unpaid", "paid", "refunded"],
        required: true,
      },
      { name: "notes", label: "Journey notes", type: "textarea" },
    ],
  },
};
export function canWrite(role: Role, entity: string) {
  return (
    Object.hasOwn(entities, entity) &&
    (role === "owner" ||
      role === "manager" ||
      (role === "dispatcher" && ["bookings", "customers"].includes(entity)))
  );
}
export function parseRecord(
  entity: string,
  data: FormData,
): Record<string, string | number | null> {
  const definition = entities[entity];
  if (!Object.hasOwn(entities, entity)) throw new Error("Unknown record type.");
  const result: Record<string, string | number | null> = {};
  for (const field of definition.fields) {
    const raw = data.get(field.name);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      if (field.required) throw new Error(`${field.label} is required.`);
      result[field.name] = null;
      continue;
    }
    if (field.type === "number") {
      const num = Number(value);
      if (
        !Number.isFinite(num) ||
        num < (field.min ?? 0) ||
        num > 10000000 ||
        (field.step !== "0.01" && !Number.isInteger(num)) ||
        (field.step === "0.01" && !/^\d+(\.\d{1,2})?$/.test(value))
      )
        throw new Error(
          `${field.label} must be a valid number${field.step === "0.01" ? " with up to two decimal places" : ""}.`,
        );
      result[field.name] = num;
    } else if (field.relation) {
      if (!z.uuid().safeParse(value).success)
        throw new Error(`Choose a valid ${field.label.toLowerCase()}.`);
      result[field.name] = value;
    } else if (field.options) {
      if (!field.options.includes(value))
        throw new Error(`Choose a valid ${field.label.toLowerCase()}.`);
      result[field.name] = value;
    } else if (field.type === "email") {
      if (!z.email().max(254).safeParse(value).success) throw new Error("Enter a valid email address.");
      result[field.name] = value.toLowerCase();
    } else if (field.type === "datetime-local") {
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(`${value}:00+04:00`))
      )
        throw new Error("Enter a valid pickup date and time.");
      const instant = new Date(`${value}:00+04:00`).toISOString();
      if (toUaeInput(instant) !== value) throw new Error("Enter a valid pickup date and time.");
      result[field.name] = instant;
    } else if (field.type === "date") {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
      )
        throw new Error("Enter a valid date.");
      result[field.name] = value;
    } else {
      if (value.length > (field.type === "textarea" ? 4000 : 200))
        throw new Error(`${field.label} is too long.`);
      result[field.name] = value;
    }
  }
  if (result.pickup_location_id && result.pickup_location_id === result.dropoff_location_id)
    throw new Error("Pickup and drop-off must be different locations.");
  return result;
}
export function toUaeInput(value: string) {
  return new Date(new Date(value).getTime() + 4 * 3600000).toISOString().slice(0, 16);
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(value);
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-AE", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
