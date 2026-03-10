"use client";

import { useCallback, useEffect, useState } from "react";
import MoodEntryForm from "@/components/MoodEntryForm";
import { MOODS } from "@/lib/types";

interface JournalEntry {
    id: string;
    mood: string;
    journal_text: string;
    created_at: string;
}

export default function JournalPage() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchEntries = useCallback(async () => {
        try {
            const res = await fetch("/api/journal");
            if (res.ok) {
                const data = await res.json();
                setEntries(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Error fetching journal:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    async function handleSubmit(entry: { mood: string; journal_text: string }) {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/journal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entry),
            });
            if (res.ok) {
                const newEntry = await res.json();
                setEntries((prev) => [newEntry, ...prev]);
            }
        } catch (err) {
            console.error("Error saving journal entry:", err);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        setDeletingId(id);
        try {
            const res = await fetch("/api/journal", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                setEntries((prev) => prev.filter((e) => e.id !== id));
            }
        } catch (err) {
            console.error("Error deleting entry:", err);
        } finally {
            setDeletingId(null);
        }
    }

    // Calculate streak
    const streak = (() => {
        if (entries.length === 0) return 0;
        let count = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i <= 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = checkDate.toISOString().split("T")[0];
            const hasEntry = entries.some(
                (e) => new Date(e.created_at).toISOString().split("T")[0] === dateStr
            );
            if (hasEntry) {
                count++;
            } else if (i > 0) {
                break;
            }
        }
        return count;
    })();

    return (
        <div className="min-h-screen bg-[#050913] page-enter">
            <div className="mx-auto max-w-4xl px-4 pb-8 pt-24 sm:px-6">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        <span className="bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
                            Mood Journal
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Track your emotions and reflect on your mental wellness journey
                    </p>
                </div>

                {/* Stats bar */}
                <div className="mb-8 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center backdrop-blur-sm">
                        <div className="text-2xl font-bold text-teal-400">{streak}</div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-1">
                            Day Streak 🔥
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center backdrop-blur-sm">
                        <div className="text-2xl font-bold text-indigo-400">{entries.length}</div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-1">
                            Total Entries
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center backdrop-blur-sm">
                        <div className="text-2xl font-bold text-purple-400">
                            {entries.filter((e) => {
                                const d = new Date(e.created_at);
                                const now = new Date();
                                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                return d >= weekAgo;
                            }).length}
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-1">
                            This Week
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
                    {/* Form section */}
                    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
                        <MoodEntryForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
                    </div>

                    {/* Timeline */}
                    <div>
                        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <span>📖</span> Journal Timeline
                        </h2>

                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="h-8 w-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                                <div className="text-4xl mb-3">📝</div>
                                <p className="text-slate-400 text-sm">
                                    No journal entries yet. Start by selecting a mood and writing how you feel.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                {entries.map((entry) => {
                                    const moodConfig = MOODS.find((m) => m.label === entry.mood);
                                    return (
                                        <div
                                            key={entry.id}
                                            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm hover:border-white/[0.1] transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{moodConfig?.icon || "😐"}</span>
                                                    <span
                                                        className="text-sm font-semibold"
                                                        style={{ color: moodConfig?.color || "#a78bfa" }}
                                                    >
                                                        {entry.mood}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] text-slate-500">
                                                        {new Date(entry.created_at).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        disabled={deletingId === entry.id}
                                                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-red-500/10"
                                                        title="Delete entry"
                                                    >
                                                        {deletingId === entry.id ? (
                                                            <span className="h-3.5 w-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin block" />
                                                        ) : (
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            {entry.journal_text && (
                                                <p className="text-[13px] leading-relaxed text-slate-300/90">
                                                    {entry.journal_text}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
