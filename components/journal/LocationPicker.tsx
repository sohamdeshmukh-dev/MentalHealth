"use client";

import { useCallback, useState } from "react";

interface LocationPickerProps {
  location: string | null;
  onLocationChange: (location: string | null) => void;
  disabled?: boolean;
}

export default function LocationPicker({
  location,
  onLocationChange,
  disabled,
}: LocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocode using free Nominatim API
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16`
          );
          const data = await res.json();

          // Extract a friendly name
          const name =
            data.address?.neighbourhood ||
            data.address?.suburb ||
            data.address?.city_district ||
            data.address?.town ||
            data.address?.city ||
            data.display_name?.split(",").slice(0, 2).join(",") ||
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          onLocationChange(name);
        } catch {
          onLocationChange(
            `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          );
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location access denied"
            : "Could not get location"
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocationChange]);

  if (location) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
        <svg
          className="h-4 w-4 shrink-0 text-teal-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          />
        </svg>
        <span className="flex-1 truncate text-xs text-slate-300">
          {location}
        </span>
        <button
          type="button"
          onClick={() => onLocationChange(null)}
          disabled={disabled}
          className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-300"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={getLocation}
        disabled={disabled || isLocating}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-xs text-slate-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.04] hover:text-slate-300 disabled:pointer-events-none disabled:opacity-40"
      >
        {isLocating ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-500" />
            <span>Getting location...</span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            <span>Use my current location</span>
          </>
        )}
      </button>
      {error && (
        <p className="text-center text-[11px] text-red-400/80">{error}</p>
      )}
    </div>
  );
}
