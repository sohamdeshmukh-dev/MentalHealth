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
          throw new Error("Unable to fetch city campuses.");
        }
        const payload = await response.json();
        if (!isMounted) {
          return;
        }
        setCityColleges(Array.isArray(payload?.colleges) ? payload.colleges : []);
      })
      .catch((error) => {
        console.error(error);
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
          throw new Error("Unable to fetch campus emotional insights.");
        }
        const payload = await response.json();
        if (!isMounted) {
          return;
        }
        setCampusInsights(payload as CampusEmotionResponse);
      })
      .catch((error) => {
        console.error(error);
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

  const effectiveCampusName = registeredCollege?.name ?? checkins.find((checkin) => checkin.campus_name)?.campus_name;

  const filteredCheckins = useMemo(() => {
    return checkins.filter((checkin) => {
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
  }, [checkins, isCampusMode, registeredCollege?.id, registeredCollege?.name, timeFilter]);

  return (
    <div className="h-screen w-full overflow-hidden bg-[var(--background)] p-2 sm:p-4">
      <div className="relative h-full w-full overflow-hidden rounded-[26px] border border-[var(--border-soft)] shadow-2xl sm:rounded-[32px]">
        <Map3DView
          checkins={filteredCheckins}
          city={city}
          focusedCampus={isCampusMode ? effectiveCampusName : undefined}
          campuses={cityColleges}
          registeredCollege={registeredCollege}
          campusInsights={campusInsights}
          focusRegisteredCampus={isCampusMode}
        />

        <div className="pointer-events-auto absolute right-3 top-20 z-[50] flex flex-col items-end gap-2 sm:right-5 sm:top-5">
          <div className="flex cursor-pointer rounded-full border border-[var(--border-soft)] bg-[var(--surface-1)] p-1 shadow-lg backdrop-blur-md">
            {["All", "Morning", "Afternoon", "Evening", "Night"].map((filterName) => (
              <div
                key={filterName}
                onClick={() => setTimeFilter(filterName)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-colors sm:px-4 sm:text-xs ${timeFilter === filterName
                  ? "bg-indigo-600 text-white shadow"
                  : "text-[var(--muted-text)] hover:text-[var(--foreground)]"
                  }`}
              >
                {filterName}
              </div>
            ))}
          </div>

          {effectiveCampusName && (
            <button
              onClick={() => setIsCampusMode((value) => !value)}
              className={`rounded-full border px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-md transition-colors ${isCampusMode
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-[var(--border-soft)] bg-[var(--surface-1)] text-[var(--muted-text)] hover:bg-[var(--surface-2)]"
                }`}
            >
              🎓 Focus on Campus: {effectiveCampusName}
            </button>
          )}
        </div>

        <div className="pointer-events-auto absolute left-1/2 top-20 z-10 -translate-x-1/2 sm:top-5">
          <CityNavigator currentIndex={cityIndex} onNavigate={setCityIndex} />
        </div>

        <div className="pointer-events-none absolute bottom-6 left-6 z-[45]">
          <LocalClock selectedCity={city.name} selectedState={city.state} />
        </div>
      </div>
    </div>
  );
}
