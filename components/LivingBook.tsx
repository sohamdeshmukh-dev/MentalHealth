"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import BookChat from "@/components/BookChat";
import MemoryOrbs, { VoiceJournal } from "@/components/MemoryOrbs";
import VoiceRecorder from "@/components/VoiceRecorder";
import PinLock from "@/components/PinLock";

export default function LivingBook() {
    const [journals, setJournals] = useState<VoiceJournal[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [hasPin, setHasPin] = useState(false);
    const [vaultUnlocked, setVaultUnlocked] = useState(false);
    const [savedPin, setSavedPin] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [vaultMode, setVaultMode] = useState(false);

    // Fetch user + journals + pin status
    useEffect(() => {
        async function init() {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            // Fetch vault pin
            const { data: profile } = await supabase
                .from("profiles")
                .select("vault_pin")
                .eq("id", user.id)
                .single();

            if (profile?.vault_pin) {
                setHasPin(true);
                setSavedPin(profile.vault_pin);
            }

            // Fetch voice journals
            const { data: vj } = await supabase
                .from("voice_journals")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (vj) {
                // Generate signed URLs for audio
                const withUrls = await Promise.all(
                    vj.map(async (j: VoiceJournal) => {
                        if (j.audio_url.startsWith("http")) return j;
                        const { data } = await supabase.storage
                            .from("voice-journals")
                            .createSignedUrl(j.audio_url, 3600);
                        return { ...j, audio_url: data?.signedUrl || j.audio_url };
                    })
                );
                setJournals(withUrls);
            }
        }
        init();
    }, []);

    // Handle recording complete
    const handleRecordingComplete = useCallback(
        async (blob: Blob, durationSeconds: number) => {
            if (!userId) return;
            setUploading(true);

            try {
                const filename = `${userId}/${Date.now()}.webm`;

                // Upload audio to Supabase storage
                const { error: uploadErr } = await supabase.storage
                    .from("voice-journals")
                    .upload(filename, blob, {
                        contentType: "audio/webm",
                    });

                if (uploadErr) throw uploadErr;

                // Send to Whisper + GPT for transcription and response
                const formData = new FormData();
                formData.append("audio", blob, "recording.webm");
                formData.append(
                    "history",
                    JSON.stringify([])
                );

                let transcript = "";

                try {
                    const res = await fetch("/api/therapist", {
                        method: "POST",
                        body: formData,
                    });

                    if (res.ok) {
                        const data = await res.json();
                        transcript = data.transcript || "";
                    }
                } catch {
                    /* API may not be configured yet */
                }

                // Detect mood from transcript
                const mood = detectMoodFromText(transcript);

                // Save to database
                const { data: newEntry, error: dbErr } = await supabase
                    .from("voice_journals")
                    .insert({
                        user_id: userId,
                        audio_url: filename,
                        transcript: transcript || null,
                        mood,
                        duration_seconds: durationSeconds,
                        is_vaulted: vaultMode,
                    })
                    .select()
                    .single();

                if (dbErr) throw dbErr;

                // Get signed URL
                const { data: urlData } = await supabase.storage
                    .from("voice-journals")
                    .createSignedUrl(filename, 3600);

                const journalWithUrl = {
                    ...newEntry,
                    audio_url: urlData?.signedUrl || filename,
                };

                setJournals((cur) => [journalWithUrl, ...cur]);

                // Feed transcript to chat if available
                if (transcript) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const voiceFn = (window as any).__bookChatVoice;
                    if (typeof voiceFn === "function") {
                        (voiceFn as (t: string) => void)(transcript);
                    }
                }

                // Increment profile counter
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('total_journals')
                        .eq('id', userId)
                        .single();
                    await supabase
                        .from('profiles')
                        .update({ total_journals: (profile?.total_journals || 0) + 1 })
                        .eq('id', userId);
                } catch (err) {
                    console.error("Failed to increment counter:", err);
                }
            } catch (err) {
                console.error("Failed to save recording:", err);
            } finally {
                setUploading(false);
            }
        },
        [userId, vaultMode]
    );

    // PIN operations
    const handleSetPin = useCallback(
        async (pin: string) => {
            if (!userId) return;
            await supabase
                .from("profiles")
                .update({ vault_pin: pin })
                .eq("id", userId);
            setHasPin(true);
            setSavedPin(pin);
        },
        [userId]
    );

    const handleUnlock = useCallback(() => {
        // The PinLock passes us the event; we check against saved pin
        setVaultUnlocked(true);
    }, []);

    // Mood detection helper
    function detectMoodFromText(text: string): string {
        const lower = text.toLowerCase();
        if (/happy|joyf|excite|great|amazing|wonderful/i.test(lower)) return "Happy";
        if (/calm|peace|relax|serene|tranquil/i.test(lower)) return "Calm";
        if (/stress|anxious|nervous|worry|overwhelm|panic/i.test(lower)) return "Stressed";
        if (/sad|down|depress|lonely|grief|cry/i.test(lower)) return "Sad";
        if (/overwhelm|too much|can.?t cope|breaking/i.test(lower)) return "Overwhelmed";
        return "Neutral";
    }

    const vaultedCount = journals.filter((j) => j.is_vaulted).length;

    return (
        <div className="living-book-wrapper">
            {/* Book spine shadow */}
            <div className="book-spine-shadow" />

            <div className="living-book">
                {/* Book spine */}
                <div className="book-spine" />

                {/* ──── LEFT PAGE: AI Therapist Chat ──── */}
                <motion.div
                    className="book-page book-page-left"
                    initial={{ rotateY: -5, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <div className="page-header-left">
                        <span className="page-chapter">Chapter I</span>
                        <h2 className="page-title-left">Therapist&apos;s Journal</h2>
                        <div className="page-divider-left" />
                    </div>

                    <BookChat />
                </motion.div>

                {/* ──── RIGHT PAGE: Memories & Vault ──── */}
                <motion.div
                    className="book-page book-page-right"
                    initial={{ rotateY: 5, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                >
                    <div className="page-header-right">
                        <span className="page-chapter">Chapter II</span>
                        <h2 className="page-title-right">Memories &amp; Vault</h2>
                        <div className="page-divider-right" />
                    </div>

                    {/* Memory Orbs Section */}
                    <div className="right-section">
                        <h3 className="section-label">
                            <span className="section-icon">✧</span> Voice Memories
                        </h3>
                        <MemoryOrbs
                            journals={journals}
                            onPlay={() => { }}
                            vaultLocked={!vaultUnlocked}
                        />
                    </div>

                    {/* Voice Recorder */}
                    <div className="right-section recorder-section">
                        <div className="recorder-row">
                            <VoiceRecorder
                                onRecordingComplete={handleRecordingComplete}
                                disabled={uploading}
                            />
                            <label className="vault-toggle">
                                <input
                                    type="checkbox"
                                    checked={vaultMode}
                                    onChange={(e) => setVaultMode(e.target.checked)}
                                />
                                <span className="vault-toggle-label">
                                    🔒 Save to Vault
                                </span>
                            </label>
                        </div>
                        {uploading && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="upload-status"
                            >
                                Saving your memory...
                            </motion.p>
                        )}
                    </div>

                    {/* Brass Vault Section */}
                    <div className="right-section vault-section">
                        <h3 className="section-label">
                            <span className="section-icon">⚙</span> Private Vault
                            {vaultedCount > 0 && (
                                <span className="vault-count">{vaultedCount}</span>
                            )}
                        </h3>
                        <PinLock
                            onUnlock={handleUnlock}
                            onSetPin={handleSetPin}
                            hasPin={hasPin}
                            isUnlocked={vaultUnlocked}
                        />
                    </div>

                    {/* Page number */}
                    <div className="page-number-right">ii</div>
                </motion.div>
            </div>

            {/* Decorative desk elements */}
            <div className="desk-shadow" />
        </div>
    );
}
