"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";
import EmotionIntensitySlider from "@/components/EmotionIntensitySlider";
import ImageUploader from "@/components/ImageUploader";
import JournalEntryCard from "@/components/JournalEntryCard";
import LocationPicker from "@/components/LocationPicker";
import MoodBalanceGraph from "@/components/MoodBalanceGraph";
import MoodWheel from "@/components/MoodWheel";
import StatsCard from "@/components/StatsCard";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useLocation } from "@/hooks/useLocation";
import { useMoodEntry } from "@/hooks/useMoodEntry";
import { Mood, MOODS } from "@/lib/types";

const DEFAULT_INTENSITY = 40;

function getLocalDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function calculateStreak(createdAts: string[]) {
  if (createdAts.length === 0) {
    return 0;
  }

  const daysWithEntries = new Set(createdAts.map((value) => getLocalDateKey(value)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;

  for (let dayOffset = 0; dayOffset < 365; dayOffset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (daysWithEntries.has(key)) {
      streak += 1;
    } else if (dayOffset > 0) {
      break;
    }
  }

  return streak;
}

export default function JournalPage() {
  const [selectedEmotion, setSelectedEmotion] = useState<Mood | null>(null);
  const [intensity, setIntensity] = useState(DEFAULT_INTENSITY);
  const [note, setNote] = useState("");
  const [weekThreshold] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [communityPulse, setCommunityPulse] = useState<{ dominant_mood: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [savedMood, setSavedMood] = useState<Mood | null>(null);

  useEffect(() => {
    supabase.from('community_mood_pulse').select('*').limit(1).maybeSingle().then(({ data, error }) => {
      if (data && !error) setCommunityPulse(data);
    });
  }, []);

  const { entries, isLoading, isSaving, saveError, saveSuccess, deletingId, saveEntry, deleteEntry } = useMoodEntry();
  const { file, previewUrl, isUploading, uploadError, selectFile, clearImage, uploadImage } = useImageUpload();
  const {
    value: location,
    suggestions,
    isSearching,
    isLocating,
    error: locationError,
    setLocationValue,
    selectSuggestion,
    useCurrentLocation,
    clearLocation,
  } = useLocation();

  const selectedMood = useMemo(
    () => MOODS.find((mood) => mood.label === selectedEmotion),
    [selectedEmotion]
  );

  const totalEntries = entries.length;
  const streak = useMemo(
    () => calculateStreak(entries.map((entry) => entry.createdAt)),
    [entries]
  );
  const thisWeekCount = useMemo(() => {
    return entries.filter((entry) => new Date(entry.createdAt).getTime() >= weekThreshold).length;
  }, [entries, weekThreshold]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEmotion) {
      return;
    }

    let imageUrl: string | undefined;

    if (file) {
      const uploaded = await uploadImage();
      if (!uploaded) {
        return;
      }
      imageUrl = uploaded;
    }

    const didSave = await saveEntry({
      emotion: selectedEmotion,
      intensity,
      note,
      imageUrl,
      location: location.trim() ? location.trim() : undefined,
    });

    if (!didSave) {
      return;
    }

    setSavedMood(selectedEmotion);
    setShowModal(true);

    setSelectedEmotion(null);
    setIntensity(DEFAULT_INTENSITY);
    setNote("");
    clearImage();
    clearLocation();
  }

  const isBusy = isSaving || isUploading;

  return (
    <div className="min-h-screen bg-[var(--background)] page-enter">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6">
        <section className="py-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            <span className="bg-gradient-to-r from-teal-300 to-indigo-300 bg-clip-text text-transparent">
              Mood Journal
            </span>
          </h1>
          <p className="mt-3 text-sm text-[var(--muted-text)]">Track how you feel over time.</p>
        </section>

        <section className="py-10">
          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Today&apos;s Mood</h2>
                <p className="mt-1 text-xs text-[var(--muted-text)]">Select your mood from the wheel.</p>
                <div className="mt-5">
                  <MoodWheel value={selectedEmotion} onChange={setSelectedEmotion} />
                </div>
              </div>

              {selectedEmotion ? (
                <EmotionIntensitySlider
                  emotion={selectedEmotion}
                  value={intensity}
                  onChange={setIntensity}
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted-text)]">
                  Emotion Intensity appears after mood selection.
                </div>
              )}

              <div className="space-y-3 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 backdrop-blur-sm">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Journal Note (optional)</h3>
                  <p className="mt-1 text-xs text-[var(--subtle-text)]">Capture context behind this mood.</p>
                </div>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Write about your day, what happened, or what helped."
                  rows={5}
                  maxLength={1000}
                  className="w-full resize-none rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4 text-sm text-[var(--foreground)] placeholder:text-[var(--subtle-text)] outline-none transition-all focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20"
                />
                <p className="text-right text-[11px] text-[var(--subtle-text)]">{note.length}/1000</p>
              </div>

              <ImageUploader
                file={file}
                previewUrl={previewUrl}
                isUploading={isUploading}
                uploadError={uploadError}
                onSelectFile={selectFile}
              />

              <LocationPicker
                value={location}
                suggestions={suggestions}
                isLocating={isLocating}
                isSearching={isSearching}
                error={locationError}
                onUseCurrentLocation={useCurrentLocation}
                onChange={setLocationValue}
                onSelectSuggestion={selectSuggestion}
              />

              {(selectedEmotion === "Overwhelmed" || selectedEmotion === "Sad") && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.08] p-4 text-center shadow-[0_0_20px_rgba(239,68,68,0.14)]">
                  <p className="text-sm font-semibold text-red-300">You are not alone. Help is available.</p>
                  <a
                    href="tel:988"
                    className="mt-3 inline-flex rounded-xl border border-red-500/35 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/30"
                  >
                    Call or Text 988 Crisis Lifeline
                  </a>
                </div>
              )}

              <motion.div className="space-y-2">
                <motion.div animate={selectedEmotion ? { scale: [1, 1.02, 1] } : {}} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                  <Button
                    type="submit"
                    isLoading={isBusy}
                    disabled={!selectedEmotion || isBusy}
                    className="w-full relative overflow-hidden"
                  >
                    <span className="relative z-10">Save Journal Entry</span>
                    {selectedMood && (
                      <motion.div
                        className="absolute inset-0 opacity-20"
                        style={{ backgroundColor: selectedMood.color }}
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}
                  </Button>
                </motion.div>
                {isUploading ? <p className="text-xs text-teal-500">Uploading image...</p> : null}
                {isSaving ? <p className="text-xs text-indigo-500">Saving entry...</p> : null}
                {saveSuccess ? <p className="text-xs font-medium text-emerald-300">Entry saved ✓</p> : null}
                {saveError ? <p className="text-xs text-red-300">{saveError}</p> : null}
              </motion.div>
            </form>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Your Stats</h2>
                <p className="mt-1 text-xs text-[var(--subtle-text)]">A quick view of your journaling consistency.</p>
                <div className="mt-5 grid gap-4">
                  <StatsCard
                    label="Day Streak"
                    value={streak}
                    icon="🔥"
                    accentClassName="text-teal-300"
                    helperText="Consecutive days with entries"
                  />
                  <StatsCard
                    label="Total Entries"
                    value={totalEntries}
                    icon="📝"
                    accentClassName="text-indigo-300"
                    helperText="All mood journal entries"
                  />
                  <StatsCard
                    label="This Week"
                    value={thisWeekCount}
                    icon="📅"
                    accentClassName="text-amber-300"
                    helperText="Entries from the last 7 days"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border-soft)] bg-gradient-to-br from-teal-500/10 to-indigo-500/10 p-6">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-text)]">Selected Emotion</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-2xl">{selectedMood?.icon ?? "🫶"}</span>
                  <div>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                      {selectedEmotion ?? "No emotion selected"}
                    </p>
                    <p className="text-xs text-[var(--muted-text)]">
                      {selectedEmotion
                        ? `Intensity: ${intensity}`
                        : "Pick a mood to unlock intensity and save."}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="py-10">
          <MoodBalanceGraph entries={entries} />
        </section>

        {/* AI Insight & Global Pulse Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="pb-10"
        >
          <div className="grid md:grid-cols-2 gap-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            {/* Left Half: Individual Forecast */}
            <div className="flex flex-col justify-center space-y-2">
              <h3 className="text-sm tracking-widest text-[var(--muted-text)] uppercase font-semibold">Individual Forecast</h3>
              {(() => {
                const isHighIntensityStreak = entries.length >= 2 && entries[0].intensity > 70 && entries[1].intensity > 70;
                const isRecoveryForecast = entries.length >= 1 && entries[0].emotion === 'Calm';

                if (isHighIntensityStreak) {
                  return <p className="text-lg font-medium text-[var(--foreground)]">🔥 High Intensity Streak: You are in a high-output phase. Watch for burnout.</p>;
                } else if (isRecoveryForecast) {
                  return <p className="text-lg font-medium text-[var(--foreground)]">🌊 Recovery Forecast: Your energy is stabilizing. Great time for reflection.</p>;
                } else {
                  return <p className="text-lg font-medium text-[var(--foreground)]">✨ Balance Forecast: Your mood is steadily processing. Keep tracking to learn more.</p>;
                }
              })()}
            </div>
            {/* Right Half: Global Pulse */}
            <div className="flex flex-col justify-center space-y-2 border-t border-white/10 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
              <h3 className="text-sm tracking-widest text-[var(--muted-text)] uppercase font-semibold">Community Pulse</h3>
              {communityPulse ? (() => {
                const pulseMood = MOODS.find(m => m.label === communityPulse.dominant_mood);
                const emoji = pulseMood?.icon || '😐';
                return (
                  <p className="text-lg font-medium text-[var(--foreground)] leading-relaxed">
                    🌍 Most users are feeling <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="inline-block">{emoji}</motion.span>. You are part of a global wave of <strong>{communityPulse.dominant_mood}</strong>.
                  </p>
                );
              })() : (
                <p className="text-sm text-[var(--muted-text)]">Gathering global pulse...</p>
              )}
            </div>
          </div>
        </motion.section>

        <section className="py-10">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Journal Timeline</h2>
            <p className="mt-1 text-sm text-[var(--subtle-text)]">Review patterns across your recent mood logs.</p>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-10 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-400/30 border-t-teal-300" />
              <p className="mt-3 text-sm text-[var(--muted-text)]">Loading journal timeline...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-10 text-center">
              <p className="text-lg font-medium text-[var(--foreground)]">No journal entries yet.</p>
              <p className="mt-2 text-sm text-[var(--subtle-text)]">
                Start tracking your mood to build your emotional timeline.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {entries.map((entry) => (
                <JournalEntryCard
                  key={entry.id}
                  entry={entry}
                  isDeleting={deletingId === entry.id}
                  onDelete={deleteEntry}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {showModal && savedMood && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 overflow-hidden"
          >
            <motion.img
              src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80"
              alt="Nature Background"
              className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm mix-blend-overlay pointer-events-none"
              initial={{ scale: 1 }}
              animate={{ scale: 1.1 }}
              transition={{ duration: 20, ease: "linear" }}
            />

            <div className="relative z-10 w-full max-w-2xl bg-black/40 backdrop-blur-md border border-white/20 p-10 rounded-3xl text-center shadow-2xl">
              {(() => {
                let quote = "Every feeling has its own quiet dignity.";
                if (savedMood === "Happy") quote = "Radiate your light; the world is catching your glow.";
                else if (savedMood === "Calm") quote = "Stillness is not the absence of movement, but the presence of peace.";
                else if (savedMood === "Sad") quote = "Tears are the ink with which we write our truest stories.";
                else if (savedMood === "Overwhelmed") quote = "Take a breath. You don't have to carry it all today.";
                else if (savedMood === "Stressed") quote = "Softness is a strength when the world demands you be hard.";

                return (
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl sm:text-4xl font-serif italic text-white leading-relaxed mb-10"
                  >
                    "{quote}"
                  </motion.h2>
                );
              })()}

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button onClick={() => setShowModal(false)} className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-full transition-all">
                  Continue to Dashboard
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
