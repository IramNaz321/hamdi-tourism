import { NextResponse } from "next/server";
import { z } from "zod";
import { readLimitedBody } from "@/lib/bounded-body";
import { sameOrigin } from "@/lib/request-security";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { snapshotSchema } from "@/lib/tracking";
import { parseRoadRoute, routingTarget, RoutingBudget, type RoadRoute } from "@/lib/road-routing";
export const runtime = "nodejs";
const users = new RoutingBudget(30);
const configuredBudget = z.coerce
  .number()
  .int()
  .min(1)
  .max(35)
  .safeParse(process.env.ROUTING_PROVIDER_REQUESTS_PER_MINUTE ?? "10");
const provider = new RoutingBudget(configuredBudget.success ? configuredBudget.data : 1, 1);
const cache = new Map<string, { expires: number; route: RoadRoute }>();
const pending = new Map<string, Promise<RoadRoute>>();
function result(value: object, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return result({ error: "ETA unavailable" }, 403);
  if (process.env.ROUTING_ENABLED !== "true" || !process.env.ORS_API_KEY || !isConfigured())
    return result({ error: "ETA unavailable. Road routing is not configured." }, 503);
  let tripId: string;
  try {
    tripId = z
      .object({ tripId: z.uuid() })
      .strict()
      .parse(JSON.parse(await readLimitedBody(request, 512))).tripId;
  } catch {
    return result({ error: "ETA unavailable" }, 400);
  }
  try {
    const client = await createClient();
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user?.email_confirmed_at)
      return result({ error: "Sign in to view your authorized trip route." }, 401);
    if (!users.take(user.id))
      return result({ error: "ETA unavailable. Retry in one minute." }, 429);
    // Derive all coordinates from RLS-protected trip data, never visitor-supplied coordinates.
    const snapshot = await client.rpc("tracking_snapshot", { trip_id: tripId });
    const parsed = snapshotSchema.safeParse(snapshot.data);
    if (snapshot.error || !parsed.success || parsed.data.id !== tripId)
      return result({ error: "Tracking access is unavailable." }, 403);
    const trip = parsed.data,
      target = routingTarget(trip);
    if (!target)
      return result(
        { error: "ETA unavailable. A fresh shared GPS fix and verified destination are required." },
        409,
      );
    const now = Date.now();
    for (const [key, item] of cache) if (item.expires <= now) cache.delete(key);
    let estimate = cache.get(target.key)?.route;
    if (!estimate) {
      let operation = pending.get(target.key);
      if (!operation) {
        if (pending.size >= 35 || !provider.take("provider"))
          return result({ error: "ETA unavailable. Retry in one minute." }, 429);
        operation = (async () => {
          const response = await fetch(
            "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
            {
              method: "POST",
              headers: {
                Authorization: process.env.ORS_API_KEY!,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ coordinates: [target.from, target.to], instructions: false }),
              signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
              cache: "no-store",
              redirect: "error",
            },
          );
          if (!response.ok) throw new Error("ETA unavailable");
          const data = JSON.parse(await readLimitedBody(response, 1500000));
          // Freshness is checked again below, including revocation while the provider request ran.
          const route = parseRoadRoute(data, trip, now);
          if (cache.size >= 500) cache.delete(cache.keys().next().value!);
          const expires = now + 60000;
          cache.set(target.key, { route, expires });
          const cleanup = setTimeout(
            () => {
              if (cache.get(target.key)?.expires === expires) cache.delete(target.key);
            },
            Math.max(0, expires - Date.now()),
          );
          cleanup.unref();
          return route;
        })();
        pending.set(target.key, operation);
      }
      try {
        estimate = await operation;
      } finally {
        pending.delete(target.key);
      }
    }
    const recheck = await client.rpc("tracking_snapshot", { trip_id: tripId });
    const current = snapshotSchema.safeParse(recheck.data);
    if (recheck.error || !current.success || routingTarget(current.data)?.key !== target.key) {
      cache.delete(target.key);
      return result({ error: "Tracking access or fresh location is no longer available." }, 403);
    }
    return result({ route: estimate });
  } catch {
    return result({ error: "ETA unavailable. Routing could not be verified." }, 503);
  }
}
