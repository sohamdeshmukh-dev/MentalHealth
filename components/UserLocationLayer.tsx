"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

interface UserLocationLayerProps {
  map: mapboxgl.Map | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

/**
 * Renders a pulsing blue dot on the Mapbox map at the user's current location.
 * Uses a custom HTML marker (no extra GeoJSON source needed).
 */
export default function UserLocationLayer({
  map,
  latitude,
  longitude,
  accuracy,
}: UserLocationLayerProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const accuracySourceAdded = useRef(false);

  // ── Create / update marker ──────────────────────────────────────
  useEffect(() => {
    if (!map || latitude === null || longitude === null) return;

    // Create marker on first valid position
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = "user-location-marker";
      el.innerHTML = `
        <div class="user-location-pulse"></div>
        <div class="user-location-glow"></div>
        <div class="user-location-dot"></div>
      `;

      markerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: "center",
        pitchAlignment: "map",
        rotationAlignment: "map",
      })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      // Smooth update of existing marker position
      markerRef.current.setLngLat([longitude, latitude]);
    }

    // ── Accuracy circle (native Mapbox layer) ───────────────────
    if (accuracy !== null && accuracy > 0) {
      const accuracyGeoJSON: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            properties: { accuracy },
          },
        ],
      };

      const existingSrc = map.getSource(
        "user-location-accuracy"
      ) as mapboxgl.GeoJSONSource | undefined;

      if (existingSrc) {
        existingSrc.setData(accuracyGeoJSON);
      } else if (!accuracySourceAdded.current) {
        // Wait for style to be loaded before adding layers
        const addAccuracyLayer = () => {
          if (map.getSource("user-location-accuracy")) return;

          map.addSource("user-location-accuracy", {
            type: "geojson",
            data: accuracyGeoJSON,
          });

          map.addLayer({
            id: "user-location-accuracy-circle",
            type: "circle",
            source: "user-location-accuracy",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                // accuracy in pixels scales with zoom
                ["*", ["get", "accuracy"], 0.05],
                16,
                ["*", ["get", "accuracy"], 2],
                20,
                ["*", ["get", "accuracy"], 8],
              ],
              "circle-color": "rgba(66, 133, 244, 0.12)",
              "circle-stroke-width": 1,
              "circle-stroke-color": "rgba(66, 133, 244, 0.25)",
              "circle-pitch-alignment": "map",
            },
          });

          accuracySourceAdded.current = true;
        };

        if (map.isStyleLoaded()) {
          addAccuracyLayer();
        } else {
          map.once("style.load", addAccuracyLayer);
        }
      }
    }
  }, [map, latitude, longitude, accuracy]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  return null; // Renders via Mapbox imperative API, no DOM output
}
