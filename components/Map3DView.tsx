"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  CampusEmotionResponse,
  CheckIn,
  CityConfig,
  College,
  MOODS,
  Mood,
} from "@/lib/types";
import { buildPointGeoJSON } from "@/lib/gridAggregator";
import { buildCityMask } from "@/lib/cityMask";
import ResourceMarkers from "./ResourceMarkers";
import CampusLayer from "./CampusLayer";
import EmotionWeatherOverlay from "./EmotionWeatherOverlay";
import { getResourcesByCity } from "@/lib/store";
import { CAMPUSES } from "@/lib/campusDetection";
import { supabase } from "@/lib/supabase";
import AddSafeSpaceModal from "./AddSafeSpaceModal";
import { seedRealSafeSpaces } from "@/utils/seedSafeSpaces";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const CIRCLE_COLOR_STOPS = MOODS.flatMap((m) => [m.label, m.color]);

const CITIES_CONFIG: Record<string, { center: [number, number], bbox: string }> = {
  "San Antonio": {
    center: [-98.4936, 29.4241],
    bbox: "-98.8100,29.1800,-98.1500,29.6500"
  },
  "New York": {
    center: [-74.0060, 40.7128],
    bbox: "-74.2591,40.4774,-73.7002,40.9176"
  },
  "Philadelphia": {
    center: [-75.1652, 39.9526],
    bbox: "-75.2803,39.8670,-74.9558,40.1379"
  },
  "Dallas": {
    center: [-96.7970, 32.7767],
    bbox: "-97.0300,32.6000,-96.5500,33.0200"
  },
  "San Diego": {
    center: [-117.1611, 32.7157],
    bbox: "-117.3300,32.5300,-116.9000,33.0500"
  },
  "Jacksonville": {
    center: [-81.6557, 30.3322],
    bbox: "-82.0500,30.1000,-81.3000,30.6000"
  },
  "Charlottesville": {
    center: [-78.4767, 38.0293],
    bbox: "-78.5500,37.9800,-78.4000,38.0800"
  },
  "Los Angeles": {
    center: [-118.2437, 34.0522],
    bbox: "-118.6682,33.7037,-118.1553,34.3373"
  },
  "Chicago": {
    center: [-87.6298, 41.8781],
    bbox: "-87.9401,41.6443,-87.5240,42.0231"
  },
  "Houston": {
    center: [-95.3698, 29.7604],
    bbox: "-95.9000,29.5000,-95.0000,30.1500"
  },
  "Phoenix": {
    center: [-112.0740, 33.4484],
    bbox: "-112.4500,33.2500,-111.8000,33.7500"
  }
};

interface Map3DViewProps {
  checkins: CheckIn[];
  city: CityConfig;
  focusedCampus?: string;
  selectedMood?: Mood | null;
  campuses?: College[];
  registeredCollege?: College | null;
  campusInsights?: CampusEmotionResponse | null;
  focusRegisteredCampus?: boolean;
  isSpinning?: boolean;
  onToggleSpin?: (isSpinning: boolean) => void;
  onSeedSafeSpaces?: () => Promise<void>;
  isSeeding?: boolean;
}

// 1. Define the possible times
type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'All';

// 2. The Config Object (Atmosphere & Lighting)
const TIME_THEMES: Record<string, any> = {
  Morning: {
    fog: { "range": [0.5, 10], "color": "#fdf2f8", "high-color": "#fee2e2", "space-color": "#334155" },
    light: { "anchor": "viewport", "color": "#fafaf9", "intensity": 0.4 }
  },
  Afternoon: {
    fog: { "range": [0.8, 8], "color": "#f8fafc", "high-color": "#e0f2fe", "space-color": "#0ea5e9" },
    light: { "anchor": "viewport", "color": "#ffffff", "intensity": 0.5 }
  },
  Evening: {
    fog: { "range": [0.1, 12], "color": "#4c1d95", "high-color": "#f43f5e", "space-color": "#1e1b4b" },
    light: { "anchor": "viewport", "color": "#fb923c", "intensity": 0.3 }
  },
  Night: {
    fog: { "range": [-1, 1.5], "color": "#020617", "high-color": "#020617", "space-color": "#020617", "horizon-blend": 0.1 },
    light: { "anchor": "viewport", "color": "#1e293b", "intensity": 0.2 }
  },
  All: { fog: null, light: null }
};

