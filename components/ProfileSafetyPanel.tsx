"use client";

import { useState } from "react";

interface Contact {
    id: string;
    name: string;
    phone: string;
    relationship?: string;
}

interface ProfileSafetyPanelProps {
    profile: any;
    contacts: Contact[];
    journalCount: number;
    checkinCount: number;
    onUpdateProfile: (updates: Record<string, any>) => void;
    onAddContact: (contact: { name: string; phone: string; relationship: string }) => void;
    onDeleteContact: (id: string) => void;
    onExportData: () => void;
    onDeleteAllJournal: () => void;
}

export default function ProfileSafetyPanel({
    profile,
    contacts,
    journalCount,
    checkinCount,
    onUpdateProfile,
    onAddContact,
    onDeleteContact,
    onExportData,
    onDeleteAllJournal,
}: ProfileSafetyPanelProps) {
    const [showAddContact, setShowAddContact] = useState(false);
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactRelation, setContactRelation] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    function handleAddContact(e: React.FormEvent) {
        e.preventDefault();
        if (!contactName || !contactPhone) return;
        onAddContact({ name: contactName, phone: contactPhone, relationship: contactRelation });
        setContactName("");
        setContactPhone("");
        setContactRelation("");
        setShowAddContact(false);
    }

    return (
        <div className="space-y-6">
            {/* Safety Features */}
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                    <span>🛡️</span> Safety Features
                </h2>

                {/* Emergency Contacts */}
                <div className="mb-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <span>🆘</span> Emergency Contacts
                    </h3>
                    <div className="space-y-2 mb-3">
                        {contacts.length === 0 ? (
                            <p className="text-[13px] text-slate-500">No emergency contacts added yet.</p>
                        ) : (
                            contacts.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 group"
                                >
                                    <div>
                                        <div className="text-sm font-medium text-white">{c.name}</div>
                                        <div className="text-[11px] text-slate-400">
                                            {c.phone} {c.relationship && `· ${c.relationship}`}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a
                                            href={`tel:${c.phone}`}
                                            className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-all"
                                        >
                                            📞 Call
                                        </a>
                                        <button
                                            onClick={() => onDeleteContact(c.id)}
                                            className="opacity-0 group-hover:opacity-100 rounded-lg bg-red-500/10 px-2 py-1.5 text-[11px] text-red-400 hover:bg-red-500/20 transition-all"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {showAddContact ? (
                        <form onSubmit={handleAddContact} className="space-y-2 rounded-xl border border-teal-500/20 bg-teal-500/[0.05] p-3">
                            <input
                                type="text"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                placeholder="Name"
                                required
                                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500/40 focus:outline-none"
                            />
                            <input
                                type="tel"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="Phone number"
                                required
                                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500/40 focus:outline-none"
                            />
                            <input
                                type="text"
                                value={contactRelation}
                                onChange={(e) => setContactRelation(e.target.value)}
                                placeholder="Relationship (optional)"
                                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500/40 focus:outline-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
                                >
                                    Save Contact
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddContact(false)}
                                    className="rounded-lg bg-white/[0.05] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button
                            onClick={() => setShowAddContact(true)}
                            className="w-full rounded-xl border border-dashed border-white/[0.1] py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:border-teal-500/30 transition-all"
                        >
                            + Add Emergency Contact
                        </button>
                    )}
                </div>

                {/* Crisis Resources */}
                <div className="mb-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">🔴 Crisis Resources</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <a
                            href="tel:988"
                            className="rounded-xl border border-red-500/30 bg-red-500/[0.08] p-3 text-center hover:bg-red-500/15 transition-colors"
                        >
                            <div className="text-lg mb-1">📞</div>
                            <div className="text-xs font-semibold text-red-400">988 Suicide & Crisis Lifeline</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Call or text 988</div>
                        </a>
                        <a
                            href="sms:741741&body=HELLO"
                            className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-center hover:bg-amber-500/12 transition-colors"
                        >
                            <div className="text-lg mb-1">💬</div>
                            <div className="text-xs font-semibold text-amber-400">Crisis Text Line</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Text HOME to 741741</div>
                        </a>
                    </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <div>
                            <div className="text-sm font-medium text-white">🎭 Anonymous Mode</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">Hide your identity from others</div>
                        </div>
                        <button
                            onClick={() => onUpdateProfile({ anonymous_mode: !profile.anonymous_mode })}
                            className={`relative h-7 w-12 rounded-full transition-colors ${profile.anonymous_mode ? "bg-teal-600" : "bg-slate-700"
                                }`}
                        >
                            <div
                                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${profile.anonymous_mode ? "translate-x-5" : "translate-x-0.5"
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <div>
                            <div className="text-sm font-medium text-white">💝 Share Mood with Friends</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">Let friends see your current mood</div>
                        </div>
                        <button
                            onClick={() => onUpdateProfile({ share_mood: !profile.share_mood })}
                            className={`relative h-7 w-12 rounded-full transition-colors ${profile.share_mood ? "bg-teal-600" : "bg-slate-700"
                                }`}
                        >
                            <div
                                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${profile.share_mood ? "translate-x-5" : "translate-x-0.5"
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* AI Support Link */}
                <div className="mt-5">
                    <button className="w-full rounded-2xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/20 p-4 text-center hover:from-violet-600/30 hover:to-indigo-600/30 transition-all group">
                        <div className="text-xl mb-1">🤖</div>
                        <div className="text-sm font-semibold text-violet-300 group-hover:text-violet-200">
                            AI Wellness Assistant
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                            Get personalized insights based on your journal
                        </div>
                    </button>
                </div>
            </div>

            {/* Privacy Controls */}
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                    <span>🔒</span> Privacy
                </h2>

                {/* Mood Visibility */}
                <div className="mb-4">
                    <label className="text-sm font-medium text-slate-300 mb-2 block">
                        Who can see your mood activity?
                    </label>
                    <div className="flex gap-2">
                        {["friends", "nobody", "everyone"].map((option) => (
                            <button
                                key={option}
                                onClick={() => onUpdateProfile({ mood_visibility: option })}
                                className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-all ${profile.mood_visibility === option
                                        ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                                        : "bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-white"
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Data Actions */}
                <div className="space-y-2">
                    <button
                        onClick={onExportData}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2"
                    >
                        <span>📦</span> Export My Data
                    </button>

                    {confirmDelete ? (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.08] p-4 text-center space-y-2">
                            <p className="text-sm text-red-400 font-medium">
                                This will permanently delete all journal entries. Are you sure?
                            </p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => { onDeleteAllJournal(); setConfirmDelete(false); }}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
                                >
                                    Yes, Delete All
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="rounded-lg bg-white/[0.05] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="w-full rounded-xl border border-red-500/20 bg-red-500/[0.05] py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                        >
                            <span>🗑️</span> Delete All Journal Entries
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
