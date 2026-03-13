"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Smile } from "lucide-react";

interface DailyCheckInReminderProps {
  show: boolean;
  onClick: () => void;
}

export default function DailyCheckInReminder({ show, onClick }: DailyCheckInReminderProps) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="group fixed bottom-6 right-6 z-[60]"
          initial={{ opacity: 0, y: 12, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.88 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            onClick={onClick}
            className="relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-black/70 text-slate-100 shadow-[0_12px_24px_rgba(2,6,23,0.5)] backdrop-blur-md transition hover:bg-black/85"
            aria-label="Open daily check-in"
          >
            <motion.span
              className="inline-flex"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
            >
              <Smile className="h-5 w-5" />
            </motion.span>

            <motion.span
              className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/40 bg-red-500 text-[11px] font-bold text-white"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            >
              !
            </motion.span>
          </button>

          <div className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 rounded-lg border border-white/15 bg-black/85 px-3 py-1.5 text-xs text-slate-100 opacity-0 transition group-hover:opacity-100">
            Daily check-in not completed
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
