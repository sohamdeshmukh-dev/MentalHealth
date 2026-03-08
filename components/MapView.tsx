"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { CheckIn, MOODS, SAMPLE_RESOURCES } from "@/lib/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapViewProps {
  checkins: CheckIn[];
}

export default function MapView({ checkins }: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
        Loading map...
      </div>
    );
  }

  function getMoodColor(mood: string): string {
    return MOODS.find((m) => m.label === mood)?.color ?? "#999";
  }

  return (
    <MapContainer
      center={[40.7128, -74.006]}
      zoom={12}
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Mood check-in markers */}
      {checkins.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={10}
          pathOptions={{
            fillColor: getMoodColor(c.mood),
            fillOpacity: 0.7,
            color: getMoodColor(c.mood),
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">
                {MOODS.find((m) => m.label === c.mood)?.icon} {c.mood}
              </p>
              {c.message && <p className="mt-1 text-gray-600">{c.message}</p>}
              <p className="mt-1 text-xs text-gray-400">
                {new Date(c.timestamp).toLocaleString()}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Resource markers */}
      {SAMPLE_RESOURCES.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={8}
          pathOptions={{
            fillColor: "#0ea5e9",
            fillOpacity: 0.8,
            color: "#0284c7",
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{r.name}</p>
              <p className="text-gray-600">{r.description}</p>
              {r.phone && (
                <p className="mt-1 font-medium text-indigo-600">{r.phone}</p>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
