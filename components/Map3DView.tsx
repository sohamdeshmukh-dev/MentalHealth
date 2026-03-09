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
import { supabase } from "@/lib/supabase";
import AddSafeSpaceModal from "./AddSafeSpaceModal";
import { seedRealSafeSpaces } from "@/utils/seedSafeSpaces";

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
  const [draftSafeSpace, setDraftSafeSpace] = useState<{ lat: number; lng: number } | null>(null);
  const safeSpacesRefetchRef = useRef<() => void>(() => { });
  const [isSeedingSpaces, setIsSeedingSpaces] = useState(false);

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

      // Right-click to open draft modal
      map.on("contextmenu", (e) => {
        e.preventDefault();
        setDraftSafeSpace({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

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

  // ── Safe Spaces: Native WebGL layers (zero-drift, ADDITIVE / ISOLATED) ──

  // Inject dark popup CSS once
  if (typeof document !== "undefined" && !document.getElementById("safe-space-popup-style")) {
    const s = document.createElement("style");
    s.id = "safe-space-popup-style";
    s.textContent = `
      .safe-space-popup .mapboxgl-popup-content {
        background: #0f172a !important;
        border: 1px solid #1e293b !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.6) !important;
        padding: 16px !important;
        color: white !important;
      }
      .safe-space-popup .mapboxgl-popup-tip {
        border-top-color: #0f172a !important;
        border-bottom-color: #0f172a !important;
      }
      .safe-space-popup .mapboxgl-popup-close-button {
        color: #475569;
        font-size: 18px;
        padding: 4px 8px;
      }
      .safe-space-popup .mapboxgl-popup-close-button:hover {
        color: #f1f5f9;
        background: transparent;
      }
    `;
    document.head.appendChild(s);
  }

  function buildSafeSpaceGeoJSON(
    spaces: Array<{ id: string; name: string; category: string; lat: number; lng: number; tags: string[]; address?: string }>
  ): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: spaces.map((sp) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [sp.lng, sp.lat] },
        properties: {
          id: sp.id,
          name: sp.name,
          category: sp.category,
          tags: JSON.stringify(sp.tags ?? []),
          address: sp.address ?? "",
          lat: sp.lat,
          lng: sp.lng,
        },
      })),
    };
  }

  function renderSafeSpacesWebGL(
    spaces: Array<{ id: string; name: string; category: string; lat: number; lng: number; tags: string[]; address?: string }>
  ) {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    const geojson = buildSafeSpaceGeoJSON(spaces);

    // If source already exists, just update data
    const existing = map.getSource("safe-spaces-source") as mapboxgl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson);
      return;
    }

    // First time: add source + glow + core layers
    map.addSource("safe-spaces-source", { type: "geojson", data: geojson });

    // Glow layer (soft blurred circle behind core)
    map.addLayer({
      id: "safe-spaces-glow",
      type: "circle",
      source: "safe-spaces-source",
      paint: {
        "circle-radius": 22,
        "circle-color": [
          "match", ["get", "category"],
          "Parks", "#10b981",
          "Libraries", "#3b82f6",
          "Quiet Cafés", "#f59e0b",
          "Meditation Rooms", "#8b5cf6",
          "Campus Spaces", "#f97316",
          "#8b5cf6",
        ],
        "circle-blur": 0.8,
        "circle-opacity": 0.5,
      },
    });

    // Core layer (solid dot on top)
    map.addLayer({
      id: "safe-spaces-core",
      type: "circle",
      source: "safe-spaces-source",
      paint: {
        "circle-radius": 6,
        "circle-color": [
          "match", ["get", "category"],
          "Parks", "#34d399",
          "Libraries", "#60a5fa",
          "Quiet Cafés", "#fbbf24",
          "Meditation Rooms", "#a78bfa",
          "Campus Spaces", "#fb923c",
          "#a78bfa",
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Click → premium dark popup
    map.on("click", "safe-spaces-core", (e) => {
      const f = e.features?.[0];
      if (!f || f.geometry.type !== "Point") return;
      const coords = f.geometry.coordinates as [number, number];
      const { name, category, address, tags: rawTags, lat, lng } = f.properties as {
        name: string; category: string; address: string;
        tags: string; lat: number; lng: number;
      };

      let parsedTags: string[] = [];
      try { parsedTags = JSON.parse(rawTags); } catch { parsedTags = []; }

      new mapboxgl.Popup({
        className: "safe-space-popup",
        offset: 22,
        maxWidth: "300px",
        closeButton: true,
        closeOnClick: true,
      })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family:system-ui,sans-serif;">
            <div style="margin-bottom:12px;">
              <h3 style="color:#ffffff;font-weight:700;font-size:15px;margin:0;letter-spacing:-0.3px;line-height:1.3;">${name}</h3>
              <div style="display:inline-block;margin-top:6px;padding:2px 10px;background:rgba(52,211,153,0.15);color:#34d399;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-radius:9999px;border:1px solid rgba(52,211,153,0.3);">
                ${category}
              </div>
              ${address ? `<p style="color:#94a3b8;font-size:11px;margin:8px 0 0;line-height:1.5;">${address}</p>` : ""}
              ${parsedTags.length ? `<div style="margin-top:8px;">${parsedTags.map((t) => `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.35);color:#6ee7b7;font-size:10px;margin:2px;">${t}</span>`).join("")}</div>` : ""}
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #1e293b;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}"
                 target="_blank" rel="noopener noreferrer"
                 style="display:flex;align-items:center;justify-content:center;width:100%;background:#2563eb;color:#ffffff;font-size:11px;font-weight:600;padding:9px 16px;border-radius:8px;text-decoration:none;box-sizing:border-box;"
                 onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                Directions via Google Maps
              </a>
              <a href="http://maps.apple.com/?daddr=${lat},${lng}"
                 target="_blank" rel="noopener noreferrer"
                 style="display:flex;align-items:center;justify-content:center;width:100%;background:#334155;color:#ffffff;font-size:11px;font-weight:600;padding:9px 16px;border-radius:8px;text-decoration:none;box-sizing:border-box;"
                 onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#334155'">
                Directions via Apple Maps
              </a>
            </div>
          </div>`)
        .addTo(mapRef.current!);
    });

    // Cursor UX
    map.on("mouseenter", "safe-spaces-core", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "safe-spaces-core", () => { map.getCanvas().style.cursor = ""; });
  }

  function fetchAndRenderSafeSpaces() {
    supabase
      .from("safe_spaces")
      .select("*")
      .then(({ data }) => {
        if (data) renderSafeSpacesWebGL(data);
      });
  }

  // Store refetch fn accessible to the modal
  safeSpacesRefetchRef.current = fetchAndRenderSafeSpaces;

  useEffect(() => {
    if (!readyRef.current) {
      const id = setInterval(() => {
        if (readyRef.current) {
          clearInterval(id);
          fetchAndRenderSafeSpaces();
        }
      }, 300);
      return () => clearInterval(id);
    }
    fetchAndRenderSafeSpaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      <MoodHeatmap map={mapInstance} checkins={checkins} selectedCity={city.name} />
      <ResourceMarkers map={mapInstance} resources={getResourcesByCity(city.name)} />

      {/* Safe Space Modal — shown on right-click */}
      {draftSafeSpace && (
        <AddSafeSpaceModal
          lat={draftSafeSpace.lat}
          lng={draftSafeSpace.lng}
          onClose={() => setDraftSafeSpace(null)}
          onAdded={() => safeSpacesRefetchRef.current()}
        />
      )}

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

      {/* Seed Safe Spaces Button */}
      <button
        onClick={async () => {
          setIsSeedingSpaces(true);
          await seedRealSafeSpaces();
          fetchAndRenderSafeSpaces();
          setIsSeedingSpaces(false);
        }}
        disabled={isSeedingSpaces}
        style={{
          position: "absolute",
          bottom: 170,
          right: 16,
          zIndex: 10,
          padding: "8px 14px",
          borderRadius: 9999,
          border: "1px solid rgba(52,211,153,0.4)",
          background: "rgba(15,23,42,0.85)",
          color: isSeedingSpaces ? "#6ee7b7" : "#34d399",
          fontSize: 12,
          fontWeight: 600,
          cursor: isSeedingSpaces ? "not-allowed" : "pointer",
          backdropFilter: "blur(12px)",
          transition: "all 0.2s ease",
          opacity: isSeedingSpaces ? 0.6 : 1,
        }}
      >
        {isSeedingSpaces ? "Seeding..." : "🌿 Seed Safe Spaces"}
      </button>
    </>
  );
}
