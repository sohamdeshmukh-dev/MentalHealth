"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Mood, MOODS } from "@/lib/types";

const EmotionWheelSelector = dynamic(
    () => import("./EmotionWheelSelector"),
    {
        ssr: false,
        loading: () => (
            <div
                className="relative mx-auto aspect-square w-full max-w-[280px] rounded-full border border-slate-700 bg-slate-900/70"
                aria-hidden
            />
        ),
    }
);

interface MoodEntryFormProps {
    onSubmit: (entry: { mood: string; journal_text: string }) => void;
    isSubmitting: boolean;
}

export default function MoodEntryForm({ onSubmit, isSubmitting }: MoodEntryFormProps) {
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
    const [journalText, setJournalText] = useState("");
    const [success, setSuccess] = useState(false);

    const selectedMoodConfig = MOODS.find((m) => m.label === selectedMood);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedMood) return;

        onSubmit({ mood: selectedMood, journal_text: journalText });
        setSelectedMood(null);
        setJournalText("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Emotion Wheel */}
            <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 text-center">
                    How are you feeling right now?
                </h3>
                <EmotionWheelSelector value={selectedMood} onChange={setSelectedMood} />
            </div>

            {/* Crisis alert */}
            {(selectedMood === "Overwhelmed" || selectedMood === "Sad") && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.08] p-4 text-center shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                    <p className="text-sm font-semibold text-red-400">
                        You are not alone. Help is available.
                    </p>
                    <a
                        href="tel:988"
                        className="mt-2 inline-block rounded-xl border border-red-500/40 bg-red-600/20 px-5 py-2 text-xs font-bold tracking-wide text-red-200 hover:bg-red-500 hover:text-white transition-all"
                    >
                        Call or Text 988 Crisis Lifeline
                    </a>
                </div>
            )}

            {/* Journal textarea */}
            {selectedMood && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
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
                        rows={5}
                        className="w-full rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-400/30 resize-none transition-colors backdrop-blur-sm"
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-500">
                            {journalText.length}/1000 characters
                        </span>
                    </div>
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={!selectedMood || isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
            >
                {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                    </span>
                ) : (
                    "Save Journal Entry"
                )}
            </button>

            {success && (
                <div className="text-center text-sm text-emerald-400 font-medium animate-in fade-in duration-300">
                    ✨ Entry saved successfully
                </div>
            )}
        </form>
    );
}
