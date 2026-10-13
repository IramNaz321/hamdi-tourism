"use client";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import { useEffect, useRef } from "react";
import { type TrackingSnapshot, isStale } from "@/lib/tracking";
import "leaflet/dist/leaflet.css";
const car = divIcon({
  className: "live-car-marker",
  html: '<span aria-hidden="true">●</span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const point = divIcon({
  className: "journey-point-marker",
  html: '<span aria-hidden="true">●</span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});
function Bounds({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (coordinates.length && !fitted.current) {
      fitted.current = true;
      map.fitBounds(latLngBounds(coordinates), { padding: [30, 30], maxZoom: 15 });
    }
  }, [map, coordinates]);
  return null;
}
export default function TrackingMap({ trips }: { trips: TrackingSnapshot[] }) {
  const coordinates: [number, number][] = [];
  for (const t of trips) {
    if (t.location) coordinates.push([t.location.latitude, t.location.longitude]);
    for (const p of [t.pickup, t.destination])
      if (p.latitude !== null && p.longitude !== null) coordinates.push([p.latitude, p.longitude]);
  }
  if (!coordinates.length)
    return <p className="notice">No verified coordinates are available for this trip.</p>;
  return (
    <MapContainer
      center={coordinates[0]}
      zoom={12}
      scrollWheelZoom={false}
      className="h-96 w-full rounded-xl"
    >
      <Bounds coordinates={coordinates} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trips.flatMap((t) =>
        [t.pickup, t.destination]
          .filter((p) => p.latitude !== null && p.longitude !== null)
          .map((p, i) => (
            <Marker key={`${t.id}-${i}`} icon={point} position={[p.latitude!, p.longitude!]}>
              <Popup>{p.name}</Popup>
            </Marker>
          )),
      )}
      {trips
        .filter((t) => t.location)
        .map((t) => (
          <Marker key={t.id} position={[t.location!.latitude, t.location!.longitude]} icon={car}>
            <Popup>
              {t.reference} ·{" "}
              {isStale(t.location) ? "Last seen · stale" : "Current received position"} · ±
              {Math.round(t.location!.accuracy)} m
            </Popup>
          </Marker>
        ))}
      {trips
        .filter((t) => t.location)
        .map((t) => (
          <Circle
            key={`${t.id}-accuracy`}
            center={[t.location!.latitude, t.location!.longitude]}
            radius={t.location!.accuracy}
            pathOptions={{ weight: 1, fillOpacity: 0.08 }}
          />
        ))}
    </MapContainer>
  );
}
