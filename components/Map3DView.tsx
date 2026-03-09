"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CheckIn, MOODS, CityConfig, Mood } from "@/lib/types";
import { buildSkylineGeoJSON, buildPointGeoJSON } from "@/lib/gridAggregator";
import { buildCityMask } from "@/lib/cityMask";
import MoodHeatmap from "./MoodHeatmap";
import ResourceMarkers from "./ResourceMarkers";
import { getResourcesByCity } from "@/lib/store";
import { CAMPUSES } from "@/lib/campusDetection";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const MOODS_BY_STRESS = [...MOODS].sort((a, b) => a.weight - b.weight);

const HEATMAP_ALPHA: Record<Mood, number> = {
  Calm: 0.35,
  Happy: 0.4,
  Neutral: 0.45,
  Sad: 0.55,
  Overwhelmed: 0.65,
  Stressed: 0.78,
};

function hexToRgba(hex: string, alpha: number) {
  const sanitized = hex.replace("#", "");
  if (sanitized.length !== 6) return `rgba(148,163,184,${alpha})`;
  const r = Number.parseInt(sanitized.slice(0, 2), 16);
  const g = Number.parseInt(sanitized.slice(2, 4), 16);
  const b = Number.parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const HEATMAP_COLOR_STOPS = MOODS_BY_STRESS.flatMap((m) => [
  m.weight,
  hexToRgba(m.color, HEATMAP_ALPHA[m.label]),
]);

const SKYLINE_COLOR_STOPS = MOODS_BY_STRESS.flatMap((m) => [m.weight, m.color]);
const CIRCLE_COLOR_STOPS = MOODS.flatMap((m) => [m.label, m.color]);

interface Map3DViewProps {
  checkins: CheckIn[];
  city: CityConfig;
  focusedCampus?: string;
  selectedMood?: Mood | null;
}

export default function Map3DView({ checkins, city, focusedCampus, selectedMood }: Map3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinFrameRef = useRef<number | null>(null);

  // Memoised builders
  const skylineData = useCallback(
    (d: CheckIn[]) => buildSkylineGeoJSON(d),
    []
  );
  const pointData = useCallback(
    (d: CheckIn[]) => {
      if (!Array.isArray(d) || d.length === 0) {
        return { type: "FeatureCollection" as const, features: [] };
      }
      return buildPointGeoJSON(d);
    },
    []
  );

  // ── Initialise map ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/soso593/cmmh6jzoe003m01qn8f00gog6",
      center: [city.lng, city.lat],
      zoom: 14,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");

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
        color: "rgba(12, 18, 34, 0.95)",
        "high-color": "rgba(15, 23, 42, 0.85)",
        "horizon-blend": 0.18,
        "space-color": "rgba(2, 6, 23, 1)",
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
          "fill-color": "#0f172a",
          "fill-opacity": 0.58,
        },
      });

      map.addLayer({
        id: "city-mask-border",
        type: "line",
        source: "city-mask",
        paint: {
          "line-color": "rgba(129, 140, 248, 0.32)",
          "line-width": 2,
          "line-blur": 4,
        },
      });

      // ── 3D buildings ─────────────────────────────────────────
      const layers = map.getStyle().layers;
      const labelLayerId = layers?.find(
        (l) => l.type === "symbol" && l.layout?.["text-field"]
      )?.id;

      const add3DBuildings = () => {
        if (!map.getSource("composite")) return;
        if (map.getLayer("3d-buildings")) return;

        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 13,
            paint: {
              "fill-extrusion-color": "#2a2a2a",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.8,
            },
          },
          labelLayerId
        );
      };

      const waitForSource = (m: mapboxgl.Map, sourceId: string, cb: () => void) => {
        if (m.getSource(sourceId)) {
          cb();
        } else {
          m.once("sourcedata", () => waitForSource(m, sourceId, cb));
        }
      };

      waitForSource(map, "composite", add3DBuildings);

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
              ...SKYLINE_COLOR_STOPS,
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.78,
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
            ...CIRCLE_COLOR_STOPS,
            "#94a3b8",
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(241,245,249,0.45)",
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
        new mapboxgl.Popup({ className: "dark-popup", offset: 12 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:13px;color:#f1f5f9">
              <strong>${icon} ${mood}</strong>
              <p style="margin:4px 0 0;color:#94a3b8">${count} report${count > 1 ? "s" : ""} &middot; ${stressLevel}% stress</p>
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
        new mapboxgl.Popup({ className: "dark-popup", offset: 12 })
          .setLngLat(f.geometry.coordinates as [number, number])
          .setHTML(
            `<div style="font-size:13px;color:#f1f5f9">
              <strong>${icon} ${mood}</strong>
              ${message ? `<p style="margin:4px 0 0;color:#cbd5e1">${message}</p>` : ""}
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
    setMapInstance(map);
    return () => { map.remove(); mapRef.current = null; setMapInstance(null); readyRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fly to city + update mask ────────────────────────────────
  useEffect(() => {
    setIsSpinning(false);
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    // Stop any active rotation/animation immediately
    map.stop();

    if (focusedCampus) {
      const campus = CAMPUSES.find((c) => c.name === focusedCampus);
      if (campus) {
        setTimeout(() => {
          map.flyTo({
            center: [campus.lng, campus.lat],
            zoom: 15,
            pitch: 70,
            bearing: 0,
            duration: 2200,
            essential: true,
          });
        }, 50);
        return;
      }
    }

    setTimeout(() => {
      map.flyTo({
        center: [city.lng, city.lat],
        zoom: 12,
        pitch: 60,
        bearing: -20,
        duration: 2200,
        essential: true,
      });
    }, 50);

    const maskSrc = map.getSource("city-mask") as mapboxgl.GeoJSONSource | undefined;
    if (maskSrc) maskSrc.setData(buildCityMask(city));
  }, [city, focusedCampus]);

  // ── Update mood data (both sources) ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (!Array.isArray(checkins)) return;

    const ptSrc = map.getSource("mood-points") as mapboxgl.GeoJSONSource | undefined;
    if (ptSrc) ptSrc.setData(pointData(checkins));

    const skySrc = map.getSource("mood-skyline") as mapboxgl.GeoJSONSource | undefined;
    if (skySrc) skySrc.setData(skylineData(checkins));
  }, [checkins, pointData, skylineData]);

  // ── 3D Emotional Weather: Native Mapbox Rain/Snow/Fog (ADDITIVE / ISOLATED) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    // Cast to `any` because setRain/setSnow are newer Mapbox Standard APIs
    // not yet in the @types/mapbox-gl package
    const m = map as any;

    // ── Step 1: Always reset previous weather particles ──
    try { m.setRain(null); } catch { /* rain API not available in this GL version */ }
    try { m.setSnow(null); } catch { /* snow API not available in this GL version */ }

    // ── Step 2: Apply mood-specific atmospheric profile ──
    switch (selectedMood) {
      case "Sad":
        // Cinematic rainstorm
        try {
          m.setRain({
            density: 0.8,
            intensity: 0.9,
            color: "#7a8b99",
            opacity: 0.8,
            "droplet-size": [1.5, 30],
          });
        } catch { /* graceful fallback */ }
        map.setFog({
          color: "#1a2b3c",
          "high-color": "#000000",
          "horizon-blend": 0.2,
          "space-color": "#000811",
          "star-intensity": 0.0,
        });
        break;

      case "Overwhelmed":
        // Red ash blizzard (hacked snow API)
        try {
          m.setSnow({
            density: 0.9,
            intensity: 1.0,
            color: "#ff4d4d",
            opacity: 0.8,
            direction: [45, 70],
            "center-thinning": 0.1,
          });
        } catch { /* graceful fallback */ }
        map.setFog({
          color: "#330000",
          "high-color": "#110000",
          "horizon-blend": 0.1,
          "space-color": "#0d0000",
          "star-intensity": 0.0,
        });
        break;

      case "Stressed":
        // Oppressive, suffocating haze — no particles
        map.setFog({
          color: "#8b4513",
          "high-color": "#3e1a05",
          "horizon-blend": 0.05,
          "space-color": "#1a0800",
          "star-intensity": 0.0,
        });
        break;

      case "Happy":
        // Golden hour glow
        map.setFog({
          color: "#ffd700",
          "high-color": "#ff8c00",
          "space-color": "#ffecd2",
          "horizon-blend": 0.3,
          "star-intensity": 0.0,
        });
        break;

      case "Calm":
        // Clear starlit night
        map.setFog({
          color: "#001f3f",
          "high-color": "#000000",
          "star-intensity": 1.0,
          "horizon-blend": 0.4,
          "space-color": "rgba(2, 6, 23, 1)",
        });
        break;

      default:
        // Neutral / null — standard dark fog
        map.setFog({
          color: "#242b3b",
          "high-color": "#0b0f17",
          "horizon-blend": 0.18,
          "space-color": "rgba(2, 6, 23, 1)",
          "star-intensity": 0.0,
        });
        break;
    }
  }, [selectedMood]);

  // ── Cinematic Auto-Spin (ADDITIVE / ISOLATED) ──
  useEffect(() => {
    if (!isSpinning || !mapRef.current) {
      if (spinFrameRef.current) {
        cancelAnimationFrame(spinFrameRef.current);
        spinFrameRef.current = null;
      }
      return;
    }

    function spin() {
      if (!mapRef.current) return;
      mapRef.current.rotateTo(mapRef.current.getBearing() + 0.2, { duration: 0 });
      spinFrameRef.current = requestAnimationFrame(spin);
    }
    spinFrameRef.current = requestAnimationFrame(spin);

    return () => {
      if (spinFrameRef.current) {
        cancelAnimationFrame(spinFrameRef.current);
        spinFrameRef.current = null;
      }
    };
  }, [isSpinning]);

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      <MoodHeatmap map={mapInstance} checkins={checkins} selectedCity={city.name} />
      <ResourceMarkers map={mapInstance} resources={getResourcesByCity(city.name)} />

      {/* Cinematic Spin Toggle */}
      <button
        onClick={() => setIsSpinning((s) => !s)}
        style={{
          position: "absolute",
          bottom: 130,
          right: 16,
          zIndex: 10,
          padding: "8px 14px",
          borderRadius: 9999,
          border: isSpinning ? "1px solid rgba(129,140,248,0.6)" : "1px solid rgba(100,116,139,0.4)",
          background: isSpinning ? "rgba(99,102,241,0.25)" : "rgba(15,23,42,0.85)",
          color: isSpinning ? "#a5b4fc" : "#94a3b8",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          transition: "all 0.2s ease",
        }}
      >
        {isSpinning ? "⏸ Stop" : "🔄 Cinematic"}
      </button>
    </>
  );
}
