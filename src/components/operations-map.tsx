"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MapPoint } from "@/components/leaflet-map";
const Map = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <p role="status" className="p-10 text-muted">
      Loading map…
    </p>
  ),
});
export function OperationsMap({ points }: { points: MapPoint[] }) {
  const [show, setShow] = useState(false);
  return (
    <section className="panel p-6 mt-6">
      <h2 className="font-semibold mb-3">Journey locations</h2>
      <p className="text-sm text-muted mb-5">
        This map shows configured pickup and destination locations. Driver location sharing is not
        available.
      </p>
      {!points.length ? (
        <p className="notice">No mapped locations are available for these journeys.</p>
      ) : show ? (
        <Map points={points} />
      ) : (
        <>
          <p className="text-xs text-muted mb-4">
            Loading the map connects to OpenStreetMap’s tile service.
          </p>
          <Button variant="outline" onClick={() => setShow(true)}>
            Show journey map
          </Button>
        </>
      )}
    </section>
  );
}
