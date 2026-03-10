"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import ProfileSafetyPanel from "@/components/ProfileSafetyPanel";

const AVATARS = [
    "https://api.dicebear.com/7.x/shapes/svg?seed=Felix",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Luna",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Bot",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Max",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Leo",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Zoe",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Nala",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Oliver",
];

export default function ProfilePage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAvatars, setShowAvatars] = useState(false);
    const [username, setUsername] = useState("");
    const [savingUsername, setSavingUsername] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch("/api/profile");
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setUsername(json.profile?.username || "");
            }
        } catch (err) {
            console.error("Error loading profile:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    async function handleUpdateProfile(updates: Record<string, any>) {
        try {
            await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            setData((prev: any) => ({
                ...prev,
                profile: { ...prev.profile, ...updates },
            }));
        } catch (err) {
            console.error("Error updating profile:", err);
        }
    }

    async function handleSaveUsername() {
        setSavingUsername(true);
        await handleUpdateProfile({ username });
        setSavingUsername(false);
    }

    async function handleAvatarSelect(url: string) {
        setShowAvatars(false);
        await handleUpdateProfile({ avatar_url: url });
    }

    async function handleAddContact(contact: { name: string; phone: string; relationship: string }) {
        try {
            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "add_contact", ...contact }),
            });
            if (res.ok) {
                const newContact = await res.json();
                setData((prev: any) => ({
                    ...prev,
                    contacts: [newContact, ...(prev.contacts || [])],
                }));
            }
        } catch (err) {
            console.error("Error adding contact:", err);
        }
    }

    async function handleDeleteContact(id: string) {
        try {
            await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete_contact", id }),
            });
            setData((prev: any) => ({
                ...prev,
                contacts: prev.contacts.filter((c: any) => c.id !== id),
            }));
        } catch (err) {
            console.error("Error deleting contact:", err);
        }
    }

    async function handleExportData() {
        try {
            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "export" }),
            });
            if (res.ok) {
                const exportData = await res.json();
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `mentalmap-export-${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error("Error exporting data:", err);
        }
    }

    async function handleDeleteAllJournal() {
        try {
            await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete_all_journal" }),
            });
            setData((prev: any) => ({ ...prev, journalCount: 0 }));
        } catch (err) {
            console.error("Error deleting journal:", err);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        window.location.href = "/login";
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050913] flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
        );
    }

    const profile = data?.profile || {};

    return (
        <div className="min-h-screen bg-[#050913] page-enter">
            <div className="mx-auto max-w-3xl px-4 pb-8 pt-24 sm:px-6">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        <span className="bg-gradient-to-r from-teal-400 to-violet-400 bg-clip-text text-transparent">
                            Profile & Safety
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Manage your profile, safety tools, and privacy settings
                    </p>
                </div>

                {/* User Profile Card */}
                <div className="mb-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div
                                onClick={() => setShowAvatars(!showAvatars)}
                                className="h-24 w-24 rounded-full bg-slate-800 border-2 border-teal-500/40 overflow-hidden flex items-center justify-center cursor-pointer hover:border-teal-400 transition-colors shadow-[0_0_25px_rgba(20,184,166,0.2)]"
                            >
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl text-slate-500">👤</span>
                                )}
                            </div>
                            <button
                                onClick={() => setShowAvatars(!showAvatars)}
                                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-teal-600 flex items-center justify-center text-xs text-white shadow-lg hover:bg-teal-500 transition-colors"
                            >
                                ✏️
                            </button>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Set username..."
                                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500/40 focus:outline-none w-48 text-center sm:text-left"
                                />
                                <button
                                    onClick={handleSaveUsername}
                                    disabled={savingUsername}
                                    className="rounded-xl bg-teal-600/20 border border-teal-500/30 px-3 py-2 text-xs font-semibold text-teal-400 hover:bg-teal-600/30 transition-all disabled:opacity-50"
                                >
                                    {savingUsername ? "Saving..." : "Save"}
                                </button>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono tracking-wider mb-3">
                                Code: {profile.unique_code || "—"}
                            </div>
                            <div className="text-[12px] text-slate-500">{data?.email}</div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center min-w-[80px]">
                                <div className="text-xl font-bold text-teal-400">{data?.checkinCount || 0}</div>
                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Check-ins</div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center min-w-[80px]">
                                <div className="text-xl font-bold text-indigo-400">{data?.journalCount || 0}</div>
                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Journal</div>
                            </div>
                        </div>
                    </div>

                    {/* Avatar picker */}
                    {showAvatars && (
                        <div className="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 animate-in zoom-in-95 duration-200">
                            {AVATARS.map((url, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleAvatarSelect(url)}
                                    className={`aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-teal-400 transition-all ${profile.avatar_url === url ? "ring-2 ring-teal-500" : ""
                                        }`}
                                >
                                    <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover bg-slate-800" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Safety & Privacy */}
                <ProfileSafetyPanel
                    profile={profile}
                    contacts={data?.contacts || []}
                    journalCount={data?.journalCount || 0}
                    checkinCount={data?.checkinCount || 0}
                    onUpdateProfile={handleUpdateProfile}
                    onAddContact={handleAddContact}
                    onDeleteContact={handleDeleteContact}
                    onExportData={handleExportData}
                    onDeleteAllJournal={handleDeleteAllJournal}
                />

                {/* Logout */}
                <div className="mt-6">
                    <button
                        onClick={handleLogout}
                        className="w-full rounded-2xl border border-red-500/30 bg-red-500/[0.06] py-3.5 text-sm font-semibold text-red-400 hover:bg-red-500/15 transition-all"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}
