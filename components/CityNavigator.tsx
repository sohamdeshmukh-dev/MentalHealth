"use client";

import { CITIES, CityConfig } from "@/lib/types";

interface CityNavigatorProps {
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function CityNavigator({
  currentIndex,
  onNavigate,
}: CityNavigatorProps) {
  const city: CityConfig = CITIES[currentIndex];

  function prev() {
    onNavigate((currentIndex - 1 + CITIES.length) % CITIES.length);
  }

  function next() {
    onNavigate((currentIndex + 1) % CITIES.length);
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
      <button
        onClick={prev}
        aria-label="Previous city"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-white">
          {city.name}
        </span>
        <span className="text-[11px] text-slate-500">
          {city.state} &middot; {currentIndex + 1}/{CITIES.length}
        </span>
      </div>

      <button
        onClick={next}
        aria-label="Next city"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
