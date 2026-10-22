"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { browserClient } from "@/lib/supabase/browser";
import { LocationSharing as Controller } from "@/lib/location-sharing";
import { LiveTracking } from "@/components/live-tracking";
export function LocationSharing({ tripId, eligible }: { tripId: string; eligible: boolean }) {
  const startEpoch = useRef(0);
  const invalidateStart = useCallback(() => {
    return ++startEpoch.current;
  }, []);
  const controller = useRef<Controller | null>(null);
  const consent = useRef<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [pending, setPending] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "Location is not shared. Start only if you consent to sharing during this trip.",
  );
  const accessChanged = useCallback(
    (active: boolean) => {
      if (!active) {
        invalidateStart();
        controller.current?.stop("Trip ended or access changed. Location sharing stopped.");
      }
    },
    [invalidateStart],
  );
  useEffect(() => {
    controller.current = new Controller({
      geolocation: navigator.geolocation,
      report: (message, active) => {
        setMessage(message);
        setSharing(active);
      },
      send: async (fix) => {
        if (!consent.current) return { denied: true };
        const { error } = await browserClient().rpc("share_trip_location", {
          trip_id: tripId,
          lat: fix.latitude,
          lng: fix.longitude,
          accuracy_m: fix.accuracy,
          captured: fix.capturedAt,
          bearing: fix.heading,
          consent_id: consent.current,
        });
        if (!error) setLastUpdated(new Date().toISOString());
        return {
          denied: !!error && ["42501", "PGRST301", "PGRST302", "PGRST303"].includes(error.code),
          error: !!error,
        };
      },
      revoke: async () => {
        const id = consent.current;
        consent.current = null;
        if (!id) return;
        const { error } = await browserClient().rpc("stop_trip_location", {
          trip_id: tripId,
          consent_id: id,
        });
        if (error) throw new Error("Stop could not be confirmed");
      },
    });
    const offline = () => {
      invalidateStart();
      controller.current?.stop("You are offline. Reconnect and start sharing again when ready.");
    };
    const hidden = () => {
      if (document.hidden) {
        invalidateStart();
        controller.current?.stop(
          "Sharing stopped while this page is hidden. Return and start again when ready.",
        );
      }
    };
    const {
      data: { subscription },
    } = browserClient().auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") {
        window.setTimeout(() => {
          invalidateStart();
          controller.current?.stop("You signed out. Location sharing stopped.");
        }, 0);
      }
    });
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      invalidateStart();
      controller.current?.stop();
      subscription.unsubscribe();
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [tripId, invalidateStart]);
  async function start() {
    if (!eligible || pending) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setMessage("GPS requires HTTPS and a browser that supports location sharing.");
      return;
    }
    if (!navigator.onLine) {
      setMessage("You are offline. Reconnect before sharing.");
      return;
    }
    const epoch = invalidateStart();
    setPending(true);
    try {
      const { data, error } = await browserClient().rpc("begin_trip_location", { trip_id: tripId });
      if (error || typeof data !== "string") {
        setMessage("Sharing could not start. Refresh your trip and check access.");
        return;
      }
      if (epoch !== startEpoch.current || document.hidden) {
        await browserClient().rpc("stop_trip_location", { trip_id: tripId, consent_id: data });
        return;
      }
      consent.current = data;
      controller.current?.start();
    } catch {
      setMessage("Unable to connect. Location sharing has not started.");
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    if (!eligible) {
      invalidateStart();
      controller.current?.stop("Trip ended or assignment changed. Sharing stopped.");
    }
  }, [eligible, invalidateStart]);
  return (
    <div className="space-y-4">
      <section className="border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">Share live location</h3>
        <p className="text-sm text-muted">
          Your trip’s verified passenger and authorized operations team can view shared GPS. Keep
          this page open; browser GPS cannot guarantee background updates. Only the latest position
          is kept. If stopping cannot reach the server, the last position expires within two
          minutes. Optional road-route estimates share trip coordinates with the configured routing
          provider when enabled.
        </p>
        <p role="status" className="text-sm">
          {message}
        </p>
        <p className="text-sm text-muted" aria-live="polite">
          Last successful update:{" "}
          {lastUpdated
            ? new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "medium",
                timeZone: "Asia/Dubai",
              }).format(new Date(lastUpdated)) + " UAE time"
            : "none yet"}
        </p>
        <button
          className="button min-h-12"
          disabled={pending || (!eligible && !sharing)}
          onClick={() => (sharing ? controller.current?.stop() : void start())}
        >
          {sharing ? "Stop sharing" : pending ? "Connecting…" : "Start sharing · I consent"}
        </button>
      </section>
      <LiveTracking tripId={tripId} onAccessChanged={accessChanged} />
    </div>
  );
}
