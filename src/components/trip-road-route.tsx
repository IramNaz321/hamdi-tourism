"use client";
import { useEffect, useState } from "react";
import { roadRouteSchema, routingTarget, type RoadRoute } from "@/lib/road-routing";
import type { TrackingSnapshot } from "@/lib/tracking";
export function TripRoadRoute({
  trip,
  enabled,
  onRoute,
}: {
  trip: TrackingSnapshot;
  enabled: boolean;
  onRoute: (id: string, route?: RoadRoute) => void;
}) {
  const target = routingTarget(trip);
  const key = target?.key;
  const [estimate, setEstimate] = useState<RoadRoute | null>(null);
  const [contextKey, setContextKey] = useState<string | undefined>();
  const visibleEstimate = enabled && key && contextKey === key ? estimate : null;
  const [status, setStatus] = useState("ETA unavailable");
  useEffect(() => {
    let alive = true;
    let controller: AbortController | null = null;
    onRoute(trip.id);
    if (!enabled || !key) return;
    const refresh = async () => {
      if (document.hidden || !navigator.onLine) {
        if (alive) {
          setEstimate(null);
          onRoute(trip.id);
          setStatus("ETA unavailable while offline or inactive.");
        }
        return;
      }
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/tracking/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId: trip.id }),
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();
        if (!alive) return;
        const parsed = roadRouteSchema.safeParse(data.route);
        if (!response.ok || !parsed.success || parsed.data.tripId !== trip.id) {
          setEstimate(null);
          onRoute(trip.id);
          setStatus(data.error ?? "ETA unavailable");
          return;
        }
        setContextKey(key);
        setEstimate(parsed.data);
        onRoute(trip.id, parsed.data);
        setStatus("");
      } catch {
        if (alive && !controller?.signal.aborted) {
          setEstimate(null);
          onRoute(trip.id);
          setStatus("ETA unavailable");
        }
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    const stopHidden = () => {
      if (document.hidden) {
        controller?.abort();
        setEstimate(null);
        onRoute(trip.id);
        setStatus("ETA unavailable while this page is inactive.");
      }
    };
    document.addEventListener("visibilitychange", stopHidden);
    return () => {
      alive = false;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", stopHidden);
      onRoute(trip.id);
    };
  }, [enabled, key, trip.id, onRoute]);
  return (
    <div className="notice" aria-label="Verified road route estimate">
      {visibleEstimate ? (
        <>
          <p>
            Estimated arrival at {visibleEstimate.targetName}:{" "}
            {Math.ceil(visibleEstimate.durationSeconds / 60)} min · road distance{" "}
            {(visibleEstimate.distanceMeters / 1000).toFixed(1)} km
          </p>
          <p className="text-xs mt-1">
            Calculated {new Date(visibleEstimate.computedAt).toLocaleTimeString()}. Updated at most
            once per minute; excludes live traffic.{" "}
            <a className="underline" href="https://openrouteservice.org/">
              openrouteservice
            </a>{" "}
            / OpenStreetMap.
          </p>
        </>
      ) : (
        <p>
          {enabled
            ? status || "ETA unavailable. Waiting for a fresh shared GPS fix."
            : "ETA unavailable. Enable road route estimates to calculate from shared GPS."}
        </p>
      )}
    </div>
  );
}
