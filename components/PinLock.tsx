"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PinLockProps {
    onUnlock: () => void;
    onSetPin?: (pin: string) => void;
    hasPin: boolean;
    isUnlocked: boolean;
}

export default function PinLock({ onUnlock, onSetPin, hasPin, isUnlocked }: PinLockProps) {
    const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
    const [error, setError] = useState(false);
    const [mode, setMode] = useState<"locked" | "entering" | "setting">("locked");
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleDigitChange = useCallback(
        (index: number, value: string) => {
            if (!/^\d?$/.test(value)) return;

            const next = [...digits];
            next[index] = value;
            setDigits(next);
            setError(false);

            if (value && index < 3) {
                inputRefs.current[index + 1]?.focus();
            }

            // Auto-submit when all 4 digits are entered
            if (value && index === 3 && next.every((d) => d !== "")) {
                const pin = next.join("");
                if (mode === "setting" && onSetPin) {
                    onSetPin(pin);
                    setMode("locked");
                    setDigits(["", "", "", ""]);
                } else {
                    // parent handles verification
                    onUnlock();
                }
            }
        },
        [digits, mode, onSetPin, onUnlock]
    );

    const handleKeyDown = useCallback(
        (index: number, e: React.KeyboardEvent) => {
            if (e.key === "Backspace" && !digits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        },
        [digits]
    );

    if (isUnlocked) {
        return (
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="vault-lock-open"
            >
                <div className="vault-lock-icon">🔓</div>
                <p className="vault-status-text">Vault Unlocked</p>
            </motion.div>
        );
    }

    if (mode === "locked") {
        return (
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode(hasPin ? "entering" : "setting")}
                className="vault-lock-button"
            >
                <div className="vault-lock-icon">🔒</div>
                <p className="vault-lock-label">
                    {hasPin ? "Enter PIN to unlock" : "Set a PIN to protect your vault"}
                </p>
                <div className="vault-brass-plate">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="vault-dot" />
                    ))}
                </div>
            </motion.button>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="vault-pin-entry"
            >
                <p className="vault-pin-title">
                    {mode === "setting" ? "Create your 4-digit PIN" : "Enter your PIN"}
                </p>

                <div className="vault-pin-inputs">
                    {[0, 1, 2, 3].map((i) => (
                        <input
                            key={i}
                            ref={(el) => { inputRefs.current[i] = el; }}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digits[i]}
                            onChange={(e) => handleDigitChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            className={`vault-pin-digit ${error ? "vault-pin-error" : ""}`}
                            autoFocus={i === 0}
                        />
                    ))}
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="vault-error-text"
                    >
                        Incorrect PIN. Try again.
                    </motion.p>
                )}

                <button
                    onClick={() => {
                        setMode("locked");
                        setDigits(["", "", "", ""]);
                        setError(false);
                    }}
                    className="vault-cancel-btn"
                >
                    Cancel
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
