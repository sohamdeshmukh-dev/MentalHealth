"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Mood, CheckIn } from "@/lib/types";

const EmotionWheelSelector = dynamic(
  () => import("./EmotionWheelSelector"),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative mx-auto aspect-square w-full max-w-[320px] rounded-full border border-slate-700 bg-slate-900/70"
        aria-hidden
      />
    ),
  }
);

interface MoodFormProps {
  cityName: string;
  onSubmit: (entry: CheckIn) => void;
}

export default function MoodForm({ cityName, onSubmit }: MoodFormProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (selectedMood === "Overwhelmed" || selectedMood === "Sad") {
      window.dispatchEvent(new CustomEvent("crisis_alert"));
    }
  }, [selectedMood]);

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
      } else {
        const err = await res.json();
        console.error("Supabase insert failed:", err);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-200">
        How are you feeling?
      </h2>

      <EmotionWheelSelector value={selectedMood} onChange={setSelectedMood} />

      {(selectedMood === "Overwhelmed" || selectedMood === "Sad") && (
        <div className="mt-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <p className="text-sm font-semibold text-red-400">You are not alone. Help is available.</p>
          <a href="tel:988" className="mt-2 inline-block rounded border border-red-500 bg-red-600/20 px-4 py-1.5 text-xs font-bold tracking-wide text-red-200 hover:bg-red-500 hover:text-white transition">
            Call or Text 988 Crisis Lifeline
          </a>
        </div>
      )}

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Share how you're feeling (optional)..."
        maxLength={280}
        rows={2}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />

      <button
        type="submit"
        disabled={!selectedMood || submitting}
        className="w-full rounded-lg bg-indigo-500 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
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
