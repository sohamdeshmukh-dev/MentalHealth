"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Mood, MOODS } from "@/lib/types";
import ImageUploader from "@/components/journal/ImageUploader";
import LocationPicker from "@/components/journal/LocationPicker";

const EmotionWheelSelector = dynamic(
  () => import("./EmotionWheelSelector"),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative mx-auto aspect-square w-full max-w-[280px] rounded-full border border-slate-700 bg-slate-900/70 animate-pulse"
        aria-hidden
      />
    ),
  }
);

export interface MoodEntryPayload {
  mood: string;
  journal_text: string;
  image_url?: string;
  location?: string;
}

interface MoodEntryFormProps {
  onSubmit: (entry: MoodEntryPayload) => Promise<boolean>;
  isSubmitting: boolean;
}

type ButtonState = "idle" | "saving" | "saved";

export default function MoodEntryForm({
  onSubmit,
  isSubmitting,
}: MoodEntryFormProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [journalText, setJournalText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [showContext, setShowContext] = useState(false);

  const selectedMoodConfig = MOODS.find((m) => m.label === selectedMood);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMood || isSubmitting) return;

    setButtonState("saving");

    const success = await onSubmit({
      mood: selectedMood,
      journal_text: journalText,
      image_url: imagePreview || undefined,
      location: location || undefined,
    });

    if (success) {
      setButtonState("saved");
      setSelectedMood(null);
      setJournalText("");
      setImagePreview(null);
      setLocation(null);
      setShowContext(false);
      setTimeout(() => setButtonState("idle"), 2000);
    } else {
      setButtonState("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section: Mood Selection */}
      <div>
        <h3 className="mb-3 text-center text-sm font-semibold text-slate-300">
          How are you feeling right now?
        </h3>
        <EmotionWheelSelector value={selectedMood} onChange={setSelectedMood} />
      </div>

      {/* Crisis alert */}
      {(selectedMood === "Overwhelmed" || selectedMood === "Sad") && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.08] p-4 text-center shadow-[0_0_20px_rgba(239,68,68,0.15)] journal-expand">
          <p className="text-sm font-semibold text-red-400">
            You are not alone. Help is available.
          </p>
          <a
            href="tel:988"
            className="mt-2 inline-block rounded-xl border border-red-500/40 bg-red-600/20 px-5 py-2 text-xs font-bold tracking-wide text-red-200 transition-all hover:bg-red-500 hover:text-white"
          >
            Call or Text 988 Crisis Lifeline
          </a>
        </div>
      )}

      {/* Section: Journal Text */}
      {selectedMood && (
        <div className="space-y-3 journal-expand">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedMoodConfig?.icon}</span>
            <span
              className="text-sm font-semibold"
              style={{ color: selectedMoodConfig?.color }}
            >
              Feeling {selectedMood}
            </span>
          </div>

          <textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="Write about your feelings, what happened today, or anything on your mind..."
            maxLength={1000}
            rows={4}
            className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-slate-100 placeholder-slate-500 backdrop-blur-sm transition-all duration-200 resize-none focus:border-teal-500/30 focus:bg-white/[0.03] focus:outline-none focus:ring-1 focus:ring-teal-400/20"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {journalText.length}/1000
            </span>
          </div>

          {/* Section: Add More Context */}
          <div>
            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs text-slate-400 transition-all hover:border-white/[0.1] hover:bg-white/[0.03]"
            >
              <span className="font-medium">Add More Context (Optional)</span>
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${
                  showContext ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>

            {showContext && (
              <div className="mt-3 space-y-3 journal-expand">
                {/* Image Upload */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Photo
                  </label>
                  <ImageUploader
                    imagePreview={imagePreview}
                    onImageSelect={setImagePreview}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Location
                  </label>
                  <LocationPicker
                    location={location}
                    onLocationChange={setLocation}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!selectedMood || isSubmitting || buttonState === "saved"}
        className={`group relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
          buttonState === "saved"
            ? "bg-emerald-600 shadow-emerald-500/20"
            : "bg-gradient-to-r from-teal-600 to-indigo-600 shadow-teal-500/20 hover:shadow-teal-500/30 hover:brightness-110"
        }`}
      >
        {/* Hover glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-teal-400/0 via-white/[0.08] to-indigo-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <span className="relative flex items-center justify-center gap-2">
          {buttonState === "saving" && (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving...
            </>
          )}
          {buttonState === "saved" && (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              Saved
            </>
          )}
          {buttonState === "idle" && "Save Journal Entry"}
        </span>
      </button>
    </form>
  );
}
