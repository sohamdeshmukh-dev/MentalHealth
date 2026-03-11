"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import MoodEntryForm from "@/components/MoodEntryForm";
import type { MoodEntryPayload } from "@/components/MoodEntryForm";
import StatsCard from "@/components/journal/StatsCard";
import JournalEntryCard from "@/components/journal/JournalEntryCard";
import { ToastProvider, useToast } from "@/components/journal/Toast";
import { JournalEntry } from "@/lib/types";

function JournalPageContent() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { toast } = useToast();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJournalEntries(data || []);
    } catch (err: any) {
      console.error("Error fetching journal:", err?.message || err);
      toast("Failed to load journal entries", "error");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleSubmit(entry: MoodEntryPayload): Promise<boolean> {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        toast("Please wait, loading your session...", "error");
        return false;
      }
      if (!entry.mood) {
        toast("Please select a mood before saving", "error");
        return false;
      }

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        mood: entry.mood,
        journal_text: entry.journal_text,
      };

      // Include optional fields if they have values
      if (entry.image_url) insertData.image_url = entry.image_url;
      if (entry.location) insertData.location = entry.location;

      const { data, error } = await supabase
        .from("journal_entries")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error saving journal:", error);
        toast("Failed to save entry. Please try again.", "error");
        return false;
      }

      setJournalEntries((prev) => [data, ...prev]);
      toast("Journal entry saved successfully");
      return true;
    } catch (err) {
      console.error("Error saving journal entry:", err);
      toast("Something went wrong. Please try again.", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting entry:", error);
        toast("Failed to delete entry", "error");
        return;
      }

      setJournalEntries((prev) => prev.filter((e) => e.id !== id));
      toast("Entry deleted");
    } catch (err) {
      console.error("Error deleting entry:", err);
      toast("Failed to delete entry", "error");
    } finally {
      setDeletingId(null);
    }
  }

  // Calculate streak
  const streak = useMemo(() => {
    if (journalEntries.length === 0) return 0;
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      const hasEntry = journalEntries.some(
        (e) => new Date(e.created_at).toISOString().split("T")[0] === dateStr
      );
      if (hasEntry) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [journalEntries]);

  // This week entries count
  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return journalEntries.filter(
      (e) => new Date(e.created_at) >= weekAgo
    ).length;
  }, [journalEntries]);

  return (
    <div className="min-h-screen bg-[#050913] page-enter">
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-24 sm:px-6">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Mood Journal
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Track your emotions and reflect on your mental wellness journey
          </p>
        </header>

        {/* Stats */}
        <div className="mb-10 grid grid-cols-3 gap-3 sm:gap-4">
          <StatsCard
            value={streak}
            label="Day Streak"
            icon="🔥"
            color="teal"
            isLoading={isLoading}
          />
          <StatsCard
            value={journalEntries.length}
            label="Total Entries"
            icon="📝"
            color="indigo"
            isLoading={isLoading}
          />
          <StatsCard
            value={thisWeekCount}
            label="This Week"
            icon="📊"
            color="purple"
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* Form Section */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-200">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-sm">
                ✍️
              </span>
              New Entry
            </h2>
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.08]">
              <MoodEntryForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </div>
          </section>

          {/* Timeline Section */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-200">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-sm">
                📖
              </span>
              Journal Timeline
              {!isLoading && journalEntries.length > 0 && (
                <span className="ml-auto rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                  {journalEntries.length}
                </span>
              )}
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.06]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-20 animate-pulse rounded bg-white/[0.06]" />
                        <div className="h-3 w-full animate-pulse rounded bg-white/[0.04]" />
                        <div className="h-3 w-24 animate-pulse rounded bg-white/[0.03]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : journalEntries.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center rounded-3xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center backdrop-blur-sm">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/10 to-indigo-500/10 text-3xl">
                  📝
                </div>
                <h3 className="text-sm font-semibold text-slate-300">
                  No journal entries yet
                </h3>
                <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-slate-500">
                  Track your first mood to start building your emotional
                  timeline.
                </p>
              </div>
            ) : (
              /* Timeline entries */
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {journalEntries.map((entry) => (
                  <JournalEntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={handleDelete}
                    isDeleting={deletingId === entry.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function JournalPage() {
  return (
    <ToastProvider>
      <JournalPageContent />
    </ToastProvider>
  );
}
