"use client";

import dynamic from "next/dynamic";
import { Mood } from "@/lib/types";

const EmotionWheelSelector = dynamic(() => import("@/components/EmotionWheelSelector"), {
  ssr: false,
  loading: () => (
    <div
      className="relative mx-auto aspect-square w-full max-w-[320px] rounded-full border border-slate-700/70 bg-slate-900/60"
      aria-hidden
    />
  ),
});

interface MoodWheelProps {
  value: Mood | null;
  onChange: (emotion: Mood) => void;
}

export default function MoodWheel({ value, onChange }: MoodWheelProps) {
  return <EmotionWheelSelector value={value} onChange={onChange} />;
}
