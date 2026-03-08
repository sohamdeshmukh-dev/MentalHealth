"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
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
      } else if (e.key === "ArrowRight" || e.key === "Tab") {
        e.preventDefault();
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
    <div className="flex h-screen w-screen bg-[#08081a]">
      {/* Sidebar */}
      <div className="w-[360px] shrink-0 border-r border-white/5">
        <Sidebar
          checkins={checkins}
          cityIndex={cityIndex}
          onCityChange={setCityIndex}
          onNewCheckin={handleNewCheckin}
        />
      </div>

      {/* 3D Map */}
      <div className="relative flex-1">
        <Map3DView checkins={checkins} city={city} />

        {/* City label overlay */}
        <div className="pointer-events-none absolute bottom-6 left-6">
          <p className="text-2xl font-bold text-white/80 drop-shadow-lg">
            {city.name}
          </p>
          <p className="text-sm text-white/40">{city.state}</p>
        </div>
      </div>
    </div>
  );
}
