"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  JournalEntry,
  JournalEntryDraft,
  mapJournalEntryFromDb,
  type DatabaseJournalEntry,
} from "@/lib/journal";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong.";
}

function isMissingColumnError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the") ||
    normalized.includes("schema cache") ||
    (normalized.includes("column") && normalized.includes("does not exist"))
  );
}

export function useMoodEntry() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user?.id) {
        setEntries([]);
        return;
      }

      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const mappedEntries = (data || []).map((entry) =>
        mapJournalEntryFromDb(entry as DatabaseJournalEntry)
      );
      setEntries(mappedEntries);
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchEntries();

    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
    };
  }, [fetchEntries]);

  const saveEntry = useCallback(
    async (draft: JournalEntryDraft) => {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(authError.message);
        }

        if (!user?.id) {
          throw new Error("Please log in before saving journal entries.");
        }

        const clampedIntensity = Math.max(1, Math.min(100, Math.round(draft.intensity)));
        const fullPayload = {
          user_id: user.id,
          mood: draft.emotion,
          intensity: clampedIntensity,
          journal_text: draft.note?.slice(0, 1000) ?? "",
          image_url: draft.imageUrl ?? null,
          location: draft.location?.slice(0, 160) ?? null,
        };

        const payloadVariants = [
          fullPayload,
          {
            user_id: fullPayload.user_id,
            mood: fullPayload.mood,
            intensity: fullPayload.intensity,
            journal_text: fullPayload.journal_text,
            location: fullPayload.location,
          },
          {
            user_id: fullPayload.user_id,
            mood: fullPayload.mood,
            intensity: fullPayload.intensity,
            journal_text: fullPayload.journal_text,
          },
          {
            user_id: fullPayload.user_id,
            mood: fullPayload.mood,
            journal_text: fullPayload.journal_text,
          },
        ];

        let inserted: DatabaseJournalEntry | null = null;
        let lastErrorMessage = "Failed to save journal entry.";

        for (const payload of payloadVariants) {
          const { data, error } = await supabase
            .from("journal_entries")
            .insert(payload)
            .select("*")
            .single();

          if (!error && data) {
            inserted = data as DatabaseJournalEntry;
            break;
          }

          const message = error?.message || "Failed to save journal entry.";
          lastErrorMessage = message;

          if (!isMissingColumnError(message)) {
            break;
          }
        }

        if (!inserted) {
          throw new Error(lastErrorMessage);
        }

        const mapped = mapJournalEntryFromDb(inserted);
        setEntries((current) => [mapped, ...current]);

        // 1. Increment Logic: Update the profile counter
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('total_journals')
            .eq('id', user.id)
            .single();

          const currentTotal = profileData?.total_journals || 0;
          await supabase
            .from('profiles')
            .update({ total_journals: currentTotal + 1 })
            .eq('id', user.id);
        } catch (err) {
          console.error("Failed to increment journal counter:", err);
        }

        setSaveSuccess(true);
        if (successTimer.current) {
          clearTimeout(successTimer.current);
        }
        successTimer.current = setTimeout(() => {
          setSaveSuccess(false);
        }, 2400);

        return true;
      } catch (error) {
        const message = getErrorMessage(error);
        setSaveError(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [supabase]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      setDeletingId(id);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(authError.message);
        }

        if (!user?.id) {
          throw new Error("Please log in before deleting entries.");
        }

        const { error } = await supabase
          .from("journal_entries")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) {
          throw new Error(error.message);
        }

        setEntries((current) => current.filter((entry) => entry.id !== id));
      } catch (error) {
        setSaveError(getErrorMessage(error));
      } finally {
        setDeletingId(null);
      }
    },
    [supabase]
  );

  return {
    entries,
    isLoading,
    isSaving,
    saveError,
    saveSuccess,
    deletingId,
    fetchEntries,
    saveEntry,
    deleteEntry,
  };
}
