"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import circle from "@turf/circle";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { CampusEmotionResponse, College } from "@/lib/types";

interface CampusLayerProps {
  map: mapboxgl.Map | null;
  campuses: College[];
  registeredCollege: College | null;
  campusInsights: CampusEmotionResponse | null;
}

const CAMPUS_MARKER_SOURCE = "campus-marker-source";
const CAMPUS_OVERLAY_SOURCE = "campus-overlay-source";
const CAMPUS_HEAT_SOURCE = "campus-heat-source";

const CAMPUS_HEAT_LAYER = "campus-heat-layer";
const CAMPUS_OVERLAY_FILL_LAYER = "campus-overlay-fill-layer";
const CAMPUS_OVERLAY_OUTLINE_LAYER = "campus-overlay-outline-layer";
const CAMPUS_MARKER_GLOW_LAYER = "campus-marker-glow-layer";
const CAMPUS_MARKER_CORE_LAYER = "campus-marker-core-layer";

function buildCampusMarkerGeoJSON(campuses: College[], registeredCollegeId: string | null) {
  const features: Feature<Point>[] = campuses.map((campus) => ({
    type: "Feature",
    id: campus.id,
    properties: {
      id: campus.id,
      name: campus.name,
      city: campus.city,
      radius_km: campus.campus_radius,
      is_registered: registeredCollegeId === campus.id ? 1 : 0,
    },
    geometry: {
      type: "Point",
      coordinates: [campus.longitude, campus.latitude],
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  } as FeatureCollection<Point>;
}

function buildCampusOverlayGeoJSON(campuses: College[], registeredCollegeId: string | null) {
  const features: Feature<Polygon>[] = campuses.map((campus) => {
    const radiusKm = Math.max(campus.campus_radius || 1.2, 0.6);
    const polygon = circle([campus.longitude, campus.latitude], radiusKm, {
      units: "kilometers",
      steps: 50,
    });

    return {
      type: "Feature",
      id: campus.id,
      properties: {
        id: campus.id,
        name: campus.name,
        city: campus.city,
        radius_km: radiusKm,
        is_registered: registeredCollegeId === campus.id ? 1 : 0,
      },
      geometry: polygon.geometry,
    };
  });

  return {
    type: "FeatureCollection",
    features,
  } as FeatureCollection<Polygon>;
}

function buildCampusHeatGeoJSON(
  campuses: College[],
  registeredCollege: College | null,
  campusInsights: CampusEmotionResponse | null
) {
  const isCampusVisible = !!registeredCollege && campuses.some((campus) => campus.id === registeredCollege.id);
  if (!isCampusVisible || !campusInsights || campusInsights.redacted) {
    return {
      type: "FeatureCollection",
      features: [],
    } as FeatureCollection<Point>;
  }

  const features: Feature<Point>[] = (campusInsights.heatmap_points ?? []).map((point, index) => ({
    type: "Feature",
    id: `${campusInsights.college_id}-heat-${index}`,
    properties: {
      weight: point.weight,
      mood: point.mood,
      intensity: point.intensity,
    },
    geometry: {
      type: "Point",
      coordinates: [point.lng, point.lat],
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  } as FeatureCollection<Point>;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatScore(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function buildCampusInsightHtml(college: College, insights: CampusEmotionResponse | null) {
  if (!insights) {
    return `<div style="font-size:12px;color:#e2e8f0;min-width:240px">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Campus Insight</div>
      <div style="margin-top:6px;font-size:14px;font-weight:700;color:#f8fafc">${escapeHtml(college.name)}</div>
      <p style="margin:8px 0 0;color:#94a3b8">No aggregated campus data yet.</p>
    </div>`;
  }

  if (insights.redacted) {
    return `<div style="font-size:12px;color:#e2e8f0;min-width:250px">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Campus Insight</div>
      <div style="margin-top:6px;font-size:14px;font-weight:700;color:#f8fafc">${escapeHtml(insights.college_name)}</div>
      <p style="margin:8px 0 0;color:#94a3b8">Data is anonymized and only appears once at least ${insights.min_participants_required} students are active on campus.</p>
      <p style="margin:6px 0 0;color:#cbd5e1">Current participants: <strong>${insights.participant_count}</strong></p>
    </div>`;
  }

  const topEmotions = insights.top_reported_emotions
    .map((emotion) => `${escapeHtml(emotion.emotion)} (${emotion.share.toFixed(1)}%)`)
    .join(" • ");

  const distributionRows = insights.emotion_distribution
    .filter((emotion) => emotion.count > 0)
    .slice(0, 4)
    .map(
      (emotion) => `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:4px">
        <span style="color:#cbd5e1">${escapeHtml(emotion.emotion)}</span>
        <span style="color:#f8fafc;font-weight:600">${emotion.count}</span>
      </div>`
    )
    .join("");

  const recent = insights.recent_mood_trends;

  return `<div style="font-size:12px;color:#e2e8f0;min-width:280px;line-height:1.45">
    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Campus Insight</div>
    <div style="margin-top:6px;font-size:14px;font-weight:700;color:#f8fafc">${escapeHtml(insights.college_name)}</div>
    <p style="margin:6px 0 0;color:#94a3b8">${escapeHtml(insights.city)} • ${insights.participant_count} students</p>

    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(148,163,184,0.25)">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Top Emotions</div>
      <p style="margin:4px 0 0;color:#e2e8f0">${topEmotions || "No check-ins yet"}</p>
      <div style="margin-top:6px">${distributionRows || '<span style="color:#94a3b8">No distribution data</span>'}</div>
    </div>

    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(148,163,184,0.25)">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Recent Trends</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px">
        <div style="padding:6px;border-radius:8px;background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.2)">
          <div style="font-size:10px;color:#94a3b8">Today</div>
          <div style="font-weight:700;color:#f8fafc">${recent ? formatScore(recent.today.average_score) : "--"}</div>
        </div>
        <div style="padding:6px;border-radius:8px;background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.2)">
          <div style="font-size:10px;color:#94a3b8">Week</div>
          <div style="font-weight:700;color:#f8fafc">${recent ? formatScore(recent.week.average_score) : "--"}</div>
        </div>
        <div style="padding:6px;border-radius:8px;background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.2)">
          <div style="font-size:10px;color:#94a3b8">Month</div>
          <div style="font-weight:700;color:#f8fafc">${recent ? formatScore(recent.month.average_score) : "--"}</div>
        </div>
      </div>
    </div>

    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(148,163,184,0.25)">
      <div style="display:flex;justify-content:space-between;gap:12px">
        <span style="color:#94a3b8">Total Check-ins</span>
        <strong style="color:#f8fafc">${insights.checkin_count}</strong>
      </div>
    </div>
  </div>`;
}

export default function CampusLayer({ map, campuses, registeredCollege, campusInsights }: CampusLayerProps) {
  const hoverRef = useRef<string | number | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const campusesRef = useRef<College[]>([]);
  const insightsRef = useRef<CampusEmotionResponse | null>(null);

  const markerGeoJSON = useMemo(
    () => buildCampusMarkerGeoJSON(campuses, registeredCollege?.id ?? null),
    [campuses, registeredCollege?.id]
  );

  const overlayGeoJSON = useMemo(
    () => buildCampusOverlayGeoJSON(campuses, registeredCollege?.id ?? null),
    [campuses, registeredCollege?.id]
  );

  const heatGeoJSON = useMemo(
    () => buildCampusHeatGeoJSON(campuses, registeredCollege, campusInsights),
    [campuses, registeredCollege, campusInsights]
  );

  const updateSources = useCallback(() => {
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const markerSource = map.getSource(CAMPUS_MARKER_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (markerSource) {
      markerSource.setData(markerGeoJSON);
    }

    const overlaySource = map.getSource(CAMPUS_OVERLAY_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (overlaySource) {
      overlaySource.setData(overlayGeoJSON);
    }

    const heatSource = map.getSource(CAMPUS_HEAT_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (heatSource) {
      heatSource.setData(heatGeoJSON);
    }
  }, [heatGeoJSON, map, markerGeoJSON, overlayGeoJSON]);

  useEffect(() => {
    campusesRef.current = campuses;
  }, [campuses]);

  useEffect(() => {
    insightsRef.current = campusInsights;
  }, [campusInsights]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const setup = () => {
      if (!map.getSource(CAMPUS_MARKER_SOURCE)) {
        map.addSource(CAMPUS_MARKER_SOURCE, {
          type: "geojson",
          data: markerGeoJSON,
        });
      }

      if (!map.getSource(CAMPUS_OVERLAY_SOURCE)) {
        map.addSource(CAMPUS_OVERLAY_SOURCE, {
          type: "geojson",
          data: overlayGeoJSON,
        });
      }

      if (!map.getSource(CAMPUS_HEAT_SOURCE)) {
        map.addSource(CAMPUS_HEAT_SOURCE, {
          type: "geojson",
          data: heatGeoJSON,
        });
      }

      if (!map.getLayer(CAMPUS_OVERLAY_FILL_LAYER)) {
        map.addLayer({
          id: CAMPUS_OVERLAY_FILL_LAYER,
          type: "fill",
          source: CAMPUS_OVERLAY_SOURCE,
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "is_registered"], 1],
              "rgba(45, 212, 191, 0.45)",
              "rgba(59, 130, 246, 0.28)",
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              ["case", ["==", ["get", "is_registered"], 1], 0.26, 0.2],
              ["case", ["==", ["get", "is_registered"], 1], 0.16, 0.11],
            ],
          },
        });
      }

      if (!map.getLayer(CAMPUS_OVERLAY_OUTLINE_LAYER)) {
        map.addLayer({
          id: CAMPUS_OVERLAY_OUTLINE_LAYER,
          type: "line",
          source: CAMPUS_OVERLAY_SOURCE,
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "is_registered"], 1],
              "rgba(45, 212, 191, 0.85)",
              "rgba(147, 197, 253, 0.55)",
            ],
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              ["case", ["==", ["get", "is_registered"], 1], 3, 2.3],
              ["case", ["==", ["get", "is_registered"], 1], 2.2, 1.5],
            ],
            "line-opacity": 0.75,
            "line-blur": 0.3,
          },
        });
      }

      if (!map.getLayer(CAMPUS_HEAT_LAYER)) {
        map.addLayer({
          id: CAMPUS_HEAT_LAYER,
          type: "heatmap",
          source: CAMPUS_HEAT_SOURCE,
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "weight"],
              0, 0,
              1, 1,
            ],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 15, 1.5],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(45,212,191,0)",
              0.2, "rgba(59,130,246,0.36)",
              0.4, "rgba(16,185,129,0.5)",
              0.65, "rgba(251,191,36,0.6)",
              1, "rgba(239,68,68,0.75)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 11, 18, 16, 52],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.3, 16, 0.6],
          },
        });
      }

      if (!map.getLayer(CAMPUS_MARKER_GLOW_LAYER)) {
        map.addLayer({
          id: CAMPUS_MARKER_GLOW_LAYER,
          type: "circle",
          source: CAMPUS_MARKER_SOURCE,
          paint: {
            "circle-color": [
              "case",
              ["==", ["get", "is_registered"], 1],
              "rgba(45,212,191,0.65)",
              "rgba(59,130,246,0.58)",
            ],
            "circle-radius": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              ["case", ["==", ["get", "is_registered"], 1], 26, 20],
              ["case", ["==", ["get", "is_registered"], 1], 18, 14],
            ],
            "circle-blur": 0.75,
            "circle-opacity": 0.62,
          },
        });
      }

      if (!map.getLayer(CAMPUS_MARKER_CORE_LAYER)) {
        map.addLayer({
          id: CAMPUS_MARKER_CORE_LAYER,
          type: "circle",
          source: CAMPUS_MARKER_SOURCE,
          paint: {
            "circle-color": [
              "case",
              ["==", ["get", "is_registered"], 1],
              "#14b8a6",
              "#60a5fa",
            ],
            "circle-radius": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              ["case", ["==", ["get", "is_registered"], 1], 11, 9],
              ["case", ["==", ["get", "is_registered"], 1], 8, 6.5],
            ],
            "circle-stroke-color": "rgba(241,245,249,0.8)",
            "circle-stroke-width": ["case", ["==", ["get", "is_registered"], 1], 2.2, 1.6],
            "circle-opacity": 0.96,
          },
        });
      }

      map.on("mouseenter", CAMPUS_MARKER_CORE_LAYER, (event) => {
        map.getCanvas().style.cursor = "pointer";
        const hoveredFeatureId = event.features?.[0]?.id;

        if (hoverRef.current !== null) {
          map.setFeatureState({ source: CAMPUS_MARKER_SOURCE, id: hoverRef.current }, { hover: false });
          map.setFeatureState({ source: CAMPUS_OVERLAY_SOURCE, id: hoverRef.current }, { hover: false });
        }

        if (hoveredFeatureId !== undefined) {
          hoverRef.current = hoveredFeatureId;
          map.setFeatureState({ source: CAMPUS_MARKER_SOURCE, id: hoveredFeatureId }, { hover: true });
          map.setFeatureState({ source: CAMPUS_OVERLAY_SOURCE, id: hoveredFeatureId }, { hover: true });
        }
      });

      map.on("mouseleave", CAMPUS_MARKER_CORE_LAYER, () => {
        map.getCanvas().style.cursor = "";

        if (hoverRef.current !== null) {
          map.setFeatureState({ source: CAMPUS_MARKER_SOURCE, id: hoverRef.current }, { hover: false });
          map.setFeatureState({ source: CAMPUS_OVERLAY_SOURCE, id: hoverRef.current }, { hover: false });
        }

        hoverRef.current = null;
      });

      map.on("click", CAMPUS_MARKER_CORE_LAYER, async (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") {
          return;
        }

        const collegeId = String(feature.properties?.id ?? feature.id ?? "");
        const college = campusesRef.current.find((candidate) => candidate.id === collegeId);
        if (!college) {
          return;
        }

        map.flyTo({
          center: [college.longitude, college.latitude],
          zoom: 14.8,
          pitch: 65,
          bearing: 0,
          duration: 1200,
          essential: true,
        });

        popupRef.current?.remove();

        const coordinates = feature.geometry.coordinates as [number, number];
        const popup = new mapboxgl.Popup({
          className: "dark-popup",
          offset: 18,
          maxWidth: "330px",
          closeButton: true,
        })
          .setLngLat(coordinates)
          .setHTML(
            `<div style="font-size:12px;color:#e2e8f0;min-width:240px">Loading campus insights...</div>`
          )
          .addTo(map);

        popupRef.current = popup;

        try {
          let insights: CampusEmotionResponse | null = null;

          if (insightsRef.current && insightsRef.current.college_id === collegeId) {
            insights = insightsRef.current;
          } else {
            const response = await fetch(`/api/campus/${encodeURIComponent(collegeId)}/emotions`);
            if (response.ok) {
              insights = (await response.json()) as CampusEmotionResponse;
            }
          }

          popup.setHTML(buildCampusInsightHtml(college, insights));
        } catch (error) {
          console.error("Failed to load campus insight", error);
          popup.setHTML(buildCampusInsightHtml(college, null));
        }
      });
    };

    map.on("style.load", setup);
    if (map.isStyleLoaded()) {
      setup();
    }

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      map.off("style.load", setup);
    };
  }, [map]);

  useEffect(() => {
    updateSources();
  }, [updateSources]);

  return null;
}
