"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import CityNavigator from "@/components/CityNavigator";
import { CheckIn, CITIES } from "@/lib/types";

const Map3DView = dynamic(() => import("@/components/Map3DView"), {
  ssr: false,
});

export default function Home() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [cityIndex, setCityIndex] = useState(0);
  const city = CITIES[cityIndex];

  const fetchCheckins = useCallback(() => {
    fetch(`/api/checkins?city=${encodeURIComponent(city.name)}`)
      .then((res) => res.json())
      .then((data) => setCheckins(data));
  }, [city.name]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  // Keyboard navigation
  useEffect(() => {
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

  return (
    <div className="flex h-screen w-screen bg-[#f4f3f8]">
      {/* Sidebar */}
      <div className="w-[360px] shrink-0 border-r border-slate-200">
        <Sidebar
          checkins={checkins}
          cityIndex={cityIndex}
          onNewCheckin={handleNewCheckin}
        />
      </div>

      {/* Map area */}
      <div className="relative flex-1">
        <Map3DView checkins={checkins} city={city} />

        {/* City navigator overlay — centered at top */}
        <div className="pointer-events-auto absolute left-1/2 top-5 z-10 -translate-x-1/2">
          <CityNavigator currentIndex={cityIndex} onNavigate={setCityIndex} />
        </div>

        {/* City label bottom-left */}
        <div className="pointer-events-none absolute bottom-6 left-6">
          <p className="text-2xl font-bold text-slate-700 drop-shadow-sm">
            {city.name}
          </p>
          <p className="text-sm text-slate-400">{city.state}</p>
        </div>
      </div>
    </div>
  );
}
