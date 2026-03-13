"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface UserLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  heading: number | null;
  error: string | null;
  isTracking: boolean;
}

/** Haversine distance in metres between two lat/lng pairs. */
function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MIN_MOVE_METRES = 5;

export function useUserLocation(): UserLocationState & {
  start: () => void;
  stop: () => void;
} {
  const [state, setState] = useState<UserLocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    heading: null,
    error: null,
    isTracking: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser.",
        isTracking: false,
      }));
      return;
    }

    // Avoid duplicate watchers
    if (watchIdRef.current !== null) return;

    setState((prev) => ({ ...prev, error: null, isTracking: true }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading } = position.coords;

        // Skip tiny movements to avoid unnecessary re-renders
        if (lastPosRef.current) {
          const dist = haversineMetres(
            lastPosRef.current.lat,
            lastPosRef.current.lng,
            latitude,
            longitude
          );
          if (dist < MIN_MOVE_METRES) return;
        }

        lastPosRef.current = { lat: latitude, lng: longitude };

        setState({
          latitude,
          longitude,
          accuracy,
          heading: heading ?? null,
          error: null,
          isTracking: true,
        });
      },
      (geoError) => {
        let message: string;
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            message =
              "Location permission denied. Enable location access to see your position on the map.";
            break;
          case geoError.POSITION_UNAVAILABLE:
            message = "Location information is currently unavailable.";
            break;
          case geoError.TIMEOUT:
            message = "Location request timed out.";
            break;
          default:
            message = "An unknown error occurred while accessing your location.";
        }
        setState((prev) => ({ ...prev, error: message, isTracking: false }));
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  }, []);

  // Auto-start on mount, clean up on unmount
  useEffect(() => {
    start();
    return () => {
      stop();
    };
  }, [start, stop]);

  return { ...state, start, stop };
}
