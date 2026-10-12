import { z } from "zod";
export type Role = "owner" | "manager" | "dispatcher" | "viewer" | "driver";
export type Field = {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "tel"
    | "number"
    | "datetime-local"
    | "date"
    | "textarea"
    | "select"
    | "checkbox";
  required?: boolean;
  options?: string[];
  relation?: string;
  min?: number;
  max?: number;
  defaultChecked?: boolean;
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
      {
        name: "account_status",
        label: "Account status",
        type: "select",
        options: ["active", "inactive"],
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
      { name: "make", label: "Make", type: "text", required: true },
      { name: "model", label: "Model", type: "text", required: true },
      { name: "registration_expiry", label: "Registration expiry", type: "date" },
      {
        name: "luggage_capacity",
        label: "Luggage capacity",
        type: "number",
        min: 0,
        max: 1000,
        required: true,
      },
      { name: "public_listed", label: "Publish on Our Fleet", type: "checkbox" },
      { name: "description", label: "Public description", type: "textarea" },
      { name: "plate_number", label: "Registration plate", type: "text", required: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: ["sedan", "suv", "van", "luxury"],
        required: true,
      },
      {
        name: "capacity",
        label: "Passenger capacity",
        type: "number",
        min: 1,
        max: 1000,
        required: true,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: ["available", "on_trip", "maintenance", "unavailable", "inactive"],
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
      { name: "city", label: "Emirate / city", type: "text" },
      {
        name: "airport_code",
        label: "Airport code (DXB, DWC or another verified airport)",
        type: "text",
      },
      { name: "latitude", label: "Latitude", type: "number", min: -90, max: 90, step: "any" },
      { name: "longitude", label: "Longitude", type: "number", min: -180, max: 180, step: "any" },
      { name: "public_listed", label: "Publish as a pickup / destination", type: "checkbox" },
      { name: "featured_destination", label: "Feature in destinations", type: "checkbox" },
      { name: "description", label: "Public destination description", type: "textarea" },
    ],
  },
  routes: {
    title: "Routes",
    singular: "route",
    description: "Manage the journeys you serve.",
    columns: ["name", "pickup_location_id", "dropoff_location_id"],
    fields: [
      { name: "name", label: "Route name", type: "text", required: true },
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
    ],
  },
  route_pricing: {
    title: "Route pricing",
    singular: "pricing rule",
    description: "Manage base fares, return fares and additional charges in AED.",
    columns: ["route_id", "vehicle_category", "price_aed", "return_fare_aed"],
    fields: [
      { name: "route_id", label: "Route", type: "select", relation: "routes", required: true },
      {
        name: "vehicle_category",
        label: "Vehicle category",
        type: "select",
        options: ["sedan", "suv", "van", "luxury"],
        required: true,
      },
      {
        name: "price_aed",
        label: "Outbound base fare (AED)",
        type: "number",
        min: 0,
        step: "0.01",
        required: true,
      },
      {
        name: "additional_charges_aed",
        label: "Additional charges per leg (AED)",
        type: "number",
        min: 0,
        step: "0.01",
        required: true,
      },
      {
        name: "return_fare_aed",
        label: "Return leg base fare (AED, optional)",
        type: "number",
        min: 0,
        step: "0.01",
      },
      { name: "public_listed", label: "Enable public quotes for this rule", type: "checkbox" },
    ],
  },
  pricing_extras: {
    title: "Optional extras",
    singular: "optional extra",
    description: "Configure genuine optional services and charges.",
    columns: ["name", "route_pricing_id", "price_aed", "charge_basis"],
    fields: [
      { name: "name", label: "Extra name", type: "text", required: true },
      {
        name: "route_pricing_id",
        label: "Pricing rule",
        type: "select",
        relation: "route_pricing",
        required: true,
      },
      {
        name: "price_aed",
        label: "Charge (AED)",
        type: "number",
        min: 0,
        step: "0.01",
        required: true,
      },
      {
        name: "charge_basis",
        label: "Charge applies",
        type: "select",
        options: ["per_booking", "per_leg"],
        required: true,
      },
    ],
  },
  bookings: {
    title: "Bookings",
    singular: "booking",
    description: "Schedule transfers, assign chauffeurs and follow every journey.",
    columns: ["reference", "customer_id", "pickup_at", "status", "price_aed"],
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
      {
        name: "end_at",
        label: "Expected journey end (UAE, UTC+4)",
        type: "datetime-local",
        required: true,
      },
      {
        name: "luggage",
        label: "Luggage count",
        type: "number",
        min: 0,
        max: 1000,
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
        name: "flight_status",
        label: "Flight status (manually recorded)",
        type: "select",
        options: ["not_recorded", "scheduled", "delayed", "arrived", "cancelled"],
        required: true,
      },
      {
        name: "cancellation_reason",
        label: "Cancellation reason (required when cancelling)",
        type: "textarea",
      },
      {
        name: "passengers",
        label: "Passengers",
        type: "number",
        min: 1,
        max: 1000,
        required: true,
      },
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
): Record<string, string | number | boolean | null> {
  const definition = entities[entity];
  if (!Object.hasOwn(entities, entity)) throw new Error("Unknown record type.");
  const result: Record<string, string | number | boolean | null> = {};
  for (const field of definition.fields) {
    const raw = data.get(field.name);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (field.type === "checkbox") {
      result[field.name] = value === "on";
      continue;
    }
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
        num > (field.max ?? 10000000) ||
        (!field.step && !Number.isInteger(num)) ||
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
      if (!z.email().max(254).safeParse(value).success)
        throw new Error("Enter a valid email address.");
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
  if (entity === "bookings") {
    if (String(result.end_at) <= String(result.pickup_at))
      throw new Error("Journey end must follow pickup time.");
    if (result.status === "cancelled" && !result.cancellation_reason)
      throw new Error("Record a cancellation reason.");
  }
  if (entity === "locations") {
    if (result.airport_code && !/^[A-Z]{3}$/.test(String(result.airport_code)))
      throw new Error("Use a three-letter uppercase airport code.");
    if ((result.latitude === null) !== (result.longitude === null))
      throw new Error("Enter both map coordinates or leave both empty.");
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
