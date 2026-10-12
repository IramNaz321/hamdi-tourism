"use client";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
export type MapPoint = { id: string; name: string; latitude: number; longitude: number };
export default function LeafletMap({ points }: { points: MapPoint[] }) {
  return (
    <MapContainer
      center={[points[0].latitude, points[0].longitude]}
      zoom={11}
      scrollWheelZoom={false}
      className="h-96 w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point) => (
        <CircleMarker
          key={point.id}
          center={[point.latitude, point.longitude]}
          radius={8}
          pathOptions={{ color: "#946732", fillColor: "#183431", fillOpacity: 0.9 }}
        >
          <Popup>{point.name}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
