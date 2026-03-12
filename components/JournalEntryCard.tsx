"use client";

import { useMemo, useState } from "react";
import { JournalEntry } from "@/lib/journal";
import { MOODS } from "@/lib/types";
import Button from "@/components/Button";

interface JournalEntryCardProps {
  entry: JournalEntry;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function JournalEntryCard({ entry, isDeleting, onDelete }: JournalEntryCardProps) {
  const moodConfig = useMemo(() => MOODS.find((mood) => mood.label === entry.emotion), [entry.emotion]);
  const [isExpanded, setIsExpanded] = useState(false);
  const note = entry.note?.trim() ?? "";
  const isLongNote = note.length > 180;
  const noteToShow = !isExpanded && isLongNote ? `${note.slice(0, 180).trimEnd()}...` : note;

  return (
    <article className="group rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 shadow-[var(--panel-shadow)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              {moodConfig?.icon ?? "😐"}
            </span>
            <p className="text-sm font-semibold" style={{ color: moodConfig?.color ?? "#a78bfa" }}>
              {entry.emotion}
            </p>
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted-text)]">
              Intensity: {entry.intensity}
            </span>
          </div>

          {entry.location ? <p className="text-xs text-[var(--muted-text)]">📍 {entry.location}</p> : null}
          <p className="text-xs text-[var(--subtle-text)]">🕒 {formatTimestamp(entry.createdAt)}</p>
        </div>

        <Button
          variant="ghost"
          onClick={() => onDelete(entry.id)}
          isLoading={isDeleting}
          className="rounded-xl px-3 py-2 text-xs"
          aria-label="Delete journal entry"
        >
          Delete
        </Button>
      </div>

      {entry.imageUrl ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)]">
          <img
            src={entry.imageUrl}
            alt="Journal context"
            className="h-36 w-full object-cover opacity-95 transition-all duration-300 group-hover:scale-[1.02] group-hover:opacity-100"
            loading="lazy"
          />
        </div>
      ) : null}

      {note ? (
        <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4">
          <p className="text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">{noteToShow}</p>
          {isLongNote ? (
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="mt-3 text-xs font-medium text-teal-400 transition-colors hover:text-teal-300"
            >
              {isExpanded ? "Hide details" : "Expand details"}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
