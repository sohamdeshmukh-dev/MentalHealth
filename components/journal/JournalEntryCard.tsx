"use client";

import { useState } from "react";
import { JournalEntry, MOODS } from "@/lib/types";

interface JournalEntryCardProps {
  entry: JournalEntry;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export default function JournalEntryCard({
  entry,
  onDelete,
  isDeleting,
}: JournalEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const moodConfig = MOODS.find((m) => m.label === entry.mood);

  const formattedDate = new Date(entry.created_at).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const hasDetails =
    entry.journal_text || entry.image_url || entry.location;
  const isLongText = (entry.journal_text?.length ?? 0) > 120;

  return (
    <div
      className={`group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.035] hover:shadow-lg hover:shadow-black/20 ${
        isExpanded ? "ring-1 ring-white/[0.08]" : ""
      }`}
    >
      {/* Main row */}
      <div
        className={`flex items-start justify-between p-4 ${
          hasDetails ? "cursor-pointer" : ""
        }`}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3 min-w-0">
          {/* Mood icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-transform duration-200 group-hover:scale-110"
            style={{
              backgroundColor: moodConfig
                ? `${moodConfig.color}15`
                : "rgba(167,139,250,0.08)",
              boxShadow: moodConfig
                ? `0 0 12px ${moodConfig.color}10`
                : "none",
            }}
          >
            {moodConfig?.icon || "😐"}
          </div>

          <div className="min-w-0 flex-1">
            {/* Mood label + metadata */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                className="text-sm font-semibold"
                style={{ color: moodConfig?.color || "#a78bfa" }}
              >
                {entry.mood}
              </span>

              {entry.location && (
                <span className="flex items-center gap-0.5 text-[11px] text-slate-500">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  <span className="max-w-[120px] truncate">
                    {entry.location}
                  </span>
                </span>
              )}

              {entry.image_url && (
                <span className="flex items-center gap-0.5 text-[11px] text-slate-500">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                    />
                  </svg>
                  Photo
                </span>
              )}
            </div>

            {/* Text preview (collapsed) */}
            {entry.journal_text && !isExpanded && (
              <p className="mt-1 text-[13px] leading-relaxed text-slate-400/90 line-clamp-2">
                {entry.journal_text}
              </p>
            )}

            {/* Timestamp */}
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formattedDate}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 ml-2">
          {hasDetails && (
            <div
              className={`text-slate-500 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-slate-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
            title="Delete entry"
          >
            {isDeleting ? (
              <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />
            ) : (
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 space-y-3 journal-expand">
          {/* Full journal text */}
          {entry.journal_text && (
            <p className="text-[13px] leading-relaxed text-slate-300/90 whitespace-pre-wrap">
              {entry.journal_text}
            </p>
          )}

          {/* Image */}
          {entry.image_url && (
            <div className="overflow-hidden rounded-xl border border-white/[0.06]">
              <img
                src={entry.image_url}
                alt="Journal entry"
                className="w-full max-h-60 object-cover"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
