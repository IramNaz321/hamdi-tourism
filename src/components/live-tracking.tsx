"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { browserClient } from "@/lib/supabase/browser";
import { snapshotSchema, isStale, type TrackingSnapshot } from "@/lib/tracking";
const Map = dynamic(() => import("@/components/tracking-map"), {
  ssr: false,
  loading: () => <p role="status">Loading map…</p>,
});
export function LiveTracking({
  tripId,
  organizationId,
  onAccessChanged,
}: {
  tripId?: string;
  organizationId?: string;
  onAccessChanged?: (active: boolean) => void;
}) {
  const fetchEpoch = useRef(0);
  const invalidateFetch = useCallback(() => {
    return ++fetchEpoch.current;
  }, []);
  const [records, setRecords] = useState<TrackingSnapshot[]>([]);
  const [status, setStatus] = useState("Loading verified trip information…");
  const [connected, setConnected] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const refresh = useCallback(async () => {
    const epoch = invalidateFetch();
    try {
      if (!navigator.onLine) {
        setRecords([]);
        setConnected(false);
        setStatus("You are offline. Reconnect to view current tracking.");
        onAccessChanged?.(false);
        return;
      }
      const client = browserClient();
      const { data, error } = tripId
        ? await client.rpc("tracking_snapshot", { trip_id: tripId })
        : await client.rpc("admin_live_tracking");
      if (epoch !== fetchEpoch.current) return;
      if (error) {
        setRecords([]);
        setStatus(
          error.code === "42501"
            ? "Tracking access is unavailable or expired."
            : "Tracking could not be loaded. Retry or contact the operations team.",
        );
        onAccessChanged?.(false);
        return;
      }
      const parsed = snapshotSchema.array().safeParse(tripId ? [data] : data);
      if (!parsed.success) {
        setRecords([]);
        setStatus("Verified tracking information is unavailable.");
        onAccessChanged?.(false);
        return;
      }
      setRecords(parsed.data);
      setStatus(parsed.data.length ? "Trip information updated." : "No active trips to monitor.");
      const trip = parsed.data[0];
      onAccessChanged?.(!!trip && trip.sharing_allowed);
    } catch {
      if (epoch !== fetchEpoch.current) return;
      setRecords([]);
      setStatus("Tracking is disconnected. Reconnect and retry.");
      onAccessChanged?.(false);
    }
  }, [tripId, onAccessChanged, invalidateFetch]);
  useEffect(() => {
    const client = browserClient();
    let alive = true;
    let channel: ReturnType<typeof client.channel> | null = null;
    const connect = async () => {
      await refresh();
      await client.realtime.setAuth();
      if (!alive) return;
      channel = client
        .channel(tripId ? `trip:${tripId}` : `operations-tracking:${organizationId}`, {
          config: { private: true },
        })
        .on("broadcast", { event: "tracking_changed" }, () => void refresh())
        .subscribe((value: string) => {
          if (!alive) return;
          setConnected(value === "SUBSCRIBED");
          if (value === "SUBSCRIBED") void refresh();
        });
    };
    void connect().catch(() => {
      if (alive) setStatus("Automatic updates unavailable. Retrying periodically.");
    });
    const timer = setInterval(() => {
      setClock(Date.now());
      if (!document.hidden) void refresh();
    }, 10000);
    const offline = () => {
      invalidateFetch();
      setConnected(false);
      setRecords([]);
      setStatus("You are offline. Reconnect to view current tracking.");
      onAccessChanged?.(false);
    };
    const online = () => void refresh();
    const visible = () => {
      invalidateFetch();
      setRecords([]);
      setClock(Date.now());
      if (!document.hidden) void refresh();
    };
    const auth = client.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") {
        invalidateFetch();
        setRecords([]);
        setConnected(false);
        onAccessChanged?.(false);
      }
    });
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pageshow", visible);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      alive = false;
      invalidateFetch();
      auth.data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pageshow", visible);
      clearInterval(timer);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      if (channel) void client.removeChannel(channel);
    };
  }, [tripId, organizationId, refresh, onAccessChanged, invalidateFetch]);
  return (
    <section className="panel p-5 space-y-4" aria-label="Verified live tracking">
      <h2 className="font-semibold">Live trip tracking</h2>
      <p role="status" className="text-sm text-muted">
        {status} · {connected ? "Automatic updates connected" : "Periodic updates"}
      </p>
      <button className="button secondary" onClick={() => void refresh()}>
        Refresh tracking
      </button>
      {records.map((trip) => (
        <div key={trip.id} className="border-t pt-4 text-sm space-y-2">
          <p className="font-semibold">
            {trip.reference} · {trip.status.replaceAll("_", " ")} ·{" "}
            {trip.driver_phase.replaceAll("_", " ")}
          </p>
          <p>
            {trip.driver_name ?? "Driver unassigned"} · {trip.vehicle ?? "Vehicle unassigned"}
          </p>
          <p>
            {trip.pickup.name} → {trip.destination.name}
          </p>
          {trip.location ? (
            <p>
              {isStale(trip.location, clock) ? "GPS update is stale" : "Last GPS update"}:{" "}
              {new Date(trip.location.received_at).toLocaleTimeString()} · accuracy ±
              {Math.round(trip.location.accuracy)} m
            </p>
          ) : (
            <p>
              {["completed", "cancelled"].includes(trip.status)
                ? "Trip ended. Location sharing is unavailable."
                : "No current shared GPS location. Waiting for driver consent and a fresh device update."}
            </p>
          )}
        </div>
      ))}
      {records.length > 0 &&
        (showMap ? (
          <Map trips={records} />
        ) : (
          <>
            <p className="text-xs text-muted">
              Opening the map connects to OpenStreetMap’s tile service. No estimated arrival time is
              shown.
            </p>
            <button className="button secondary" onClick={() => setShowMap(true)}>
              Show live map
            </button>
          </>
        ))}
    </section>
  );
}
