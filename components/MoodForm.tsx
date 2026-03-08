"use client";

import { useState } from "react";
import { Mood, MOODS, CheckIn } from "@/lib/types";

interface MoodFormProps {
  onSubmit: (entry: CheckIn) => void;
}

export default function MoodForm({ onSubmit }: MoodFormProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMood) return;

    setSubmitting(true);
    try {
      // Try to get user location
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
          })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Location denied or unavailable, will use random coords
      }

      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selectedMood, message, lat, lng }),
      });

      if (res.ok) {
        const entry = await res.json();
        onSubmit(entry);
        setSelectedMood(null);
        setMessage("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">
        How are you feeling?
      </h2>

      <div className="grid grid-cols-3 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => setSelectedMood(m.label)}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm transition-all ${
              selectedMood === m.label
                ? "border-indigo-500 bg-indigo-50 shadow-sm"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="text-2xl">{m.icon}</span>
            <span className="text-gray-700">{m.label}</span>
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Share how you're feeling (optional, anonymous)..."
        maxLength={280}
        rows={3}
        className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />

      <button
        type="submit"
        disabled={!selectedMood || submitting}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Check In"}
      </button>

      {success && (
        <p className="text-center text-sm text-green-600">
          Thank you for sharing!
        </p>
      )}
    </form>
  );
}
