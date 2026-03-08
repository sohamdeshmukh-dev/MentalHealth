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
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
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


  return (
    <div className="flex h-screen w-screen gap-4 bg-[#050913] p-4">
      {/* Sidebar widget */}
      <div className="h-full w-[360px] shrink-0 overflow-hidden rounded-[30px] border border-slate-800 bg-slate-950/85 shadow-2xl shadow-black/40">
        <Sidebar
          checkins={checkins}
          cityIndex={cityIndex}
          onNewCheckin={handleNewCheckin}
          userLat={userLat}
          userLng={userLng}
        />
      </div>

      {/* Map area */}
      <div className="relative flex-1 overflow-hidden rounded-[30px] border border-slate-800 shadow-2xl shadow-black/30">
        <Map3DView checkins={checkins} city={city} />

        {/* City navigator overlay — centered at top */}
        <div className="pointer-events-auto absolute left-1/2 top-5 z-10 -translate-x-1/2">
          <CityNavigator currentIndex={cityIndex} onNavigate={setCityIndex} />
        </div>

        {/* City label bottom-left */}
        <div className="pointer-events-none absolute bottom-6 left-6">
          <p className="text-2xl font-bold text-slate-100 drop-shadow-md">
            {city.name}
          </p>
          <p className="text-sm text-slate-300/80">{city.state}</p>
        </div>
      </div>
    </div>
  );
}
