"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useMemo, useState } from "react";

const DAILY_CHECK_IN_COMPLETED_KEY = "mentalmap-daily-check-in-completed";
const DAILY_CHECK_IN_DISMISSED_KEY = "mentalmap-daily-check-in-dismissed";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getTodayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function readFromStorage(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}

function removeFromStorage(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage removal failures.
  }
}

export function markDailyCheckInCompleted(date = new Date()) {
  const todayKey = getTodayKey(date);
  writeToStorage(DAILY_CHECK_IN_COMPLETED_KEY, todayKey);
  removeFromStorage(DAILY_CHECK_IN_DISMISSED_KEY);
}

export function useDailyCheckIn() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isCompletedToday, setIsCompletedToday] = useState(false);
  const [isDismissedToday, setIsDismissedToday] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);

  const syncDailyState = useCallback(async () => {
    const todayKey = getTodayKey();
    const completedFromStorage = readFromStorage(DAILY_CHECK_IN_COMPLETED_KEY) === todayKey;
    const dismissedFromStorage = readFromStorage(DAILY_CHECK_IN_DISMISSED_KEY) === todayKey;

    setIsCompletedToday(completedFromStorage);
    setIsDismissedToday(dismissedFromStorage);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user?.id) {
        setIsCardOpen(!completedFromStorage && !dismissedFromStorage);
        return;
      }

      const { start, end } = getTodayBounds();

      const { count, error } = await supabase
        .from("journal_entries")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());

      if (error) {
        throw new Error(error.message);
      }

      const hasEntryToday = (count ?? 0) > 0;
      if (hasEntryToday) {
        markDailyCheckInCompleted();
        setIsCompletedToday(true);
        setIsDismissedToday(false);
        setIsCardOpen(false);
        return;
      }

      setIsCompletedToday(false);
      setIsDismissedToday(dismissedFromStorage);
      setIsCardOpen(!dismissedFromStorage);
    } catch (error) {
      console.error("Failed to sync daily check-in:", error);
      setIsCardOpen(!completedFromStorage && !dismissedFromStorage);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void syncDailyState();

    function handleFocus() {
      void syncDailyState();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void syncDailyState();
      }
    }

    function handleStorageChange() {
      void syncDailyState();
    }

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncDailyState]);

  const dismissCard = useCallback(() => {
    writeToStorage(DAILY_CHECK_IN_DISMISSED_KEY, getTodayKey());
    setIsDismissedToday(true);
    setIsCardOpen(false);
  }, []);

  const reopenCard = useCallback(() => {
    removeFromStorage(DAILY_CHECK_IN_DISMISSED_KEY);
    setIsDismissedToday(false);
    setIsCardOpen(true);
  }, []);

  const startCheckIn = useCallback(() => {
    setIsCardOpen(false);
  }, []);

  const markCompleted = useCallback(() => {
    markDailyCheckInCompleted();
    setIsCompletedToday(true);
    setIsDismissedToday(false);
    setIsCardOpen(false);
  }, []);

  const showCard = !isLoading && !isCompletedToday && isCardOpen;
  const showReminder = !isLoading && !isCompletedToday && !isCardOpen && isDismissedToday;

  return {
    isLoading,
    isCompletedToday,
    showCard,
    showReminder,
    dismissCard,
    reopenCard,
    startCheckIn,
    markCompleted,
    refreshStatus: syncDailyState,
  };
}