export default function Map3DView({
  checkins,
  city,
  focusedCampus,
  selectedMood,
  campuses = [],
  registeredCollege = null,
  campusInsights = null,
  focusRegisteredCampus = false,
  isSpinning = false,
  onToggleSpin,
  onSeedSafeSpaces,
  isSeeding = false,
}: Map3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const spinFrameRef = useRef<number | null>(null);
  const [draftSafeSpace, setDraftSafeSpace] = useState<{ lat: number; lng: number } | null>(null);
  const safeSpacesRefetchRef = useRef<() => void>(() => { });
  const [isSeedingSpaces, setIsSeedingSpaces] = useState(false);
  const [selectedTime, setSelectedTime] = useState<TimeOfDay>('All');

  // 1. Store the original view so we can "Go Home"
  const cityConfig = CITIES_CONFIG[city.name] || CITIES_CONFIG["Philadelphia"];
  const INITIAL_VIEW = { longitude: cityConfig.center[0], latitude: cityConfig.center[1], zoom: 14 };
  
  // 2. New states for the Address Setup phase
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [fromAddress, setFromAddress] = useState("My Current Location");
  const [toAddress, setToAddress] = useState("");

  // Add this state to hold the path data
  const [quietRoute, setQuietRoute] = useState<any>(null);
  const [isRouting, setIsRouting] = useState(false);
  
  // NEW: State to hold the impressive HUD data!
  const [routeStats, setRouteStats] = useState<{
    eta: string; 
    distance: string; 
    nextTurn: string;
  } | null>(null);

  // 1. THE BULLETPROOF GEOCODING ENGINE
  const getCoordinates = async (address: string, cityName: string) => {
    const city = CITIES_CONFIG[cityName];
    
    if (!city) {
      console.error("Could not find city config for:", cityName);
      return null;
    }

    if (address === "My Current Location") return city.center;

    // We append the city and state to guarantee Mapbox knows exactly where to look
    const fullSearch = `${address}, ${cityName}`;

    try {
      // ATTEMPT 1: Strict Search inside the City Bounding Box (Fastest & most accurate)
      let response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullSearch)}.json?bbox=${city.bbox}&proximity=${city.center[0]},${city.center[1]}&limit=5&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      let data = await response.json();

      // ATTEMPT 2: The "Foundry" Fallback. 
      // If the strict box failed to find it, try a broader search around the city center.
      if (!data.features || data.features.length === 0) {
        console.log("Strict search failed, attempting broad POI search...");
        response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullSearch)}.json?proximity=${city.center[0]},${city.center[1]}&limit=5&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
        );
        data = await response.json();
      }

      // Return the coordinates of the absolute best match
      if (data.features && data.features.length > 0) {
        console.log("Successfully found:", data.features[0].place_name);
        return data.features[0].center;
      }

      return null;
    } catch (err) {
      console.error("Geocoding Error:", err);
      return null;
    }
  };

  // 2. THE MULTI-CITY ROUTING FUNCTION
  const getQuietRoute = async () => {
    setIsRouting(true);
    
    try {
      // THE FIX: Properly extract multi-word cities like "San Antonio" or "New York"
      // This looks at your CITIES_CONFIG keys and finds the exact match in your header text.
      const currentCityName = Object.keys(CITIES_CONFIG).find(key => 
        city.name.includes(key)
      ) || "Philadelphia"; 

      // Get Coordinates
      const start = await getCoordinates(fromAddress, currentCityName);
      const end = await getCoordinates(toAddress, currentCityName);

      if (!start || !end) {
        alert(`We couldn't locate that specific place in ${currentCityName}. Try adding "University" or "Street" to the name!`);
        return;
      }

      // Fetch the Walking Route
      const resp = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      const data = await resp.json();

      if (!data.routes || data.routes.length === 0) {
        alert(`No safe walking path could be found between those locations.`);
        return;
      }

      // Update the Map & Navigation HUD
      const route = data.routes[0];
      setQuietRoute({ type: 'Feature', geometry: route.geometry });
      setRouteStats({
        eta: `${Math.ceil(route.duration / 60)} min`,
        distance: `${(route.distance * 0.000621371).toFixed(1)} mi`,
        nextTurn: route.legs[0].steps[1]?.maneuver.instruction || "Proceed toward your destination"
      });

      // Fly camera to start position
      mapRef.current?.flyTo({ center: start as [number, number], zoom: 16, duration: 2000 });

    } catch (error) {
      console.error("Routing error:", error);
    } finally {
      setIsRouting(false);
    }
  };

  const handleEndNavigation = () => {
    console.log("Ending navigation..."); // Check your browser console to ensure this fires!
    
    // 1. Force clear all route states
    setQuietRoute(null);
    setRouteStats(null);
    setIsSettingUp(false);
    setToAddress("");
    setFromAddress("My Current Location");

    // 2. Safely find the city
    const currentCityName = Object.keys(CITIES_CONFIG).find(key => 
      city.name.includes(key)
    ) || "Philadelphia"; 

    const cityData = CITIES_CONFIG[currentCityName];

    // 3. Move the camera
    if (cityData && mapRef.current) {
      console.log("Flying to:", cityData.center);
      mapRef.current.flyTo({
        center: cityData.center,
        zoom: 13,
        pitch: 45,
        bearing: 0,
        duration: 2500, // Slightly longer, smoother flight
        essential: true
      });
    } else {
      console.error("Missing city data or mapRef is not attached!");
    }
  };

  // Memoised builders
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
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

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
        (l: any) => l.type === "symbol" && l.layout?.["text-field"]
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

      for (const layerId of ["mood-circles"]) {
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
    if (onToggleSpin) onToggleSpin(false);
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    // Stop any active rotation/animation immediately
    map.stop();

    const maskSrc = map.getSource("city-mask") as mapboxgl.GeoJSONSource | undefined;
    if (maskSrc) {
      maskSrc.setData(buildCityMask(city));
    }

    if (
      focusRegisteredCampus &&
      registeredCollege &&
      registeredCollege.city === city.name
    ) {
      setTimeout(() => {
        map.flyTo({
          center: [registeredCollege.longitude, registeredCollege.latitude],
          zoom: 15,
          pitch: 70,
          bearing: 0,
          duration: 2200,
          essential: true,
        });
      }, 50);
      return;
    }

    if (focusedCampus) {
      const collegeMatch = campuses.find((campus) => campus.name === focusedCampus);
      if (collegeMatch) {
        setTimeout(() => {
          map.flyTo({
            center: [collegeMatch.longitude, collegeMatch.latitude],
            zoom: 15,
            pitch: 70,
            bearing: 0,
            duration: 2200,
            essential: true,
          });
        }, 50);
        return;
      }

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
  }, [campuses, city, focusRegisteredCampus, focusedCampus, registeredCollege]);

  // ── Update mood data (both sources) ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (!Array.isArray(checkins)) return;

    const ptSrc = map.getSource("mood-points") as mapboxgl.GeoJSONSource | undefined;
    if (ptSrc) ptSrc.setData(pointData(checkins));
  }, [checkins, pointData]);

  // ── Apply Emotional Weather OR Time Theme (ADDITIVE / ISOLATED) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    // Cast to `any` because setRain/setSnow are newer Mapbox Standard APIs
    // not yet in the @types/mapbox-gl package
    const m = map as any;

    // ── Step 1: Always reset previous weather particles ──
    try { m.setRain(null); } catch { /* rain API not available in this GL version */ }
    try { m.setSnow(null); } catch { /* snow API not available in this GL version */ }

    // Overriding with TIME filter if active
    if (selectedTime !== 'All') {
      const theme = TIME_THEMES[selectedTime];
      if (theme.fog) {
        map.setFog(theme.fog);
      }
      if (theme.light && map.setLight) {
        try { map.setLight(theme.light); } catch {}
      }
      return; // Exit early so mood doesn't override time
    }

    // Otherwise apply mood-specific atmospheric profile
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
  }, [selectedMood, selectedTime]);

  // ── Cinematic Auto-Spin (ADDITIVE / ISOLATED) ──
  useEffect(() => {
    if (!isSpinning || !mapInstance) {
      if (spinFrameRef.current) {
        cancelAnimationFrame(spinFrameRef.current);
        spinFrameRef.current = null;
      }
      return;
    }

    function spin() {
      if (!mapInstance) return;
      mapInstance.rotateTo(mapInstance.getBearing() + 0.2, { duration: 0 });
      spinFrameRef.current = requestAnimationFrame(spin);
    }
    spinFrameRef.current = requestAnimationFrame(spin);

    return () => {
      if (spinFrameRef.current) {
        cancelAnimationFrame(spinFrameRef.current);
        spinFrameRef.current = null;
      }
    };
  }, [isSpinning, mapInstance]);

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

  // Draw the quiet route
  useEffect(() => {
    if (!mapInstance) return;

    if (!quietRoute) {
      // Force remove the layer and source if they exist
      if (mapInstance.getLayer("quiet-route-layer")) {
        mapInstance.removeLayer("quiet-route-layer");
      }
      if (mapInstance.getSource("quiet-route-source")) {
        mapInstance.removeSource("quiet-route-source");
      }
      return;
    }
    
    // Add source if doesn't exist
    if (!mapInstance.getSource("quiet-route-source")) {
      mapInstance.addSource("quiet-route-source", {
        type: "geojson",
        data: quietRoute
      });
      
      mapInstance.addLayer({
        id: "quiet-route-layer",
        type: "line",
        source: "quiet-route-source",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#8b5cf6", 
          "line-width": 6,
          "line-opacity": 0.8,
        }
      });
    } else {
      const source = mapInstance.getSource("quiet-route-source") as mapboxgl.GeoJSONSource;
      source.setData(quietRoute);
    }
    
    // Fly the camera to show the route
    const coordinates = quietRoute.geometry.coordinates;
    const bounds = coordinates.reduce((b: mapboxgl.LngLatBounds, coord: number[]) => {
      return b.extend(coord as [number, number]);
    }, new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));
    
    mapInstance.fitBounds(bounds, { padding: 100, duration: 2000 });
  }, [quietRoute, mapInstance]);

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      <EmotionWeatherOverlay map={mapInstance} checkins={checkins} />
      <ResourceMarkers map={mapInstance} resources={getResourcesByCity(city.name)} />
      <CampusLayer
        map={mapInstance}
        campuses={campuses}
        registeredCollege={registeredCollege}
        campusInsights={campusInsights}
      />

      {/* Safe Space Modal — shown on right-click */}
      {draftSafeSpace && (
        <AddSafeSpaceModal
          lat={draftSafeSpace.lat}
          lng={draftSafeSpace.lng}
          onClose={() => setDraftSafeSpace(null)}
          onAdded={() => safeSpacesRefetchRef.current()}
        />
      )}

      {/* UNIFIED WEATHER & TIME CONTROLS */}
      <div className="absolute bottom-[180px] left-8 z-50 flex flex-col gap-3 w-[260px] pointer-events-none">
        
        {/* THE EMOTIONAL WEATHER MODULE (The "Teal" Box) */}
        <div className="pointer-events-auto bg-teal-500/10 border border-teal-500/30 backdrop-blur-xl rounded-2xl p-4 shadow-2xl animate-in slide-in-from-left-4 duration-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-[0.2em]">
              Campus Sentiment
            </span>
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500/40"></span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <span className="text-2xl">⛈️</span>
             <div>
               <p className="text-sm font-bold text-neutral-50 leading-tight">
                 Thunderstorms Likely
               </p>
               <p className="text-[10px] text-teal-500/80 font-medium">
                 High stress levels detected near Temple Univ.
               </p>
             </div>
          </div>
        </div>

        {/* THE MAP LIGHTING CONTROLS (The Bottom Buttons) */}
        <div className="pointer-events-auto flex p-1 bg-neutral-900/90 border border-neutral-800 rounded-full backdrop-blur-md shadow-lg">
          {(['All', 'Morning', 'Afternoon', 'Evening', 'Night'] as TimeOfDay[]).map((time) => (
            <button
              key={time}
              onClick={() => setSelectedTime(time)}
              className={`flex-1 py-1.5 rounded-full text-[10px] font-bold tracking-tight transition-all ${
                selectedTime === time 
                  ? "bg-neutral-800 text-teal-400 shadow-inner" 
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-10 flex flex-col items-center justify-center pointer-events-none z-50">
        
        {/* STATE 1: IDLE BUTTON */}
        {!isSettingUp && !quietRoute && (
          <button
            onClick={() => setIsSettingUp(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full px-6 py-3 bg-neutral-900 border border-neutral-700 text-neutral-50 hover:border-violet-500/50 shadow-2xl backdrop-blur-md transition-all"
          >
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            <span className="font-semibold text-sm">Find Quiet Route</span>
          </button>
        )}

        {/* STATE 2: ADDRESS ENTRY BAR (Sleek & Horizontal) */}
        {isSettingUp && !quietRoute && (
          <div className="pointer-events-auto flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 p-2 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-300">
            <input 
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="From..."
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-neutral-200 w-40 focus:outline-none focus:border-violet-500/50"
            />
            <div className="text-neutral-600">→</div>
            <input 
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="To: (e.g. Founder's Garden)"
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-neutral-200 w-48 focus:outline-none focus:border-violet-500/50"
            />
            <button 
              onClick={getQuietRoute}
              className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-colors"
            >
              Go
            </button>
            <button onClick={() => setIsSettingUp(false)} className="text-neutral-500 hover:text-neutral-300 px-2 text-lg">×</button>
          </div>
        )}
      </div>

      {/* STATE 3: THE COMPACT ACTIVE HUD (Top of Screen) */}
      {quietRoute && (
        <div className="absolute top-6 inset-x-0 flex justify-center z-50 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-6 bg-neutral-900/80 border border-violet-500/30 backdrop-blur-md px-5 py-2.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-4 duration-500">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 border-r border-neutral-800 pr-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </span>
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Quiet Route</span>
            </div>

            {/* Stats Section */}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-neutral-50">{routeStats?.eta}</span>
              <span className="text-[10px] text-neutral-500 font-medium uppercase">{routeStats?.distance}</span>
            </div>

            {/* Instruction Section (The "Sleek" part) */}
            <div className="hidden md:flex items-center gap-2 text-xs text-neutral-300 font-medium max-w-[200px] truncate">
              <svg className="w-3 h-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              {routeStats?.nextTurn}
            </div>

            {/* End Button */}
            <button 
              onClick={(e) => {
                e.preventDefault(); // Prevents any weird page reloads
                handleEndNavigation();
              }} 
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors border border-red-500/20 z-50 pointer-events-auto"
            >
              End
            </button>
          </div>
        </div>
      )}
    </>
  );
}
