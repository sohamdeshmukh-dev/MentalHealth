"use client";

import { useState } from "react";
import { Mood, MOODS, CheckIn } from "@/lib/types";

interface MoodFormProps {
  cityName: string;
  onSubmit: (entry: CheckIn) => void;
}

export default function MoodForm({ cityName, onSubmit }: MoodFormProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMood) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selectedMood, message, city: cityName }),
      });

      if (res.ok) {
        const entry = await res.json();
        onSubmit(entry);
        setSelectedMood(null);
        setMessage("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">
        How are you feeling?
      </h2>

      <div className="grid grid-cols-3 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => setSelectedMood(m.label)}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs transition-all ${
              selectedMood === m.label
                ? "border-indigo-400 bg-indigo-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="text-xl">{m.icon}</span>
            <span className="text-slate-600">{m.label}</span>
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Share how you're feeling (optional)..."
        maxLength={280}
        rows={2}
        className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />

      <button
        type="submit"
        disabled={!selectedMood || submitting}
        className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Submitting..." : "Check In"}
      </button>

      {success && (
        <p className="text-center text-xs text-emerald-600">
          Thank you for sharing.
        </p>
      )}
    </form>
  );
}
