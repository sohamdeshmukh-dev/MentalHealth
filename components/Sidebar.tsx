"use client";

import { CheckIn, MOODS, CITIES } from "@/lib/types";
import MoodForm from "./MoodForm";
import HeatmapLegend from "./HeatmapLegend";

interface SidebarProps {
  checkins: CheckIn[];
  cityIndex: number;
  onNewCheckin: (entry: CheckIn) => void;
}

export default function Sidebar({
  checkins,
  cityIndex,
  onNewCheckin,
}: SidebarProps) {
  const city = CITIES[cityIndex];

  return (
    <aside className="flex h-full w-full flex-col gap-5 overflow-y-auto bg-slate-950/95 p-5 backdrop-blur-sm">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">
          MentalMap
        </h1>
        <p className="mt-0.5 text-xs text-slate-400/90">
          Anonymous mood check-ins & emotional skyline
        </p>
      </div>

      {/* Legend */}
      <HeatmapLegend />

      {/* Mood Form */}
      <MoodForm cityName={city.name} onSubmit={onNewCheckin} />

      {/* Divider */}
      <hr className="border-slate-800" />

      {/* Recent Check-Ins */}
      <div>
        <h2 className="text-sm font-semibold text-slate-200">
          Recent Check-Ins
        </h2>
        {checkins.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400/90">
            No check-ins yet for {city.name}.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {checkins.slice(0, 12).map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {MOODS.find((m) => m.label === c.mood)?.icon}
                  </span>
                  <span className="text-xs font-medium text-slate-200">
                    {c.mood}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-400/90">
                    {new Date(c.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {c.message && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300/90">
                    {c.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
