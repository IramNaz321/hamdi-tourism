import { z } from "zod";
import { isStale, type TrackingSnapshot } from "./tracking";
export const roadRouteSchema = z.object({
  tripId: z.uuid(),
  coordinates: z
    .array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]))
    .min(2)
    .max(20000),
  distanceMeters: z.number().finite().min(0).max(20000000),
  durationSeconds: z.number().finite().min(0).max(604800),
  computedAt: z.string().datetime(),
  gpsReceivedAt: z.string().datetime(),
  targetName: z.string().max(1000),
  trafficAware: z.literal(false),
});
export type RoadRoute = z.infer<typeof roadRouteSchema>;
export function routingTarget(trip: TrackingSnapshot, now = Date.now()) {
  if (
    !trip.sharing_allowed ||
    trip.driver_phase === "completed" ||
    !["confirmed", "in_progress"].includes(trip.status) ||
    isStale(trip.location, now) ||
    !trip.location ||
    trip.location.accuracy > 200 ||
    Date.parse(trip.location.received_at) > now + 5000
  )
    return null;
  const target = ["picked_up", "handover"].includes(trip.driver_phase)
    ? trip.destination
    : trip.pickup;
  if (target.latitude === null || target.longitude === null) return null;
  return {
    from: [trip.location.longitude, trip.location.latitude] as [number, number],
    to: [target.longitude, target.latitude] as [number, number],
    name: target.name,
    key: `${trip.id}:${trip.driver_phase}:${target.id}:${target.longitude}:${target.latitude}`,
  };
}
export function parseRoadRoute(data: unknown, trip: TrackingSnapshot, now = Date.now()): RoadRoute {
  const target = routingTarget(trip, now);
  if (!target) throw new Error("ETA unavailable");
  const response = z
    .object({
      features: z
        .array(
          z.object({
            geometry: z.object({
              type: z.literal("LineString"),
              coordinates: z.array(z.array(z.number().finite()).min(2).max(3)).min(2).max(20000),
            }),
            properties: z.object({
              summary: z.object({ distance: z.number(), duration: z.number() }),
            }),
          }),
        )
        .min(1)
        .max(3),
    })
    .parse(data);
  const feature = response.features[0];
  const points = feature.geometry.coordinates.map((p) => [p[1], p[0]]);
  const first = points[0],
    last = points[points.length - 1];
  // Reject an unrelated provider route rather than rendering a fabricated origin/goal.
  if (
    Math.abs(first[0] - target.from[1]) > 0.03 ||
    Math.abs(first[1] - target.from[0]) > 0.03 ||
    Math.abs(last[0] - target.to[1]) > 0.03 ||
    Math.abs(last[1] - target.to[0]) > 0.03
  )
    throw new Error("ETA unavailable");
  return roadRouteSchema.parse({
    tripId: trip.id,
    coordinates: points,
    distanceMeters: feature.properties.summary.distance,
    durationSeconds: feature.properties.summary.duration,
    computedAt: new Date(now).toISOString(),
    gpsReceivedAt: new Date(trip.location!.received_at).toISOString(),
    targetName: target.name,
    trafficAware: false,
  });
}
/** Bounded per-process rate control. Provider-side quotas are also required for multiple instances. */
export class RoutingBudget {
  private windows = new Map<string, { started: number; count: number }>();
  constructor(
    private limit: number,
    private maxKeys = 1000,
  ) {}
  take(key: string, now = Date.now()) {
    for (const [id, window] of this.windows)
      if (now - window.started >= 60000) this.windows.delete(id);
    let window = this.windows.get(key);
    if (!window) {
      if (this.windows.size >= this.maxKeys) return false;
      window = { started: now, count: 0 };
      this.windows.set(key, window);
    }
    if (window.count >= this.limit) return false;
    window.count++;
    return true;
  }
}
