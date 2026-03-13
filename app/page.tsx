"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CityNavigator from "@/components/CityNavigator";
import LocalClock from "@/components/LocalClock";
import {
  CampusEmotionResponse,
  CheckIn,
  CITIES,
  College,
} from "@/lib/types";
import { generateSeedCheckins } from "@/lib/seedCheckins";

const Map3DView = dynamic(() => import("@/components/Map3DView"), {
  ssr: false,
});

export default function Home() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [cityIndex, setCityIndex] = useState(0);
  const [timeFilter, setTimeFilter] = useState("All");
  const [isCampusMode, setIsCampusMode] = useState(false);
  const [registeredCollege, setRegisteredCollege] = useState<College | null>(null);
  const [cityColleges, setCityColleges] = useState<College[]>([]);
  const [campusInsights, setCampusInsights] = useState<CampusEmotionResponse | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const didAutoCenterRef = useRef(false);
  const city = CITIES[cityIndex];

  const fetchCheckins = useCallback(async () => {
    try {
      const response = await fetch(`/api/checkins?city=${encodeURIComponent(city.name)}`);
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      setCheckins(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load checkins:", err);
      setCheckins([]);
    }
  }, [city.name]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/campus/me")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        const college = payload?.college as College | null;
        setRegisteredCollege(college ?? null);

        if (!didAutoCenterRef.current && college?.city) {
          const campusCityIndex = CITIES.findIndex((candidate) => candidate.name === college.city);
          if (campusCityIndex >= 0) {
            setCityIndex(campusCityIndex);
            didAutoCenterRef.current = true;
          }
        }
      })
      .catch((error) => {
        console.error("Failed to load campus profile:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/colleges?city=${encodeURIComponent(city.name)}`)
      .then(async (response) => {
        if (!response.ok) {
          // colleges table may not exist yet — silently fall back
          if (isMounted) setCityColleges([]);
          return;
        }
        const payload = await response.json();
        if (!isMounted) {
          return;
        }
        setCityColleges(Array.isArray(payload?.colleges) ? payload.colleges : []);
      })
      .catch(() => {
        if (isMounted) {
          setCityColleges([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [city.name]);

  useEffect(() => {
    if (!registeredCollege?.id) {
      setCampusInsights(null);
      return;
    }

    let isMounted = true;

    fetch(`/api/campus/${encodeURIComponent(registeredCollege.id)}/emotions`)
      .then(async (response) => {
        if (!response.ok) {
          if (isMounted) setCampusInsights(null);
          return;
        }
        const payload = await response.json();
        if (!isMounted) {
          return;
        }
        setCampusInsights(payload as CampusEmotionResponse);
      })
      .catch(() => {
        if (isMounted) {
          setCampusInsights(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [registeredCollege?.id]);

  // Keyboard navigation
  useEffect(() => {
    setIsCampusMode(false);

    function handleKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        setCityIndex((index) => (index - 1 + CITIES.length) % CITIES.length);
      } else if (event.key === "ArrowRight") {
        setCityIndex((index) => (index + 1) % CITIES.length);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleSeedSpaces = useCallback(async () => {
    setIsSeeding(true);
    try {
      const { seedRealSafeSpaces } = await import("@/utils/seedSafeSpaces");
      await seedRealSafeSpaces();
      await fetchCheckins();
    } catch (err) {
      console.error("Failed to seed safe spaces:", err);
    } finally {
      setIsSeeding(false);
    }
  }, [fetchCheckins]);

  const effectiveCampusName = registeredCollege?.name ?? checkins.find((checkin) => checkin.campus_name)?.campus_name;

  // Generate deterministic seed points for the current city so weather
  // overlays always have enough data to display emotional weather events.
  const seedPoints = useMemo(() => generateSeedCheckins(city), [city]);

  const filteredCheckins = useMemo(() => {
    const realFiltered = checkins.filter((checkin) => {
      if (isCampusMode) {
        if (registeredCollege?.id) {
          const matchesId = checkin.college_id === registeredCollege.id;
          const matchesName = checkin.campus_name === registeredCollege.name;
          if (!matchesId && !matchesName) {
            return false;
          }
        } else if (!checkin.campus_name) {
          return false;
        }
      }

      if (timeFilter === "All") return true;
      const hour = new Date(checkin.timestamp).getHours();
      if (timeFilter === "Morning") return hour >= 5 && hour < 12;
      if (timeFilter === "Afternoon") return hour >= 12 && hour < 17;
      if (timeFilter === "Evening") return hour >= 17 && hour < 21;
      if (timeFilter === "Night") return hour >= 21 || hour < 5;
      return true;
    });

    // Merge seed points (they also respect time filter)
    const filteredSeeds = timeFilter === "All"
      ? seedPoints
      : seedPoints.filter((checkin) => {
          const hour = new Date(checkin.timestamp).getHours();
          if (timeFilter === "Morning") return hour >= 5 && hour < 12;
          if (timeFilter === "Afternoon") return hour >= 12 && hour < 17;
          if (timeFilter === "Evening") return hour >= 17 && hour < 21;
          if (timeFilter === "Night") return hour >= 21 || hour < 5;
          return true;
        });

    return [...realFiltered, ...filteredSeeds];
  }, [checkins, isCampusMode, registeredCollege?.id, registeredCollege?.name, timeFilter, seedPoints]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <Map3DView
        checkins={filteredCheckins}
        city={city}
        focusedCampus={isCampusMode ? effectiveCampusName : undefined}
        campuses={cityColleges}
        registeredCollege={registeredCollege}
        campusInsights={campusInsights}
        focusRegisteredCampus={isCampusMode}
        isSpinning={isSpinning}
        onToggleSpin={setIsSpinning}
        isSeeding={isSeeding}
        onSeedSafeSpaces={handleSeedSpaces}
      />

      {/* ✅ Top Center: Location Search */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 text-center">
        <div className="flex flex-col items-center">
          <CityNavigator currentIndex={cityIndex} onNavigate={setCityIndex} />
        </div>
      </div>

      {/* ✅ Bottom Left: Filters and Time */}
      <div className="absolute bottom-4 left-4 z-40 flex flex-col gap-4">
        <div className="flex gap-2">
          {["All", "Morning", "Afternoon", "Evening", "Night"].map((filterName) => (
            <button
              key={filterName}
              onClick={() => setTimeFilter(filterName)}
              className={`px-4 py-1 rounded-full text-sm transition-all duration-300 ${timeFilter === filterName
                ? "bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.4)]"
                : "bg-black/50 text-white hover:bg-black/70"
                }`}
            >
              {filterName}
            </button>
          ))}
        </div>
        <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 w-64 border border-gray-700/50 shadow-2xl">
          <LocalClock selectedCity={city.name} selectedState={city.state} />
        </div>
      </div>

      {/* ✅ Bottom Right: Tools */}
      <div className="absolute bottom-20 right-4 z-40 flex flex-col gap-2 items-end">
        {effectiveCampusName && (
          <button
            onClick={() => setIsCampusMode((value) => !value)}
            className={`text-sm bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-black/90 transition shadow-lg ${isCampusMode ? "text-emerald-400 border-emerald-500/30" : "text-white"}`}
          >
            🎓 {effectiveCampusName}
          </button>
        )}
        <button 
          className="text-teal-400 text-sm bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-black/90 transition shadow-lg disabled:opacity-50"
          onClick={handleSeedSpaces}
          disabled={isSeeding}
        >
          {isSeeding ? "🌿 Seeding..." : "🌿 Seed Safe Spaces"}
        </button>
        <button 
          className={`text-sm bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-black/90 transition shadow-lg ${isSpinning ? "text-blue-400 border-blue-500/30" : "text-white"}`}
          onClick={() => setIsSpinning(!isSpinning)}
        >
          {isSpinning ? "⏸ Stop" : "🔄 Cinematic"}
        </button>
      </div>
    </div>
  );
}
