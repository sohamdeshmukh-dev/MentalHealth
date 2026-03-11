"use client";

import Button from "@/components/Button";
import type { LocationSuggestion } from "@/hooks/useLocation";

interface LocationPickerProps {
  value: string;
  suggestions: LocationSuggestion[];
  isLocating: boolean;
  isSearching: boolean;
  error: string | null;
  onUseCurrentLocation: () => Promise<void>;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: LocationSuggestion) => void;
}

export default function LocationPicker({
  value,
  suggestions,
  isLocating,
  isSearching,
  error,
  onUseCurrentLocation,
  onChange,
  onSelectSuggestion,
}: LocationPickerProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 backdrop-blur-sm">
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--foreground)]">📍 Location (optional)</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            void onUseCurrentLocation();
          }}
          isLoading={isLocating}
          className="rounded-xl px-3 py-2 text-xs"
        >
          Use my location
        </Button>
        <span className="text-xs text-[var(--subtle-text)]">or search manually</span>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search location"
          className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--subtle-text)] outline-none transition-all focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20"
        />
        {isSearching ? <p className="text-xs text-[var(--muted-text)]">Searching locations...</p> : null}
      </div>

      {suggestions.length > 0 ? (
        <ul className="max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-2">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                onClick={() => onSelectSuggestion(suggestion)}
                className="w-full rounded-xl px-3 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)]"
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {value.trim() ? (
        <p className="rounded-xl border border-teal-400/25 bg-teal-500/10 px-3 py-2 text-xs text-teal-200">
          Selected: {value}
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
