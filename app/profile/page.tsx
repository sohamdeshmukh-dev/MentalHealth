"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import ProfileSafetyPanel from "@/components/ProfileSafetyPanel";
import CampusDashboard from "@/components/CampusDashboard";
import CollegePicker from "@/components/CollegePicker";
import { useTheme } from "@/hooks/useTheme";
import { CampusEmotionResponse, College } from "@/lib/types";

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

    const [profile, setProfile] = useState<any>(null);
    const [contacts, setContacts] = useState<any[]>([]);
    const [journalEntries, setJournalEntries] = useState<any[]>([]);
    const [college, setCollege] = useState<College | null>(null);
    const [campusInsights, setCampusInsights] = useState<CampusEmotionResponse | null>(null);
    const [isCampusLoading, setIsCampusLoading] = useState(false);
    const [counts, setCounts] = useState({ checkins: 0, journals: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [showAvatars, setShowAvatars] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [savingUsername, setSavingUsername] = useState(false);
    const [shieldActive, setShieldActive] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const { theme, setTheme, toggleTheme } = useTheme();

    const fetchProfileData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            // Fetch contacts
            const { data: contactsData } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', user.id);

            // Fetch counts
            const [checkinRes, journalRes] = await Promise.all([
                supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('mood_journal').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
            ]);

            // Fetch journal entries
            const { data: journalData } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            let collegeData: College | null = null;
            if (profileData?.college_id) {
                const { data: selectedCollege } = await supabase
                    .from('colleges')
                    .select('id, name, city, latitude, longitude, campus_radius')
                    .eq('id', profileData.college_id)
                    .single();
                collegeData = (selectedCollege as College) ?? null;
            }

            setProfile(profileData);
            setContacts(contactsData || []);
            setJournalEntries(journalData || []);
            setCollege(collegeData);
            setCounts({
                checkins: checkinRes.count || 0,
                journals: journalRes.count || 0
            });
            setDisplayName(profileData?.display_name || "");
            setShieldActive(profileData?.impulse_shield_active || false);
        } catch (err: any) {
            console.error("Error loading profile:", err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    useEffect(() => {
        if (!college?.id) {
            setCampusInsights(null);
            return;
        }

        let isMounted = true;
        setIsCampusLoading(true);

        fetch(`/api/campus/${encodeURIComponent(college.id)}/emotions`)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error("Unable to load campus insights.");
                }
                const payload = await response.json();
                if (!isMounted) {
                    return;
                }
                setCampusInsights(payload as CampusEmotionResponse);
            })
            .catch((error) => {
                console.error(error);
                if (isMounted) {
                    setCampusInsights(null);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsCampusLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [college?.id]);

    async function handleUpdateProfile(updates: Record<string, any>) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            setProfile((prev: any) => ({ ...prev, ...updates }));
        } catch (err: any) {
            console.error("Error updating profile:", err);
        }
    }

    async function handleSaveDisplayName() {
        setSavingUsername(true);
        await handleUpdateProfile({ display_name: displayName });
        setSavingUsername(false);
    }

    async function handleAvatarSelect(url: string) {
        setShowAvatars(false);
        await handleUpdateProfile({ avatar_url: url });
    }

    async function handleAddContact(contact?: { name: string; phone: string; relationship: string }) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let name = contact?.name;
            let phone = contact?.phone;
            let relationship = contact?.relationship || "";

            if (!name || !phone) {
                name = window.prompt("Enter contact name:") || "";
                if (!name) return;
                phone = window.prompt("Enter contact phone number:") || "";
                if (!phone) return;
                relationship = window.prompt("Relationship (optional):") || "";
            }

            const { data: newContact, error } = await supabase
                .from('emergency_contacts')
                .insert({ user_id: user.id, name, phone, relationship })
                .select()
                .single();

            if (error) throw error;

            setContacts((prev) => [newContact, ...prev]);
        } catch (err: any) {
            console.error("Error adding contact:", err);
            alert("Failed to save contact.");
        }
    }

    async function handleDeleteContact(id: string) {
        try {
            const { error } = await supabase
                .from("emergency_contacts")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setContacts((prev) => prev.filter((c: any) => c.id !== id));
        } catch (err: any) {
            console.error("Error deleting contact:", err);
        }
    }

    async function handleExportData() {
        try {
            const exportObj = {
                profile,
                contacts,
                journal_entries: journalEntries,
                exportedAt: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `mentalmap-profile-export.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
        }
    }

    async function handleDeleteAllJournal() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (!window.confirm("Are you sure? This cannot be undone.")) return;

            const { error } = await supabase
                .from('journal_entries')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            setJournalEntries([]);
            setCounts((prev) => ({ ...prev, journals: 0 }));
            setToastMessage("🗑️ All journal entries deleted.");
            setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
            console.error("Delete error:", err);
        }
    }

    async function handleToggleShield() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const newValue = !shieldActive;
            setShieldActive(newValue);

            await supabase
                .from('profiles')
                .update({ impulse_shield_active: newValue })
                .eq('id', user.id);

            setProfile((prev: any) => ({ ...prev, impulse_shield_active: newValue }));
        } catch (err) {
            console.error("Shield toggle error:", err);
        }
    }

    const handleTestShield = () => {
        const contactNames = contacts && contacts.length > 0
            ? contacts.map((c: any) => c.name).join(', ')
            : "your emergency contacts";

        setToastMessage(`🚨 SHIELD ACTIVE: Simulated Capital One spending lock engaged. Emergency alert sent to: ${contactNames}!`);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const handleRecoveryUnlock = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setShieldActive(false);
            await supabase.from('profiles').update({ impulse_shield_active: false }).eq('id', user.id);
            setProfile((prev: any) => ({ ...prev, impulse_shield_active: false }));
            setToastMessage("💚 Account Unlocked. We are so glad you are feeling better!");
            setTimeout(() => setToastMessage(null), 4000);
        } catch (err) {
            console.error("Unlock error:", err);
        }
    };

    async function handleCollegeSave(collegeId: string | null, city: string, major: string | null, grade: string | null) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("No user found in handleCollegeSave");
                return;
            }

            const updates: Record<string, unknown> = { 
                college_id: collegeId, 
                city, 
                major: major ?? null, 
                grade: grade ?? null 
            };

            const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", user.id);

            if (error) {
                console.error("Supabase Save Error:", error.message, error.details);
                throw new Error(error.message);
            }

            setProfile((prev: any) => ({ ...prev, ...updates }));

            if (collegeId) {
                const { data: selectedCollege, error: collegeError } = await supabase
                    .from("colleges")
                    .select("id, name, city, latitude, longitude, campus_radius")
                    .eq("id", collegeId)
                    .single();
                
                if (collegeError) {
                    console.error("Error fetching college details:", collegeError.message);
                }
                setCollege((selectedCollege as College) ?? null);
            } else {
                setCollege(null);
                setCampusInsights(null);
            }
        } catch (err: any) {
            console.error("Failed to save college in ProfilePage:", err.message || err);
            throw err; // Re-throw to be caught by CollegePicker's catch block
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        window.location.href = "/login";
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] page-enter">
            <div className="mx-auto max-w-3xl px-4 pb-8 pt-24 sm:px-6">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
                        <span className="bg-gradient-to-r from-teal-400 to-violet-400 bg-clip-text text-transparent">
                            Profile & Safety
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-[var(--muted-text)]">
                        Manage your profile, safety tools, and privacy settings
                    </p>
                </div>

                <div className="mb-6 app-surface rounded-3xl p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-sm font-semibold text-[var(--foreground)]">Profile Settings</h2>
                            <p className="mt-1 text-xs text-[var(--muted-text)]">Theme</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-1">
                            <button
                                onClick={() => setTheme("dark")}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                    theme === "dark"
                                        ? "bg-slate-900 text-white shadow"
                                        : "text-[var(--muted-text)] hover:text-[var(--foreground)]"
                                }`}
                            >
                                Dark Mode
                            </button>
                            <button
                                onClick={() => setTheme("light")}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                    theme === "light"
                                        ? "bg-white text-slate-900 shadow"
                                        : "text-[var(--muted-text)] hover:text-[var(--foreground)]"
                                }`}
                            >
                                Light Mode
                            </button>
                            <button
                                onClick={toggleTheme}
                                className="rounded-xl border border-[var(--border-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-text)] transition-colors hover:text-[var(--foreground)]"
                            >
                                Toggle
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mb-6 app-surface rounded-3xl p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative">
                            <div
                                onClick={() => setShowAvatars(!showAvatars)}
                                className="h-24 w-24 rounded-full bg-slate-800 border-2 border-teal-500/40 overflow-hidden flex items-center justify-center cursor-pointer hover:border-teal-400 transition-colors shadow-[0_0_25px_rgba(20,184,166,0.2)]"
                            >
                                {profile?.avatar_url ? (
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

                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Set display name..."
                                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500/40 focus:outline-none w-48 text-center sm:text-left"
                                />
                                <button
                                    onClick={handleSaveDisplayName}
                                    disabled={savingUsername}
                                    className="rounded-xl bg-teal-600/20 border border-teal-500/30 px-3 py-2 text-xs font-semibold text-teal-400 hover:bg-teal-600/30 transition-all disabled:opacity-50"
                                >
                                    {savingUsername ? "Saving..." : "Save"}
                                </button>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono tracking-wider mb-3">
                                Code: {profile?.unique_code || "HACK-2024"}
                            </div>
                            <div className="text-[12px] text-slate-500">{profile?.email || "user@example.com"}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center min-w-[80px]">
                                <div className="text-xl font-bold text-teal-400">{counts.checkins}</div>
                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Check-ins</div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center min-w-[80px]">
                                <div className="text-xl font-bold text-indigo-400">{counts.journals}</div>
                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Journal</div>
                            </div>
                        </div>
                    </div>

                    {showAvatars && (
                        <div className="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 animate-in zoom-in-95 duration-200">
                            {AVATARS.map((url, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleAvatarSelect(url)}
                                    className={`aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-teal-400 transition-all ${profile?.avatar_url === url ? "ring-2 ring-teal-500" : ""
                                        }`}
                                >
                                    <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover bg-slate-800" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <ProfileSafetyPanel
                    profile={profile || {}}
                    contacts={contacts}
                    journalEntries={journalEntries}
                    shieldActive={shieldActive}
                    onUpdateProfile={handleUpdateProfile}
                    onToggleShield={handleToggleShield}
                    onTestShield={handleTestShield}
                    onRecoveryUnlock={handleRecoveryUnlock}
                    onAddContact={handleAddContact}
                    onDeleteContact={handleDeleteContact}
                    onExportData={handleExportData}
                    onDeleteAllJournal={handleDeleteAllJournal}
                />

                <CollegePicker
                    currentCollege={college}
                    currentCity={profile?.city ?? null}
                    currentMajor={profile?.major ?? null}
                    currentGrade={profile?.grade ?? null}
                    onSave={handleCollegeSave}
                />

                <CampusDashboard
                    college={college}
                    campusInsights={campusInsights}
                    journalEntries={journalEntries}
                    loading={isCampusLoading}
                />

                <div className="mt-6">
                    <button
                        onClick={handleLogout}
                        className="w-full rounded-2xl border border-red-500/30 bg-red-500/[0.08] py-3.5 text-sm font-semibold text-red-500 hover:bg-red-500/20 transition-all"
                    >
                        Log Out
                    </button>
                </div>
            </div>

            {toastMessage && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-4 shadow-2xl backdrop-blur-md text-center">
                        <div className="text-sm font-medium text-[var(--foreground)] leading-relaxed">
                            {toastMessage}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
