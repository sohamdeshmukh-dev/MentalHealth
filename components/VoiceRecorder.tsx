"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

interface VoiceRecorderProps {
    onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
    disabled?: boolean;
}

export default function VoiceRecorder({
    onRecordingComplete,
    disabled = false,
}: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [analyserData, setAnalyserData] = useState<number[]>(new Array(32).fill(0));
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    const updateWaveform = useCallback(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        // Sample 32 bars from the frequency data
        const step = Math.floor(data.length / 32);
        const bars = Array.from({ length: 32 }, (_, i) => data[i * step] / 255);
        setAnalyserData(bars);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
    }, []);

    const startRecording = useCallback(async () => {
        if (disabled) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Set up analyser for waveform
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            source.connect(analyser);
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                    ? "audio/webm;codecs=opus"
                    : "audio/webm",
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
                onRecordingComplete(blob, elapsed);

                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                analyserRef.current = null;
            };

            mediaRecorder.start(100);
            startTimeRef.current = Date.now();
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
            }, 200);

            updateWaveform();
        } catch (err) {
            console.error("Microphone access denied:", err);
        }
    }, [disabled, onRecordingComplete, updateWaveform]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            setAnalyserData(new Array(32).fill(0));
        }
    }, [isRecording]);

    const formatDuration = (s: number) => {
        const m = String(Math.floor(s / 60)).padStart(2, "0");
        const sec = String(s % 60).padStart(2, "0");
        return `${m}:${sec}`;
    };

    return (
        <div className="voice-recorder">
            {/* Waveform visualization */}
            {isRecording && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 48 }}
                    className="voice-waveform"
                >
                    {analyserData.map((v, i) => (
                        <motion.div
                            key={i}
                            className="voice-waveform-bar"
                            animate={{ height: `${Math.max(4, v * 40)}px` }}
                            transition={{ duration: 0.08 }}
                        />
                    ))}
                </motion.div>
            )}

            <div className="voice-controls">
                {isRecording && (
                    <span className="voice-duration">{formatDuration(duration)}</span>
                )}

                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={isRecording ? stopRecording : undefined}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    disabled={disabled}
                    className={`voice-mic-btn ${isRecording ? "voice-mic-recording" : ""}`}
                    title="Hold to record"
                >
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                </motion.button>

                {isRecording && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="voice-recording-label"
                    >
                        Recording...
                    </motion.span>
                )}

                {!isRecording && (
                    <span className="voice-hint">Hold to speak</span>
                )}
            </div>
        </div>
    );
}
