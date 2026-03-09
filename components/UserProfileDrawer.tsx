"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface UserProfileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const AVATARS = [
    "https://api.dicebear.com/7.x/shapes/svg?seed=Felix",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Luna",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Bot",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Max",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Leo",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Zoe",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Nala",
    "https://api.dicebear.com/7.x/shapes/svg?seed=Oliver"
];

const generatePatientId = () => {
    const nums = Math.floor(100000 + Math.random() * 900000); // 6 random digits
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // 1 random uppercase letter
    return `${nums}${letter}`;
};

export default function UserProfileDrawer({ isOpen, onClose }: UserProfileDrawerProps) {
    // Correctly initialize browser client for Next.js App Router
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showAvatars, setShowAvatars] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;

        const loadUserData = async () => {
            setIsLoading(true);
            setErrorMsg('');
            try {
                // 1. Get User directly from server cookie
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

                if (authError || !authUser) {
                    throw new Error('No active session found.');
                }

                if (isMounted) setUser(authUser);

                // 2. Fetch or Create Profile
                const { data: existingProfile, error: fetchError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();

                if (existingProfile && !fetchError) {
                    if (isMounted) setProfile(existingProfile);
                } else {
                    // 3. Auto-generate if not found
                    const newId = generatePatientId();
                    const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert({ id: authUser.id, unique_code: newId })
                        .select()
                        .single();

                    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
                    if (isMounted) setProfile(newProfile);
                }
            } catch (err: any) {
                console.error('[ProfileDrawer Error]:', err);
                if (isMounted) setErrorMsg(err.message || 'An error occurred.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadUserData();

        return () => {
            isMounted = false;
        };
    }, [isOpen, supabase]); // Safe to include supabase since it's memoized internally by createBrowserClient

    const handleSave = async () => {
        if (!user || !profile) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    hobbies: profile.hobbies,
                    favorite_movies: profile.favorite_movies,
                    favorite_music: profile.favorite_music,
                    extra_info: profile.extra_info,
                    avatar_url: profile.avatar_url,
                })
                .eq("id", user.id);
            if (error) throw error;
        } catch (err) {
            console.error("Error saving profile", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarSelect = async (url: string) => {
        setProfile({ ...profile, avatar_url: url });
        setShowAvatars(false);
        if (user) {
            try {
                const { error } = await supabase
                    .from("profiles")
                    .update({ avatar_url: url })
                    .eq("id", user.id);
                if (error) throw error;
            } catch (err) {
                console.error("Error updating avatar", err);
            }
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
                    onClick={onClose}
                />
            )}
            <div
                className={`fixed top-0 right-0 h-full w-[400px] bg-slate-950/60 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out z-[9999] p-6 overflow-y-auto flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">User Profile</h2>
                    <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-white/60 hover:text-white hover:bg-white/10 transition backdrop-blur-md">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 text-white">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : errorMsg || !user || !profile ? (
                        <div className="bg-slate-900/80 p-6 rounded-2xl border border-red-500/20 text-center space-y-4 shadow-xl backdrop-blur-md">
                            <div className="text-4xl">⚠️</div>
                            <div className="text-slate-300 text-sm font-medium">Session unavailable. Please log in again.</div>
                            <div className="text-xs text-red-400/80 font-mono bg-black/20 p-2 rounded break-all max-h-24 overflow-y-auto">
                                {errorMsg || "Unauthorized"}
                            </div>
                            <button
                                onClick={() => window.location.href = '/login'}
                                className="mt-4 px-6 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-semibold rounded-lg border border-indigo-500/30 transition-all w-full"
                            >
                                Go to Login
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 flex-col flex animate-in fade-in duration-500">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-4">
                                <div
                                    className="relative w-28 h-28 rounded-full bg-slate-800/80 border-2 border-indigo-400/50 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                                    onClick={() => setShowAvatars(!showAvatars)}
                                >
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Profile Persona" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-5xl text-indigo-300/50">?</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowAvatars(!showAvatars)}
                                    className="text-xs font-semibold px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all backdrop-blur-sm"
                                >
                                    Select Your Persona
                                </button>

                                {showAvatars && (
                                    <div className="grid grid-cols-4 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md w-full animate-in zoom-in-95 duration-200">
                                        {AVATARS.map((url, i) => (
                                            <div
                                                key={i}
                                                onClick={() => handleAvatarSelect(url)}
                                                className="aspect-square bg-slate-800/80 rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-indigo-400 transition-all"
                                            >
                                                <img src={url} alt={`Avatar option ${i + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Anonymous Tag */}
                            <div className="text-center">
                                <span className="text-[10px] font-bold text-slate-400/80 uppercase tracking-widest block mb-2">Anonymous Tag</span>
                                <div className="font-mono text-xl tracking-[0.2em] text-slate-300 mb-8 bg-slate-900/40 py-3 rounded-xl border border-white/5 drop-shadow-lg shadow-inner">
                                    {profile.unique_code || 'Generating...'}
                                </div>
                            </div>

                            <div className="space-y-0">
                                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 mb-4 focus-within:border-indigo-500/50 focus-within:bg-slate-900/80 transition-colors shadow-lg">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                                        <span>🎨</span> My Passions
                                    </label>
                                    <textarea
                                        value={profile.hobbies || ""}
                                        onChange={(e) => setProfile({ ...profile, hobbies: e.target.value })}
                                        className="w-full bg-transparent outline-none resize-none h-20 text-sm text-slate-200 placeholder:text-slate-500"
                                        placeholder="Share your passions..."
                                    />
                                </div>

                                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 mb-4 focus-within:border-indigo-500/50 focus-within:bg-slate-900/80 transition-colors shadow-lg">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                                        <span>🎬</span> Film Favourites
                                    </label>
                                    <textarea
                                        value={profile.favorite_movies || ""}
                                        onChange={(e) => setProfile({ ...profile, favorite_movies: e.target.value })}
                                        className="w-full bg-transparent outline-none resize-none h-20 text-sm text-slate-200 placeholder:text-slate-500"
                                        placeholder="Your cinematic loves..."
                                    />
                                </div>

                                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 mb-4 focus-within:border-indigo-500/50 focus-within:bg-slate-900/80 transition-colors shadow-lg">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                                        <span>🎵</span> My Soundtrack
                                    </label>
                                    <textarea
                                        value={profile.favorite_music || ""}
                                        onChange={(e) => setProfile({ ...profile, favorite_music: e.target.value })}
                                        className="w-full bg-transparent outline-none resize-none h-20 text-sm text-slate-200 placeholder:text-slate-500"
                                        placeholder="Tell us about your favorite tunes..."
                                    />
                                </div>

                                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 mb-4 focus-within:border-indigo-500/50 focus-within:bg-slate-900/80 transition-colors shadow-lg">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                                        <span>🎯</span> My Goals & Triggers
                                    </label>
                                    <textarea
                                        value={profile.extra_info || ""}
                                        onChange={(e) => setProfile({ ...profile, extra_info: e.target.value })}
                                        className="w-full bg-transparent outline-none resize-none h-28 text-sm text-slate-200 placeholder:text-slate-500"
                                        placeholder="What helps you feel safe & focused?"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {user && profile && (
                    <div className="mt-8 space-y-3 shrink-0">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-500/20 font-semibold py-3.5 rounded-xl transition-all disabled:cursor-not-allowed border border-indigo-500/50"
                        >
                            {isSaving ? "Saving..." : "Save Profile"}
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 rounded-xl py-3 font-semibold transition-all shadow-lg"
                        >
                            Log Out
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
