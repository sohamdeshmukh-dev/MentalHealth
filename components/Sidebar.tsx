"use client";

import { CheckIn, MOODS, SAMPLE_RESOURCES } from "@/lib/types";
import MoodForm from "./MoodForm";
import ResourceCard from "./ResourceCard";

interface SidebarProps {
  checkins: CheckIn[];
  onNewCheckin: (entry: CheckIn) => void;
}

export default function Sidebar({ checkins, onNewCheckin }: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-white p-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">MentalMap</h1>
        <p className="mt-1 text-sm text-gray-500">
          Anonymous mental health check-ins & resources near you.
        </p>
      </div>

      {/* Mood Form */}
      <MoodForm onSubmit={onNewCheckin} />

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* Recent Check-Ins */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Recent Check-Ins
        </h2>
        {checkins.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">
            No check-ins yet. Be the first!
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {checkins.slice(0, 10).map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {MOODS.find((m) => m.label === c.mood)?.icon}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {c.mood}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(c.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {c.message && (
                  <p className="mt-1 text-xs text-gray-500">{c.message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* Resources */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Resources</h2>
        <div className="mt-2 space-y-2">
          {SAMPLE_RESOURCES.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      </div>
    </aside>
  );
}
