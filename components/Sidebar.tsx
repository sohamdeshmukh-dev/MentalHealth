"use client";
import { CheckIn, MOODS, CITIES, Mood } from "@/lib/types";
import MoodForm from "./MoodForm";
import HeatmapLegend from "./HeatmapLegend";
import dynamic from 'next/dynamic';

const LocalClock = dynamic(() => import('./LocalClock'), { ssr: false });


interface SidebarProps {
  checkins: CheckIn[];
  cityIndex: number;
  onNewCheckin: (entry: CheckIn) => void;
  onHug: (id: string) => void;
  onMoodChange?: (mood: Mood | null) => void;
  userLat: number | null;
  userLng: number | null;
}

export default function Sidebar({
  checkins,
  cityIndex,
  onNewCheckin,
  onHug,
  onMoodChange,
  userLat,
  userLng,
}: SidebarProps) {
  const city = CITIES[cityIndex];

  const campusCheckins = checkins.filter(c => c.campus_name);
  const dominantCampus = campusCheckins.length > 0 ? campusCheckins[0].campus_name : null;

  return (
    <aside className="flex h-full w-full flex-col gap-5 overflow-y-auto bg-slate-950/95 p-5 backdrop-blur-sm">
      <LocalClock lat={userLat} lng={userLng} />
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
      <MoodForm cityName={city.name} onSubmit={onNewCheckin} onMoodChange={onMoodChange} />

      {/* Divider */}
      <hr className="border-slate-800" />

      {/* Campus Pulse */}
      {dominantCampus && (
        <div>
          <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
            <span>🎓</span> {dominantCampus} Pulse
          </h2>
          <ul className="mt-2 space-y-1.5">
            {campusCheckins.slice(0, 10).map((c) => (
              <li
                key={`campus-${c.id}`}
                className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{MOODS.find((m) => m.label === c.mood)?.icon}</span>
                  <span className="text-xs font-medium text-slate-200">{c.mood}</span>
                  <span className="ml-auto text-[10px] text-slate-400/90">
                    {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {c.message && <p className="mt-1 text-[11px] leading-relaxed text-slate-300/90">{c.message}</p>}
                <div className="mt-2 flex items-center justify-end border-t border-emerald-900/40 pt-2">
                  <button
                    onClick={() => onHug(c.id)}
                    className="flex items-center gap-1.5 rounded-full bg-slate-800/50 px-2.5 py-1 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300 group"
                  >
                    <span className="text-xs transition-transform group-hover:scale-110">🫂</span>
                    <span className="text-[10px] font-semibold tracking-wide text-slate-400 group-hover:text-emerald-300">
                      {c.hugs ? c.hugs : 0}
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <hr className="mt-5 border-slate-800" />
        </div>
      )}

      {/* Recent Check-Ins */}
      <div>
        <h2 className="text-sm font-semibold text-slate-200">
          City Check-Ins
        </h2>
        {checkins.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400/90">
            No check-ins yet for {city.name}.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {(Array.isArray(checkins) ? checkins : []).slice(0, 12).map((c) => (

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
                <div className="mt-2 flex items-center justify-end border-t border-slate-800/60 pt-2">
                  <button
                    onClick={() => onHug(c.id)}
                    className="flex items-center gap-1.5 rounded-full bg-slate-800/50 px-2.5 py-1 transition-colors hover:bg-indigo-500/20 hover:text-indigo-300 group"
                  >
                    <span className="text-xs transition-transform group-hover:scale-110">🫂</span>
                    <span className="text-[10px] font-semibold tracking-wide text-slate-400 group-hover:text-indigo-300">
                      {c.hugs ? c.hugs : 0}
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
