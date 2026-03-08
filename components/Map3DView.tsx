"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CheckIn, MOODS, CityConfig } from "@/lib/types";
import { buildSkylineGeoJSON, buildPointGeoJSON } from "@/lib/gridAggregator";
import { buildCityMask } from "@/lib/cityMask";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface Map3DViewProps {
  checkins: CheckIn[];
  city: CityConfig;
}

export default function Map3DView({ checkins, city }: Map3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);

  // Memoised builders
  const skylineData = useCallback(
    (d: CheckIn[]) => buildSkylineGeoJSON(d),
    []
  );
  const pointData = useCallback(
    (d: CheckIn[]) => buildPointGeoJSON(d),
    []
  );

  // ── Initialise map ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/soso593/cmmh6jzoe003m01qn8f00gog6",
      center: [city.lng, city.lat],
      zoom: 12,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    map.on("style.load", () => {
      // ── Terrain ──────────────────────────────────────────────
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      map.setFog({
        color: "rgba(240, 240, 255, 0.9)",
        "high-color": "rgba(200, 210, 240, 0.8)",
        "horizon-blend": 0.12,
        "space-color": "rgba(220, 230, 250, 1)",
        "star-intensity": 0.0,
      });

      // ── City mask ────────────────────────────────────────────
      map.addSource("city-mask", {
        type: "geojson",
        data: buildCityMask(city),
      });

      map.addLayer({
        id: "city-mask-fill",
        type: "fill",
        source: "city-mask",
        paint: {
          "fill-color": "#e8e6f0",
          "fill-opacity": 0.72,
        },
      });

      map.addLayer({
        id: "city-mask-border",
        type: "line",
        source: "city-mask",
        paint: {
          "line-color": "rgba(99, 102, 241, 0.25)",
          "line-width": 2,
          "line-blur": 4,
        },
      });

      // ── 3D buildings ─────────────────────────────────────────
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
          minzoom: 13,
          paint: {
            "fill-extrusion-color": "#c7c3d4",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.35,
          },
        },
        labelLayerId
      );

      // ── Point source (for heatmap + circle layers) ──────────
      map.addSource("mood-points", {
        type: "geojson",
        data: pointData(checkins),
      });

      // ── Skyline source (polygon grid cells) ─────────────────
      map.addSource("mood-skyline", {
        type: "geojson",
        data: skylineData(checkins),
      });

      // ── Heatmap layer (ground glow) ─────────────────────────
      map.addLayer(
        {
          id: "mood-heatmap",
          type: "heatmap",
          source: "mood-points",
          maxzoom: 16,
          paint: {
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": [
              "interpolate", ["linear"], ["zoom"],
              8, 0.8,
              13, 2.5,
            ],
            "heatmap-radius": [
              "interpolate", ["linear"], ["zoom"],
              8, 25,
              13, 50,
            ],
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0,    "rgba(0,0,0,0)",
              0.1,  "rgba(96,165,250,0.35)",
              0.25, "rgba(52,211,153,0.4)",
              0.4,  "rgba(167,139,250,0.45)",
              0.55, "rgba(251,191,36,0.55)",
              0.7,  "rgba(251,146,60,0.65)",
              0.85, "rgba(239,68,68,0.75)",
              1,    "rgba(220,38,38,0.85)",
            ],
            "heatmap-opacity": [
              "interpolate", ["linear"], ["zoom"],
              10, 0.8,
              15, 0.5,
            ],
          },
        },
        "3d-buildings"
      );

      // ── Skyline extrusions (polygon grid → 3D columns) ──────
      map.addLayer(
        {
          id: "skyline-extrusions",
          type: "fill-extrusion",
          source: "mood-skyline",
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "weight"],
              0.0,  "#60a5fa",
              0.15, "#34d399",
              0.35, "#a78bfa",
              0.5,  "#fbbf24",
              0.65, "#fb923c",
              0.8,  "#ef4444",
              1.0,  "#dc2626",
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.82,
          },
        },
        labelLayerId
      );

      // ── Circle detail at high zoom ───────────────────────────
      map.addLayer({
        id: "mood-circles",
        type: "circle",
        source: "mood-points",
        minzoom: 14,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 3, 18, 8],
          "circle-color": [
            "match", ["get", "mood"],
            "Happy", "#34d399",
            "Calm", "#60a5fa",
            "Neutral", "#a78bfa",
            "Stressed", "#fb923c",
            "Sad", "#818cf8",
            "Overwhelmed", "#f87171",
            "#999",
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.5)",
        },
      });

      // ── Popups ───────────────────────────────────────────────
      map.on("click", "skyline-extrusions", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const { mood, count, weight } = f.properties as {
          mood: string; count: number; weight: number;
        };
        const icon = MOODS.find((m) => m.label === mood)?.icon ?? "";
        const stressLevel = Math.round(weight * 100);
        new mapboxgl.Popup({ className: "light-popup", offset: 12 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:13px;color:#1e293b">
              <strong>${icon} ${mood}</strong>
              <p style="margin:4px 0 0;color:#64748b">${count} report${count > 1 ? "s" : ""} &middot; ${stressLevel}% stress</p>
            </div>`
          )
          .addTo(map);
      });

      map.on("click", "mood-circles", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const { mood, message, timestamp } = f.properties as {
          mood: string; message: string; timestamp: string;
        };
        const icon = MOODS.find((m) => m.label === mood)?.icon ?? "";
        const time = new Date(timestamp).toLocaleString();
        new mapboxgl.Popup({ className: "light-popup", offset: 12 })
          .setLngLat(f.geometry.coordinates as [number, number])
          .setHTML(
            `<div style="font-size:13px;color:#1e293b">
              <strong>${icon} ${mood}</strong>
              ${message ? `<p style="margin:4px 0 0;color:#64748b">${message}</p>` : ""}
              <p style="margin:4px 0 0;color:#94a3b8;font-size:11px">${time}</p>
            </div>`
          )
          .addTo(map);
      });

      for (const layerId of ["skyline-extrusions", "mood-circles"]) {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      readyRef.current = true;
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; readyRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fly to city + update mask ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    map.flyTo({
      center: [city.lng, city.lat],
      zoom: 12,
      pitch: 60,
      bearing: -20,
      duration: 2200,
      essential: true,
    });

    const maskSrc = map.getSource("city-mask") as mapboxgl.GeoJSONSource | undefined;
    if (maskSrc) maskSrc.setData(buildCityMask(city));
  }, [city]);

  // ── Update mood data (both sources) ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    const ptSrc = map.getSource("mood-points") as mapboxgl.GeoJSONSource | undefined;
    if (ptSrc) ptSrc.setData(pointData(checkins));

    const skySrc = map.getSource("mood-skyline") as mapboxgl.GeoJSONSource | undefined;
    if (skySrc) skySrc.setData(skylineData(checkins));
  }, [checkins, pointData, skylineData]);

  return <div ref={containerRef} className="h-full w-full" />;
}
