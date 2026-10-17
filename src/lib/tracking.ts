import { z } from "zod";
export const gpsSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(5000),
  heading: z.number().finite().min(0).lt(360).nullable(),
  capturedAt: z.string().datetime(),
});
const point = z.object({
  id: z.uuid(),
  name: z.string(),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
});
export const snapshotSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
  sharing_allowed: z.boolean(),
  driver_phase: z.enum([
    "assigned",
    "accepted",
    "en_route",
    "arrived",
    "picked_up",
    "handover",
    "completed",
  ]),
  pickup: point,
  destination: point,
  driver_name: z.string().nullable(),
  vehicle: z.string().nullable(),
  location: z
    .object({
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
      accuracy: z.number().finite().min(0).max(5000),
      heading: z.number().nullable(),
      captured_at: z.string(),
      received_at: z.string(),
    })
    .nullable(),
});
export type TrackingSnapshot = z.infer<typeof snapshotSchema>;
export type GPSFix = z.infer<typeof gpsSchema>;
export function trackingPath(input: unknown) {
  return typeof input === "string" &&
    /^\/track\/[0-9a-f-]+$/i.test(input) &&
    z.uuid().safeParse(input.slice(7)).success
    ? input
    : null;
}
export function isStale(location: TrackingSnapshot["location"], now = Date.now()) {
  return (
    !location ||
    !Number.isFinite(Date.parse(location.received_at)) ||
    now - Date.parse(location.received_at) > 30000
  );
}
export const driverActions = {
  accept: "Accept trip",
  en_route: "Start journey to pickup",
  arrive: "Arrived at pickup",
  pickup: "Passenger picked up · Start trip",
  complete: "Complete trip",
  handover: "Accept reassigned active trip",
} as const;
export function nextDriverAction(trip: {
  status: string;
  accepted_at: string | null;
  en_route_at: string | null;
  arrived_at: string | null;
  picked_up_at: string | null;
  handover_at: string | null;
}) {
  if (trip.status === "in_progress")
    return trip.picked_up_at || trip.handover_at ? "complete" : "handover";
  if (trip.status !== "confirmed") return null;
  return !trip.accepted_at
    ? "accept"
    : !trip.en_route_at
      ? "en_route"
      : !trip.arrived_at
        ? "arrive"
        : "pickup";
}

export function uaeDay(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}
