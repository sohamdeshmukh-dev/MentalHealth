"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface VoiceJournal {
    id: string;
    audio_url: string;
    transcript: string | null;
    mood: string | null;
    duration_seconds: number;
    is_vaulted: boolean;
    created_at: string;
}

interface MemoryOrbsProps {
    journals: VoiceJournal[];
    onPlay: (journal: VoiceJournal) => void;
    vaultLocked: boolean;
}

const MOOD_COLORS: Record<string, [string, string]> = {
    Happy: ["#34d399", "#10b981"],
    Calm: ["#60a5fa", "#3b82f6"],
    Neutral: ["#a78bfa", "#8b5cf6"],
    Sad: ["#fbbf24", "#f59e0b"],
    Stressed: ["#ef4444", "#dc2626"],
    Overwhelmed: ["#fb923c", "#ea580c"],
};

function getOrbColors(mood: string | null): [string, string] {
    if (!mood) return ["#94a3b8", "#64748b"];
    return MOOD_COLORS[mood] || ["#94a3b8", "#64748b"];
}

function formatOrbDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(s: number): string {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
}

export default function MemoryOrbs({ journals, onPlay, vaultLocked }: MemoryOrbsProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [waveData, setWaveData] = useState<number[]>(new Array(24).fill(0));
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animRef = useRef<number>(0);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    // Filter out vaulted journals if vault is locked
    const visibleJournals = journals.filter(
        (j) => !j.is_vaulted || !vaultLocked
    );

    const stopPlayback = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (animRef.current) cancelAnimationFrame(animRef.current);
        setPlayingId(null);
        setProgress(0);
        setWaveData(new Array(24).fill(0));
        analyserRef.current = null;
    }, []);

    useEffect(() => {
        return () => stopPlayback();
    }, [stopPlayback]);

    const handleOrbClick = useCallback(
        (journal: VoiceJournal) => {
            if (journal.is_vaulted && vaultLocked) return;

            if (playingId === journal.id) {
                stopPlayback();
                return;
            }

            stopPlayback();
            setActiveId(journal.id);
            onPlay(journal);

            // Play the audio
            const audio = new Audio(journal.audio_url);
            audioRef.current = audio;

            // Set up Web Audio analyser
            try {
                const ctx = new AudioContext();
                const source = ctx.createMediaElementSource(audio);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 64;
                source.connect(analyser);
                analyser.connect(ctx.destination);
                analyserRef.current = analyser;
            } catch {
                /* AudioContext may fail on some browsers */
            }

            audio.play().catch(() => { });
            setPlayingId(journal.id);

            const updateViz = () => {
                if (!audioRef.current) return;
                setProgress(
                    audioRef.current.duration
                        ? audioRef.current.currentTime / audioRef.current.duration
                        : 0
                );

                if (analyserRef.current) {
                    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(data);
                    const step = Math.floor(data.length / 24);
                    setWaveData(Array.from({ length: 24 }, (_, i) => data[i * step] / 255));
                }

                animRef.current = requestAnimationFrame(updateViz);
            };
            updateViz();

            audio.onended = stopPlayback;
        },
        [playingId, vaultLocked, onPlay, stopPlayback]
    );

    if (visibleJournals.length === 0) {
        return (
            <div className="memory-orbs-empty">
                <p>Your voice memories will appear here</p>
            </div>
        );
    }

    return (
        <div className="memory-orbs-container">
            {/* Scrollable orbs row */}
            <div ref={scrollRef} className="memory-orbs-scroll">
                {visibleJournals.map((j) => {
                    const [c1, c2] = getOrbColors(j.mood);
                    const isPlaying = playingId === j.id;
                    const isActive = activeId === j.id;

                    return (
                        <motion.button
                            key={j.id}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleOrbClick(j)}
                            className={`memory-orb ${isActive ? "memory-orb-active" : ""} ${j.is_vaulted ? "memory-orb-vaulted" : ""}`}
                        >
                            {/* Ring progress */}
                            <svg className="memory-orb-ring" viewBox="0 0 56 56">
                                <circle
                                    cx="28"
                                    cy="28"
                                    r="25"
                                    fill="none"
                                    stroke={isPlaying ? c1 : "transparent"}
                                    strokeWidth="3"
                                    strokeDasharray={`${progress * 157} 157`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 28 28)"
                                    style={{ transition: "stroke-dasharray 0.1s linear" }}
                                />
                            </svg>

                            {/* Gradient circle */}
                            <div
                                className="memory-orb-circle"
                                style={{
                                    background: `linear-gradient(135deg, ${c1}, ${c2})`,
                                    boxShadow: isPlaying ? `0 0 20px ${c1}60` : "none",
                                }}
                            >
                                {j.is_vaulted && vaultLocked && (
                                    <span className="memory-orb-lock">🔒</span>
                                )}
                                {isPlaying && (
                                    <motion.span
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                        className="memory-orb-playing"
                                    >
                                        ▶
                                    </motion.span>
                                )}
                            </div>

                            {/* Label */}
                            <span className="memory-orb-date">{formatOrbDate(j.created_at)}</span>
                            {j.duration_seconds > 0 && (
                                <span className="memory-orb-duration">
                                    {formatDuration(j.duration_seconds)}
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Playback waveform */}
            <AnimatePresence>
                {playingId && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 40 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="memory-playback-wave"
                    >
                        {waveData.map((v, i) => (
                            <motion.div
                                key={i}
                                className="memory-wave-bar"
                                animate={{ height: `${Math.max(3, v * 32)}px` }}
                                transition={{ duration: 0.06 }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transcript preview */}
            <AnimatePresence>
                {activeId && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="memory-transcript"
                    >
                        {visibleJournals.find((j) => j.id === activeId)?.transcript || (
                            <em className="memory-no-transcript">No transcript available</em>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
