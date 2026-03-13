"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/* ─── Therapist Prompts ─── */
const THERAPIST_PROMPTS = [
  "How are you really feeling today? Take a moment to check in with yourself.",
  "You've made it through every difficult day so far. What helped you get through yesterday?",
  "What's one small thing today that brought you even a tiny bit of peace?",
  "Your emotions are valid. Do you want to log how you're feeling right now?",
  "Pause for a breath. What's something your mind might need today?",
];

/* ─── localStorage helpers ─── */
const LS_PREFIX = "mentalmap-daily-checkin";

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function readLS(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/** Pick a deterministic-per-day prompt so it stays stable across re-renders. */
function promptForDay(dateKey: string): string {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return THERAPIST_PROMPTS[Math.abs(hash) % THERAPIST_PROMPTS.length];
}

/* ─── Context shape ─── */
interface DailyCheckinState {
  showPopup: boolean;
  checkinCompleted: boolean;
  dismissed: boolean;
  todaysPrompt: string;
  completeCheckin: () => void;
  dismissPopup: () => void;
  reopenPopup: () => void;
}

const DailyCheckinContext = createContext<DailyCheckinState | null>(null);

/* ─── Provider ─── */
export function DailyCheckinProvider({ children }: { children: React.ReactNode }) {
  const dateKey = todayKey();
  const todaysPrompt = useMemo(() => promptForDay(dateKey), [dateKey]);

  const [checkinCompleted, setCheckinCompleted] = useState(() => {
    return readLS(`${LS_PREFIX}-completed`) === dateKey;
  });
  const [dismissed, setDismissed] = useState(() => {
    return readLS(`${LS_PREFIX}-dismissed`) === dateKey;
  });
  const [showPopup, setShowPopup] = useState(false);

  // Show popup on mount if not completed and not dismissed today
  useEffect(() => {
    if (!checkinCompleted && !dismissed) {
      // Small delay so the page has time to render first
      const timer = setTimeout(() => setShowPopup(true), 600);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const completeCheckin = useCallback(() => {
    writeLS(`${LS_PREFIX}-completed`, dateKey);
    setCheckinCompleted(true);
    setDismissed(false);
    setShowPopup(false);
  }, [dateKey]);

  const dismissPopup = useCallback(() => {
    writeLS(`${LS_PREFIX}-dismissed`, dateKey);
    setDismissed(true);
    setShowPopup(false);
  }, [dateKey]);

  const reopenPopup = useCallback(() => {
    setShowPopup(true);
  }, []);

  const value = useMemo<DailyCheckinState>(
    () => ({
      showPopup,
      checkinCompleted,
      dismissed,
      todaysPrompt,
      completeCheckin,
      dismissPopup,
      reopenPopup,
    }),
    [showPopup, checkinCompleted, dismissed, todaysPrompt, completeCheckin, dismissPopup, reopenPopup]
  );

  return <DailyCheckinContext.Provider value={value}>{children}</DailyCheckinContext.Provider>;
}

/* ─── Hook ─── */
export function useDailyCheckin(): DailyCheckinState {
  const ctx = useContext(DailyCheckinContext);
  if (!ctx) {
    throw new Error("useDailyCheckin must be used within a DailyCheckinProvider");
  }
  return ctx;
}
