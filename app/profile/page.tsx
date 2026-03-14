"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import ProfileSafetyPanel from "@/components/ProfileSafetyPanel";
import CampusDashboard from "@/components/CampusDashboard";
import CollegePicker from "@/components/CollegePicker";
import { useTheme } from "@/hooks/useTheme";
import { CampusEmotionResponse, College } from "@/lib/types";
import SmileScoreSurvey from "@/components/SmileScoreSurvey";
import StripeCheckout from "@/components/StripeCheckout";



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
    const [journalCount, setJournalCount] = useState(0);
    const [checkInCount, setCheckInCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string>("Loading...");
    const [showAvatars, setShowAvatars] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [savingUsername, setSavingUsername] = useState(false);
    const [shieldActive, setShieldActive] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [campusPeers, setCampusPeers] = useState<any[]>([]);
    const { theme, setTheme, toggleTheme } = useTheme();
    const [campusAffiliation, setCampusAffiliation] = useState("Temple University"); // Set to null if you want it hidden by default!
    const [isCanvasLinked, setIsCanvasLinked] = useState(false);
    const [canvasSyncStatus, setCanvasSyncStatus] = useState("Connect LMS");
    const [isPremium, setIsPremium] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [demoMoodScore, setDemoMoodScore] = useState(50); 
    
    // Add this to store our timeouts!
    const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

    // Fake Assignments Data
    const assignments = [
        { id: 1, title: "Data Structures Midterm", course: "CIS 2168", due: "Tomorrow", stress: "High", color: "text-red-400", bg: "bg-red-500/10" },
        { id: 2, title: "UX Case Study Draft", course: "DES 3100", due: "In 3 Days", stress: "Medium", color: "text-orange-400", bg: "bg-orange-500/10" },
        { id: 3, title: "Weekly Reflection", course: "PSY 1001", due: "Friday", stress: "Low", color: "text-green-400", bg: "bg-green-500/10" }
    ];

    // Original AI Logic 
    const getAIFeedback = (score: number) => {
        if (score >= 75) return "✨ Aura AI: You are in a peak flow state today! Your cognitive load capacity is high. We recommend tackling the High-Stress 'Data Structures Midterm' prep right now to maximize your focus.";
        if (score >= 40) return "✨ Aura AI: You're maintaining a balanced headspace. Don't burn out—focus on moderate tasks like your 'UX Case Study Draft'. Break it into 30-minute Pomodoro sessions.";
        return "✨ Aura AI: Warning: Your emotional bandwidth is critically low today. Pushing through heavy studying will cause burnout. Just submit the low-stress 'Weekly Reflection' to keep your grades up, then take the rest of the night off. The midterm can wait until you recover.";
    };

    const handleCanvasConnect = () => {
        setCanvasSyncStatus("Authenticating SSO...");
        
        // Store the timeouts so we can cancel them if needed
        const t1 = setTimeout(() => setCanvasSyncStatus("Fetching Tasks..."), 800);
        const t2 = setTimeout(() => setCanvasSyncStatus("Running Aura AI..."), 1600);
        const t3 = setTimeout(() => {
            setIsCanvasLinked(true);
            setCanvasSyncStatus("Synced ✓");
        }, 2400);

        timeoutRefs.current = [t1, t2, t3];
    };

    const handleCanvasDisconnect = () => {
        // KILL ALL TIMEOUTS INSTANTLY so the browser doesn't glitch!
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];

        setIsCanvasLinked(false);
        setCanvasSyncStatus("Connect LMS");
        setDemoMoodScore(50);
    };



    const fetchProfileData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserEmail(user.email || "No email available");

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
                supabase.from('journal_entries').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
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
            setCheckInCount(checkinRes.count || 0);
            setJournalCount(journalRes.count || 0);
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

        // Fetch peers right after
        if (profile?.id) {
            fetch(`/api/campus/${encodeURIComponent(college.id)}/peers?userId=${profile.id}`)
                .then(res => res.json())
                .then(data => {
                    if (isMounted && data.peers) setCampusPeers(data.peers);
                })
                .catch(err => console.error("Error fetching peers:", err));
        }

        return () => {
            isMounted = false;
        };
    }, [college?.id]);

    async function handleUpdateProfile(updates: Record<string, any>) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: updatedProfile, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;

            setProfile(updatedProfile);
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
            a.download = `aura-atlas-profile-export.json`;
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
            setJournalCount(0);
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

            // 🛡️ Added .select().single() to force Supabase to return the row.
            // If RLS blocks the update, this will now throw a catchable error.
            const { data: updatedProfile, error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", user.id)
                .select()
                .single();

            if (error) {
                console.error("Supabase Save Error:", error.message, error.details);
                throw new Error(error.message);
            }

            // 🔄 Instantly sync local profile state
            setProfile(updatedProfile);

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


    const handleStripeUpgrade = () => {
        window.open("https://checkout.stripe.com/pay", "_blank");
        setTimeout(() => setIsPremium(true), 2000);
    };

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
        <div className="min-h-screen bg-[var(--background)] page-enter pb-20">
            <div className="mx-auto max-w-4xl px-4 pt-12">
                <header className="mb-10 text-center relative py-12 px-6 rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-purple-500/5 to-transparent animate-gradient-slow" />
                    <div className="relative z-10">
                        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] mb-3">
                            Profile & Settings
                        </h1>
                        <p className="text-lg text-[var(--foreground-muted)] max-w-xl mx-auto">
                            Manage your workspace, emergency contacts, and campus integration.
                        </p>
                    </div>
                </header>

                <div className="mb-8 grid gap-8 md:grid-cols-1">
                    <div className="app-surface p-6 rounded-3xl border border-[var(--border-soft)]">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-[var(--foreground)]">Theme Preference</h2>
                            <div className="flex bg-[var(--background)] p-1 rounded-xl">
                                <button
                                    onClick={() => setTheme("dark")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === "dark" ? "bg-teal-500 text-white shadow-lg" : "text-[var(--foreground-muted)]"}`}
                                >
                                    Dark
                                </button>
                                <button
                                    onClick={() => setTheme("light")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === "light" ? "bg-teal-500 text-white shadow-lg" : "text-[var(--foreground-muted)]"}`}
                                >
                                    Light
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-10 app-surface p-8 rounded-3xl border border-[var(--border-soft)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors duration-500 group-hover:bg-teal-500/10" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -ml-32 -mb-32 transition-colors duration-500 group-hover:bg-indigo-500/10" />

                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="relative">
                            <div
                                onClick={() => setShowAvatars(!showAvatars)}
                                className="h-24 w-24 rounded-full bg-[var(--background)] p-1 ring-4 ring-teal-500/20 overflow-hidden cursor-pointer hover:ring-teal-500/50 transition-all shadow-xl"
                            >
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-4xl">👤</div>
                                )}
                            </div>
                            <button
                                onClick={() => setShowAvatars(!showAvatars)}
                                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-teal-500 flex items-center justify-center text-sm shadow-lg hover:scale-110 transition-transform border-4 border-[var(--surface-1)]"
                            >
                                ✏️
                            </button>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Add your name..."
                                    className="text-3xl font-bold bg-transparent text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none w-full max-w-xs text-center md:text-left"
                                />
                                {displayName !== profile?.display_name && (
                                    <button
                                        onClick={handleSaveDisplayName}
                                        disabled={savingUsername}
                                        className="px-4 py-1.5 text-xs font-bold rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {savingUsername ? "Saving..." : "Save Name"}
                                    </button>
                                )}
                            </div>
                            <div className="text-[var(--foreground-muted)] font-medium mb-3 flex items-center justify-center md:justify-start gap-2">
                                <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                                {userEmail}
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--background)] text-xs font-mono font-bold text-teal-500 border border-teal-500/20">
                                USER_ID: {profile?.unique_code || "ALPHA-001"}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="text-center px-6 py-3 rounded-2xl bg-[var(--background)] border border-[var(--border-soft)]">
                                <div className="text-2xl font-black text-teal-500">{isLoading ? ".." : checkInCount}</div>
                                <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Check-ins</div>
                            </div>
                            <div className="text-center px-6 py-3 rounded-2xl bg-[var(--background)] border border-[var(--border-soft)]">
                                <div className="text-2xl font-black text-purple-500">{isLoading ? ".." : journalCount}</div>
                                <div className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Journals</div>
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

                <div className="mt-6 mb-6">
                    <SmileScoreSurvey userId={profile?.id} />
                </div>

                <div className="space-y-8 mt-12">
                {/* ONLY SHOW IF CAMPUS IS SELECTED */}
                {campusAffiliation && (
                    <div className="app-surface p-6 rounded-3xl border border-orange-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -mr-16 -mt-16" />
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                                    <span className="text-2xl">🎓</span> CanvasIQ Integration
                                </h4>
                                <p className="text-sm text-[var(--foreground-muted)] mt-1">Live assignment sync & Aura mood forecasting.</p>
                            </div>
                            <button 
                                onClick={isCanvasLinked ? handleCanvasDisconnect : handleCanvasConnect} 
                                disabled={!isCanvasLinked && canvasSyncStatus !== "Connect LMS"}
                                className={`px-6 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                                    isCanvasLinked 
                                        ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20" 
                                        : canvasSyncStatus !== "Connect LMS" 
                                            ? "bg-[var(--background)] text-[var(--foreground-muted)] cursor-not-allowed animate-pulse" 
                                            : "bg-orange-500 text-white hover:bg-orange-600 hover:scale-105 active:scale-95"
                                }`}
                            >
                                {isCanvasLinked ? "Unsync Canvas" : canvasSyncStatus}
                            </button>
                        </div>

                            {/* EXPANDED VIEW ONCE SYNCED */}
                            {isCanvasLinked && (
                                <div className="mt-4 pt-4 border-t border-[var(--border-soft)] animate-in fade-in slide-in-from-top-4 duration-500">
                                    
                                    {/* Slider (Demo text removed to look professional) */}
                                    <div className="mb-4 bg-[var(--background)] p-4 rounded-2xl border border-[var(--border-soft)]">
                                        <p className="text-xs font-black text-teal-500 mb-3 uppercase tracking-widest">Aura Sync: Adjust Mood</p>
                                        <input 
                                            type="range" min="1" max="100" 
                                            value={demoMoodScore} 
                                            onChange={(e) => setDemoMoodScore(Number(e.target.value))} 
                                            className="w-full h-2 bg-[var(--surface-1)] rounded-lg appearance-none cursor-pointer accent-teal-500" 
                                        />
                                        <div className="flex justify-between text-[10px] mt-2 font-black uppercase tracking-tighter">
                                            <span className="text-red-400">Burnout</span>
                                            <span className="text-teal-500 text-sm">Score: {demoMoodScore}</span>
                                            <span className="text-green-400">Peak Flow</span>
                                        </div>
                                    </div>

                                    {/* AI Feedback Box */}
                                    <div className={`p-4 rounded-2xl mb-6 text-sm font-medium leading-relaxed border shadow-inner transition-all duration-500 ${
                                        demoMoodScore >= 75 ? 'bg-teal-500/10 border-teal-500/30 text-teal-100' :
                                        demoMoodScore >= 40 ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100' :
                                        'bg-red-500/10 border-red-500/30 text-red-100'
                                    }`}>
                                        {getAIFeedback(demoMoodScore)}
                                    </div>

                                    <div className="space-y-3">
                                        <h5 className="text-xs font-black uppercase text-[var(--foreground-muted)] tracking-widest pl-1">Live Feed: Next 72 Hours</h5>
                                        <div className="grid gap-3">
                                            {assignments.map((task) => (
                                                <div key={task.id} className="flex justify-between items-center bg-[var(--background)] p-4 rounded-2xl border border-[var(--border-soft)] hover:border-teal-500/30 transition-all hover:translate-x-1">
                                                    <div>
                                                        <p className="text-[var(--foreground)] font-bold text-sm">{task.title}</p>
                                                        <p className="text-xs font-medium text-[var(--foreground-muted)]">{task.course} • {task.due}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                        task.stress === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        task.stress === 'Medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                        'bg-green-500/10 text-green-400 border-green-500/20'
                                                    }`}>
                                                        {task.stress}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    )}
                    <div className="app-surface p-6 rounded-3xl border border-indigo-500/20 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16" />
                        <div className="relative z-10">
                            <h4 className="text-lg font-bold text-[var(--foreground)]">Aura Atlas Pro</h4>
                            <p className="text-sm text-[var(--foreground-muted)] mt-1">$5.49/mo for advanced mood forecasting.</p>
                        </div>
                        <button 
                            onClick={() => setShowCheckout(true)} 
                            disabled={isPremium}
                            className={`px-6 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg relative z-10 ${
                                isPremium 
                                    ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 cursor-default" 
                                    : "bg-indigo-500 text-white hover:bg-indigo-600 hover:scale-105 active:scale-95 shadow-indigo-500/20"
                            }`}
                        >
                            {isPremium ? "Active" : "Upgrade"}
                        </button>
                    </div>
                </div>

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

                <div className="mt-12 app-surface p-8 rounded-3xl border border-[var(--border-soft)]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-[var(--foreground)]">Meet Your Campus</h3>
                            <p className="text-sm text-[var(--foreground-muted)]">Connect with real classmates at your school.</p>
                        </div>
                    </div>

                    {campusPeers.length === 0 ? (
                        <div className="py-12 text-center bg-[var(--background)] rounded-3xl border-2 border-dashed border-[var(--border-soft)]">
                            <p className="text-[var(--foreground-muted)]">No peers found at your school yet. Invite some friends!</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {campusPeers.map((peer) => (
                                <div key={peer.id} className="flex items-center justify-between p-4 rounded-3xl bg-[var(--background)] border border-[var(--border-soft)] hover:border-teal-500/40 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-xl border border-teal-500/20 group-hover:scale-110 transition-transform">
                                            {peer.unique_code?.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-[var(--foreground)] font-bold">Campus Peer <span className="text-[var(--foreground-muted)] font-mono text-xs ml-2">#{peer.unique_code}</span></p>
                                            <p className="text-xs text-teal-500 font-bold uppercase tracking-widest mt-0.5">Classmate</p>
                                        </div>
                                    </div>

                                    <button className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-500/10 text-teal-500 hover:bg-teal-500 text-white hover:shadow-lg transition-all">
                                        Add Friend
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-12 flex justify-center">
                    <button
                        onClick={handleLogout}
                        className="px-8 py-3 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
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
            {showCheckout && (
                <StripeCheckout 
                    userId={profile?.id} 
                    userEmail={userEmail} 
                    onClose={() => setShowCheckout(false)} 
                />
            )}
        </div>
    );
}
