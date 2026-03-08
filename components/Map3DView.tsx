"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CheckIn, MOODS, CityConfig } from "@/lib/types";

// Free public token for demo — replace with your own for production.
mapboxgl.accessToken =
  "pk.eyJ1IjoibWVudGFsbWFwLWRlbW8iLCJhIjoiY200eDVsMjFuMGF5bDJrczZ2OXJ3ZGw5biJ9.demo";

interface Map3DViewProps {
  checkins: CheckIn[];
  city: CityConfig;
}

export default function Map3DView({ checkins, city }: Map3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Build GeoJSON from check-ins
  const buildGeoJSON = useCallback(
    (data: CheckIn[]): GeoJSON.FeatureCollection => ({
      type: "FeatureCollection",
      features: data.map((c) => ({
        type: "Feature" as const,
        properties: {
          mood: c.mood,
          weight: MOODS.find((m) => m.label === c.mood)?.weight ?? 0.5,
          message: c.message,
          timestamp: c.timestamp,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [c.lng, c.lat],
        },
      })),
    }),
    []
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [city.lng, city.lat],
      zoom: 11.5,
      pitch: 55,
      bearing: -15,
      antialias: true,
      projection: "globe",
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("style.load", () => {
      // Atmosphere for globe effect
      map.setFog({
        color: "rgb(15, 15, 30)",
        "high-color": "rgb(30, 30, 60)",
        "horizon-blend": 0.08,
        "space-color": "rgb(8, 8, 20)",
        "star-intensity": 0.6,
      });

      // Enable 3D terrain
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      // 3D buildings
      const layers = map.getStyle().layers;
      const labelLayerId = layers?.find(
        (l) => l.type === "symbol" && l.layout?.["text-field"]
      )?.id;

      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 12,
          paint: {
            "fill-extrusion-color": "#1e1b4b",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.6,
          },
        },
        labelLayerId
      );

      // Heatmap source
      map.addSource("mood-heat", {
        type: "geojson",
        data: buildGeoJSON(checkins),
      });

      // Heatmap layer — cool blues for calm, warm reds for stressed
      map.addLayer(
        {
          id: "mood-heatmap",
          type: "heatmap",
          source: "mood-heat",
          maxzoom: 16,
          paint: {
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8, 0.8,
              14, 2.5,
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8, 15,
              14, 40,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.15, "rgba(49,130,206,0.4)",
              0.3, "rgba(56,178,172,0.5)",
              0.45, "rgba(72,187,120,0.6)",
              0.6, "rgba(236,201,75,0.7)",
              0.75, "rgba(237,137,54,0.8)",
              0.9, "rgba(229,62,62,0.9)",
              1, "rgba(197,48,48,1)",
            ],
            "heatmap-opacity": 0.85,
          },
        },
        "3d-buildings"
      );

      // Circle layer for zoomed-in detail
      map.addLayer({
        id: "mood-points",
        type: "circle",
        source: "mood-heat",
        minzoom: 13,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            13, 5,
            18, 12,
          ],
          "circle-color": [
            "match",
            ["get", "mood"],
            "Happy", "#34d399",
            "Calm", "#60a5fa",
            "Neutral", "#a78bfa",
            "Stressed", "#fb923c",
            "Sad", "#818cf8",
            "Overwhelmed", "#f87171",
            "#999",
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.3)",
        },
      });

      // Popup on click
      map.on("click", "mood-points", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const { mood, message, timestamp } = f.properties as {
          mood: string;
          message: string;
          timestamp: string;
        };
        const icon = MOODS.find((m) => m.label === mood)?.icon ?? "";
        const time = new Date(timestamp).toLocaleString();
        new mapboxgl.Popup({ className: "dark-popup" })
          .setLngLat(f.geometry.coordinates as [number, number])
          .setHTML(
            `<div style="color:#e2e8f0;font-size:13px">
              <strong>${icon} ${mood}</strong>
              ${message ? `<p style="margin:4px 0 0;color:#94a3b8">${message}</p>` : ""}
              <p style="margin:4px 0 0;color:#64748b;font-size:11px">${time}</p>
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseenter", "mood-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "mood-points", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to city when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [city.lng, city.lat],
      zoom: 11.5,
      pitch: 55,
      bearing: -15,
      duration: 2000,
      essential: true,
    });
  }, [city]);

  // Update heatmap data when check-ins change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("mood-heat") as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData(buildGeoJSON(checkins));
    }
  }, [checkins, buildGeoJSON]);

  return (
    <div ref={containerRef} className="h-full w-full" />
  );
}
