"use client";

import { Mood, MOODS } from "@/lib/types";

interface EmotionIntensitySliderProps {
  emotion: Mood;
  value: number;
  onChange: (nextValue: number) => void;
}

export default function EmotionIntensitySlider({
  emotion,
  value,
  onChange,
}: EmotionIntensitySliderProps) {
  const moodConfig = MOODS.find((mood) => mood.label === emotion);
  const color = moodConfig?.color ?? "#14b8a6";
  const normalized = Math.max(1, Math.min(100, value));
  const progress = ((normalized - 1) / 99) * 100;

  return (
    <div className="space-y-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 shadow-[var(--panel-shadow)] backdrop-blur-sm">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-text)]">Emotion Intensity</p>
        <p className="text-sm text-[var(--foreground)]">
          You selected: <span className="font-semibold" style={{ color }}>{emotion}</span>
        </p>
        <p className="text-xs text-[var(--muted-text)]">How strongly do you feel this emotion?</p>
      </div>

      <div className="space-y-3">
        <input
          type="range"
          min={1}
          max={100}
          value={normalized}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-400/50"
          style={{
            background: `linear-gradient(90deg, ${color} 0%, ${color} ${progress}%, rgba(51,65,85,0.85) ${progress}%, rgba(51,65,85,0.85) 100%)`,
            transition: "background 120ms linear",
          }}
          aria-label={`${emotion} intensity`}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--subtle-text)]">1</span>
          <span
            className="min-w-14 rounded-xl border border-[var(--border-soft)] px-3 py-1 text-center text-sm font-semibold text-[var(--foreground)]"
            style={{ boxShadow: `0 0 18px ${color}30` }}
          >
            {normalized}
          </span>
          <span className="text-[11px] text-[var(--subtle-text)]">100</span>
        </div>
      </div>
    </div>
  );
}
