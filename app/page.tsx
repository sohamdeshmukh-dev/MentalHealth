"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import CityNavigator from "@/components/CityNavigator";
import { CheckIn, CITIES, Mood } from "@/lib/types";
import WeatherOverlay from "@/components/WeatherOverlay";

const Map3DView = dynamic(() => import("@/components/Map3DView"), {
  ssr: false,
});

export default function Home() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [cityIndex, setCityIndex] = useState(0);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [timeFilter, setTimeFilter] = useState("All");
  const [isCampusMode, setIsCampusMode] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
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

  function handleNewCheckin(entry: CheckIn) {
    setCheckins((prev) => [entry, ...prev]);
  }

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLat(position.coords.latitude);
        setUserLng(position.coords.longitude);
      });
    }
  }, []);

  function handleHug(id: string) {
    setCheckins((prev) => prev.map((c) => (c.id === id ? { ...c, hugs: (c.hugs || 0) + 1 } : c)));
    fetch("/api/checkins/hug", { method: "POST", body: JSON.stringify({ id }) }).catch(console.error);
  }

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

  const seedMockData = async () => {
    setIsSeeding(true);
    const moods = ["Happy", "Calm", "Neutral", "Stressed", "Sad", "Overwhelmed"];
    try {
      const promises = Array.from({ length: 50 }).map(() => {
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        return fetch("/api/checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood: randomMood, city: city.name, message: "Mock seeded data" })
        });
      });
      await Promise.all(promises);
      await fetchCheckins();
    } catch (err) {
      console.error("Error seeding mock data:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex h-screen w-screen gap-4 bg-[#050913] p-4">
      {/* Sidebar widget */}
      <div className="h-full w-[360px] shrink-0 overflow-hidden rounded-[30px] border border-slate-800 bg-slate-950/85 shadow-2xl shadow-black/40">
        <Sidebar
          checkins={filteredCheckins}
          cityIndex={cityIndex}
          onNewCheckin={handleNewCheckin}
          onHug={handleHug}
          onMoodChange={setSelectedMood}
          userLat={userLat}
          userLng={userLng}
        />
      </div>

      {/* Map area */}
      <div className="relative flex-1 overflow-hidden rounded-[30px] border border-slate-800 shadow-2xl shadow-black/30">
        {/* Weather Overlay — sits over map, under all UI buttons */}
        <WeatherOverlay mood={selectedMood} />
        <Map3DView checkins={filteredCheckins} city={city} focusedCampus={isCampusMode ? dominantCampus : undefined} selectedMood={selectedMood} />

        {/* Filters Top Right */}
        <div className="pointer-events-auto absolute right-5 top-5 z-10 flex flex-col gap-2 items-end">
          {/* Time-of-Day Filter */}
          <div className="flex cursor-pointer rounded-full border border-slate-700/50 bg-slate-900/80 p-1 shadow-lg backdrop-blur-md">
            {["All", "Morning", "Afternoon", "Evening", "Night"].map((f) => (
              <div
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors ${timeFilter === f
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {f}
              </div>
            ))}
          </div>

          {/* Campus Toggle */}
          {dominantCampus && (
            <button
              onClick={() => setIsCampusMode(!isCampusMode)}
              className={`rounded-full px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-md transition-colors border ${isCampusMode
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-slate-700/50 bg-slate-900/80 text-slate-300 hover:bg-slate-800"
                }`}
            >
              🎓 Focus on Campus: {dominantCampus}
            </button>
          )}
        </div>

        {/* City navigator overlay — centered at top */}
        <div className="pointer-events-auto absolute left-1/2 top-5 z-10 -translate-x-1/2">
          <CityNavigator currentIndex={cityIndex} onNavigate={setCityIndex} />
        </div>

        {/* City label bottom-left */}
        <div className="pointer-events-none absolute bottom-6 left-6 flex items-end gap-3">
          <div>
            <p className="text-2xl font-bold text-slate-100 drop-shadow-md">
              {city.name}
            </p>
            <p className="text-sm text-slate-300/80">{city.state}</p>
          </div>
          <button
            onClick={seedMockData}
            disabled={isSeeding}
            className="pointer-events-auto rounded-full bg-slate-800/80 px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold text-slate-300 backdrop-blur-md hover:bg-slate-700/80 disabled:opacity-50 border border-slate-700/50 transition duration-200 ml-2"
          >
            {isSeeding ? "Seeding..." : "Seed 50 Points"}
          </button>
        </div>
      </div>
    </div>
  );
}
