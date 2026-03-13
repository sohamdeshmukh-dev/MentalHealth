"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDailyCheckin } from "@/hooks/DailyCheckinContext";

export default function DailyTherapistPrompt() {
  const { showPopup, todaysPrompt, completeCheckin, dismissPopup } = useDailyCheckin();
  const router = useRouter();

  return (
    <AnimatePresence>
      {showPopup && (
        <motion.div
          className="daily-checkin-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            className="daily-checkin-card"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {/* Close button */}
            <button
              className="daily-checkin-close"
              onClick={dismissPopup}
              aria-label="Close daily check-in"
            >
              ✕
            </button>

            {/* Decorative icon */}
            <div className="daily-checkin-icon">🌿</div>

            {/* Title */}
            <h2 className="daily-checkin-title">Daily Check-In</h2>

            {/* Prompt */}
            <p className="daily-checkin-prompt">{todaysPrompt}</p>

            {/* Actions */}
            <div className="daily-checkin-actions">
              <button
                className="daily-checkin-btn daily-checkin-btn-primary"
                onClick={() => {
                  completeCheckin();
                  router.push("/journal");
                }}
              >
                Start Check-in
              </button>
              <button
                className="daily-checkin-btn daily-checkin-btn-secondary"
                onClick={dismissPopup}
              >
                Remind Me Later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
