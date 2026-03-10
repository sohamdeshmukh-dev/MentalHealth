"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import CityNavigator from "@/components/CityNavigator";
import { CheckIn, CITIES } from "@/lib/types";

const Map3DView = dynamic(() => import("@/components/Map3DView"), {
  ssr: false,
});

export default function Home() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [cityIndex, setCityIndex] = useState(0);
  const [timeFilter, setTimeFilter] = useState("All");
  const [isCampusMode, setIsCampusMode] = useState(false);
  const city = CITIES[cityIndex];

  const fetchCheckins = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkins?city=${encodeURIComponent(city.name)}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setCheckins(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load checkins:", err);
      setCheckins([]);
    }
  }, [city.name]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  // Keyboard navigation
  useEffect(() => {
    setIsCampusMode(false); // Reset campus mode on city change
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        setCityIndex((i) => (i - 1 + CITIES.length) % CITIES.length);
      } else if (e.key === "ArrowRight") {
        setCityIndex((i) => (i + 1) % CITIES.length);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const filteredCheckins = checkins.filter((c) => {
    if (isCampusMode && !c.campus_name) return false;
    if (timeFilter === "All") return true;
    const hour = new Date(c.timestamp).getHours();
    if (timeFilter === "Morning") return hour >= 5 && hour < 12;
    if (timeFilter === "Afternoon") return hour >= 12 && hour < 17;
    if (timeFilter === "Evening") return hour >= 17 && hour < 21;
    if (timeFilter === "Night") return hour >= 21 || hour < 5;
    return true;
  });

  // Find dominant campus in current city
  const dominantCampus = checkins.find((c) => c.campus_name)?.campus_name;

  return (
    <div className="h-screen w-full overflow-hidden bg-[#050913] p-2 sm:p-4">
      <div className="relative h-full w-full overflow-hidden rounded-[26px] border border-slate-800/90 shadow-2xl shadow-black/35 sm:rounded-[32px]">
        <Map3DView
          checkins={filteredCheckins}
          city={city}
          focusedCampus={isCampusMode ? dominantCampus : undefined}
        />

        <div className="pointer-events-auto absolute right-3 top-20 z-[50] flex flex-col items-end gap-2 sm:right-5 sm:top-5">
          <div className="flex cursor-pointer rounded-full border border-slate-700/50 bg-slate-900/80 p-1 shadow-lg backdrop-blur-md">
            {["All", "Morning", "Afternoon", "Evening", "Night"].map((f) => (
              <div
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-colors sm:px-4 sm:text-xs ${timeFilter === f
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {f}
              </div>
            ))}
          </div>

          {dominantCampus && (
            <button
              onClick={() => setIsCampusMode(!isCampusMode)}
              className={`rounded-full border px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-md transition-colors ${isCampusMode
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-slate-700/50 bg-slate-900/80 text-slate-300 hover:bg-slate-800"
                }`}
            >
              🎓 Focus on Campus: {dominantCampus}
            </button>
          )}
        </div>

        <div className="pointer-events-auto absolute left-1/2 top-20 z-10 -translate-x-1/2 sm:top-5">
          <CityNavigator currentIndex={cityIndex} onNavigate={setCityIndex} />
        </div>

        <div className="pointer-events-none absolute bottom-6 left-6 flex items-end gap-3">
          <div>
            <p className="text-2xl font-bold text-slate-100 drop-shadow-md">{city.name}</p>
            <p className="text-sm text-slate-300/80">{city.state}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
