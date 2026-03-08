"use client";

import { CITIES } from "@/lib/types";

interface CityNavigatorProps {
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function CityNavigator({
  currentIndex,
  onNavigate,
}: CityNavigatorProps) {
  const city = CITIES[currentIndex];

  function prev() {
    onNavigate((currentIndex - 1 + CITIES.length) % CITIES.length);
  }

  function next() {
    onNavigate((currentIndex + 1) % CITIES.length);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={prev}
        aria-label="Previous city"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition-all hover:bg-white hover:shadow-lg active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="flex flex-col items-center rounded-xl bg-white/90 px-5 py-1.5 shadow-md backdrop-blur">
        <span className="text-sm font-bold text-slate-800">
          {city.name}
        </span>
        <span className="text-[10px] font-medium text-slate-400">
          {city.state} &middot; {currentIndex + 1} / {CITIES.length}
        </span>
      </div>

      <button
        onClick={next}
        aria-label="Next city"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition-all hover:bg-white hover:shadow-lg active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
