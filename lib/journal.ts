import { Mood, MOODS } from "@/lib/types";

export type Emotion = Mood;

export const EMOTION_BALANCE_WEIGHTS: Record<Emotion, number> = {
  Happy: 1,
  Calm: 0.7,
  Neutral: 0,
  Sad: -0.6,
  Overwhelmed: -0.9,
  Stressed: -1,
};

export interface JournalEntry {
  id: string;
  emotion: Emotion;
  intensity: number;
  note?: string;
  imageUrl?: string;
  location?: string;
  createdAt: string;
}

export interface JournalEntryDraft {
  emotion: Emotion;
  intensity: number;
  note?: string;
  imageUrl?: string;
  location?: string;
}

interface DatabaseJournalEntry {
  id: string;
  mood?: string | null;
  intensity?: number | null;
  journal_text?: string | null;
  image_url?: string | null;
  location?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
}

const VALID_MOODS = new Set<Emotion>(MOODS.map((mood) => mood.label));

export function normalizeEmotion(raw: string): Emotion {
  if (VALID_MOODS.has(raw as Emotion)) {
    return raw as Emotion;
  }
  return "Neutral";
}

export function mapJournalEntryFromDb(entry: DatabaseJournalEntry): JournalEntry {
  const createdAt =
    (typeof entry.created_at === "string" && entry.created_at) ||
    (typeof entry.createdAt === "string" && entry.createdAt) ||
    new Date().toISOString();
  const mood = typeof entry.mood === "string" ? entry.mood : "Neutral";

  return {
    id: entry.id,
    emotion: normalizeEmotion(mood),
    intensity: Number.isFinite(entry.intensity) ? Math.max(1, Math.min(100, Number(entry.intensity))) : 50,
    note: entry.journal_text?.trim() ? entry.journal_text : undefined,
    imageUrl: entry.image_url || undefined,
    location: entry.location?.trim() ? entry.location : undefined,
    createdAt,
  };
}

export function getEmotionalBalanceScore(emotion: Emotion, intensity: number) {
  const clampedIntensity = Math.max(1, Math.min(100, Number(intensity) || 1));
  const normalizedIntensity = clampedIntensity / 100;
  const score = EMOTION_BALANCE_WEIGHTS[emotion] * normalizedIntensity;
  return Math.max(-1, Math.min(1, Number(score.toFixed(3))));
}

export type { DatabaseJournalEntry };
