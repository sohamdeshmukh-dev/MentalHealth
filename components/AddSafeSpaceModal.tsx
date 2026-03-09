"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface AddSafeSpaceModalProps {
    lat: number;
    lng: number;
    onClose: () => void;
    onAdded: () => void;
}

const CATEGORIES = ["Parks", "Libraries", "Quiet Cafés", "Meditation Rooms", "Campus Spaces"];
const TAG_OPTIONS = ["calm", "safe", "quiet", "good for studying", "stressful"];

const TAG_COLORS: Record<string, string> = {
    calm: "rgba(52,211,153,0.2)",
    safe: "rgba(99,102,241,0.2)",
    quiet: "rgba(96,165,250,0.2)",
    "good for studying": "rgba(251,191,36,0.2)",
    stressful: "rgba(239,68,68,0.2)",
};

const TAG_BORDER: Record<string, string> = {
    calm: "rgba(52,211,153,0.6)",
    safe: "rgba(99,102,241,0.6)",
    quiet: "rgba(96,165,250,0.6)",
    "good for studying": "rgba(251,191,36,0.6)",
    stressful: "rgba(239,68,68,0.6)",
};

export default function AddSafeSpaceModal({ lat, lng, onClose, onAdded }: AddSafeSpaceModalProps) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [tags, setTags] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function toggleTag(tag: string) {
        setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const { error: dbErr } = await supabase
                .from("safe_spaces")
                .insert([{ name: name.trim(), category, lat, lng, tags }]);
            if (dbErr) throw dbErr;
            onAdded();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to save. Check Supabase RLS.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        /* Backdrop */
        <div
            style={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
            }}
            onClick={onClose}
        >
            {/* Card — stop propagation so clicking inside doesn't close */}
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: 420,
                    background: "#0d1420",
                    border: "1px solid rgba(129,140,248,0.25)",
                    borderRadius: 20,
                    padding: 28,
                    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                }}
            >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h2 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 17, margin: 0 }}>
                            📍 Tag a Safe Space
                        </h2>
                        <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
                            {lat.toFixed(5)}, {lng.toFixed(5)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8,
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "4px 10px",
                            fontSize: 13,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Name */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Location Name
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="e.g. Quiet Reading Nook, Sunlit Park..."
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 10,
                            color: "#f1f5f9",
                            fontSize: 14,
                            padding: "10px 14px",
                            outline: "none",
                            width: "100%",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                {/* Category */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Category
                    </label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{
                            background: "#111827",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 10,
                            color: "#f1f5f9",
                            fontSize: 14,
                            padding: "10px 14px",
                            outline: "none",
                            width: "100%",
                        }}
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Tags */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Tags (select all that apply)
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {TAG_OPTIONS.map((tag) => {
                            const active = tags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    style={{
                                        padding: "6px 14px",
                                        borderRadius: 9999,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        border: `1px solid ${active ? TAG_BORDER[tag] : "rgba(255,255,255,0.1)"}`,
                                        background: active ? TAG_COLORS[tag] : "rgba(255,255,255,0.04)",
                                        color: active ? "#f1f5f9" : "#64748b",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {error && (
                    <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting || !name.trim()}
                    style={{
                        background: submitting ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.85)",
                        border: "1px solid rgba(129,140,248,0.5)",
                        borderRadius: 10,
                        color: "#e0e7ff",
                        cursor: submitting ? "not-allowed" : "pointer",
                        fontSize: 14,
                        fontWeight: 700,
                        padding: "12px",
                        transition: "all 0.2s ease",
                        opacity: !name.trim() ? 0.5 : 1,
                    }}
                >
                    {submitting ? "Saving..." : "✅ Save Safe Space"}
                </button>
            </form>
        </div>
    );
}
