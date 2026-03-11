"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface LocationSuggestion {
  id: string;
  label: string;
}

function compactLocationLabel(parts: Array<string | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(", ");
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function useLocation(initialValue = "") {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasToken = useMemo(() => Boolean(mapboxToken), [mapboxToken]);

  const setLocationValue = useCallback((nextValue: string) => {
    setValue(nextValue);
    setError(null);
  }, []);

  const clearLocation = useCallback(() => {
    setValue("");
    setSuggestions([]);
    setError(null);
  }, []);

  const selectSuggestion = useCallback((suggestion: LocationSuggestion) => {
    setValue(suggestion.label);
    setSuggestions([]);
    setError(null);
  }, []);

  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      if (hasToken && mapboxToken) {
        const encodedPair = `${longitude},${latitude}`;
        const reverseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedPair}.json?types=place,locality,neighborhood,address&limit=1&access_token=${mapboxToken}`;
        type ReverseResponse = { features?: Array<{ place_name?: string }> };
        const reverseData = await fetchJson<ReverseResponse>(reverseUrl);
        const placeName = reverseData.features?.[0]?.place_name;
        if (placeName) {
          return placeName;
        }
      }

      const fallbackUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      type NominatimResponse = {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          state?: string;
          county?: string;
        };
      };
      const fallbackData = await fetchJson<NominatimResponse>(fallbackUrl);
      const city = fallbackData.address?.city || fallbackData.address?.town || fallbackData.address?.village;
      const state = fallbackData.address?.state || fallbackData.address?.county;
      const compact = compactLocationLabel([city, state]);

      if (compact) {
        return compact;
      }

      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    },
    [hasToken, mapboxToken]
  );

  const useCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setError(null);

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          try {
            const label = await reverseGeocode(latitude, longitude);
            setValue(label);
            setSuggestions([]);
          } catch {
            setValue(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } finally {
            setIsLocating(false);
            resolve();
          }
        },
        (geoError) => {
          if (geoError.code === geoError.PERMISSION_DENIED) {
            setError("Location permission denied.");
          } else {
            setError("Unable to access your location right now.");
          }
          setIsLocating(false);
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, [reverseGeocode]);

  useEffect(() => {
    if (!hasToken || !mapboxToken || value.trim().length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      const query = value.trim();
      setIsSearching(true);
      setError(null);

      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?autocomplete=true&types=place,locality,neighborhood,address&limit=5&access_token=${mapboxToken}`;

        type SearchResponse = {
          features?: Array<{ id: string; place_name?: string }>;
        };

        const data = await fetchJson<SearchResponse>(url, controller.signal);

        const nextSuggestions = (data.features || [])
          .filter((feature) => feature.place_name)
          .map((feature) => ({
            id: feature.id,
            label: feature.place_name as string,
          }));

        setSuggestions(nextSuggestions);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setError("Location search is temporarily unavailable.");
        }
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [hasToken, mapboxToken, value]);

  return {
    value,
    suggestions,
    isSearching,
    isLocating,
    error,
    setLocationValue,
    selectSuggestion,
    useCurrentLocation,
    clearLocation,
  };
}
