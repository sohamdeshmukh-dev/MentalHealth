"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { CheckIn } from "@/lib/types";

// Leaflet must be loaded client-side only
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);

  useEffect(() => {
    fetch("/api/checkins")
      .then((res) => res.json())
      .then((data) => setCheckins(data));
  }, []);

  function handleNewCheckin(entry: CheckIn) {
    setCheckins((prev) => [entry, ...prev]);
  }

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar */}
      <div className="w-[400px] shrink-0 border-r border-gray-200">
        <Sidebar checkins={checkins} onNewCheckin={handleNewCheckin} />
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapView checkins={checkins} />
      </div>
    </div>
  );
}
