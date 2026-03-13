"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";

interface DailyCheckInCardProps {
  isOpen: boolean;
  onStartCheckIn: () => void;
  onDismiss: () => void;
}

export default function DailyCheckInCard({
  isOpen,
  onStartCheckIn,
  onDismiss,
}: DailyCheckInCardProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <motion.div
            className="pointer-events-auto relative aspect-square w-[min(92vw,360px)] overflow-hidden rounded-[22px] border border-white/20 bg-black/55 p-7 text-center shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.93, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 18 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.2),transparent_60%)]" />

            <button
              type="button"
              onClick={onDismiss}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/40 text-sm text-slate-300 transition hover:bg-black/60 hover:text-white"
              aria-label="Dismiss daily check-in"
            >
              ✕
            </button>

            <div className="relative flex h-full flex-col items-center justify-center gap-5">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200/25 bg-teal-400/15 text-teal-200">
                <Heart className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">Daily Check-In</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-200/85">
                  Take a minute to check in with yourself today.
                </p>
              </div>

              <button
                type="button"
                onClick={onStartCheckIn}
                className="w-full rounded-xl border border-teal-300/30 bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(20,184,166,0.35)] transition hover:brightness-110"
              >
                Start Check-In
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
