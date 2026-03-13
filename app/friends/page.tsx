"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Leaderboard from "@/components/Leaderboard";
import { createBrowserClient } from "@supabase/ssr";
import { BookOpen } from "lucide-react";
import FloatingChat from "@/components/FloatingChat";
import { getCollegeLogoUrl } from "@/lib/collegeList";

type Tab = "friends" | "leaderboard";

export default function FriendsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("friends");
    const [acceptedFriends, setAcceptedFriends] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [myEntryCount, setMyEntryCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [searchCode, setSearchCode] = useState("");
    const [addStatus, setAddStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [myProfile, setMyProfile] = useState<any>(null);

    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
    const [toast, setToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

    const showToast = useCallback((message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    }, []);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/friends");
            if (!res.ok) throw new Error("Failed to fetch friends data");

            const data = await res.json();

            setPendingRequests(data.incoming_requests || []);
            setSentRequests(data.sent_requests || []);
            setMyEntryCount(data.my_entry_count || 0);

            // Also get current user session for actions
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, unique_code, avatar_url, display_name')
                    .eq('id', user.id)
                    .single();
                setMyProfile(profile);
            }
        } catch (err: any) {
            console.error("Error fetching friends:", err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const fetchRequests = useCallback(async () => {
        if (!currentUser) return;
        try {
            const { data: incomingData } = await supabase
                .from("friendships")
                .select("*")
                .eq("friend_id", currentUser.id)
                .eq("status", "pending");

            const { data: outgoingData } = await supabase
                .from("friendships")
                .select("*")
                .eq("user_id", currentUser.id)
                .eq("status", "pending");

            const allProfileIds = new Set([
                ...(incomingData || []).map(r => r.user_id),
                ...(outgoingData || []).map(r => r.friend_id)
            ]);

            let profilesMap: Record<string, any> = {};
            if (allProfileIds.size > 0) {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, display_name, avatar_url, unique_code, college_id, colleges(name)")
                    .in("id", Array.from(allProfileIds));
                profiles?.forEach(p => { profilesMap[p.id] = p; });
            }

            setIncomingRequests((incomingData || []).map(r => ({ ...r, profile: profilesMap[r.user_id] })));
            setOutgoingRequests((outgoingData || []).map(r => ({ ...r, profile: profilesMap[r.friend_id] })));
        } catch (err) {
            console.error("Error fetching friend requests", err);
        }
    }, [currentUser, supabase]);

    const fetchFriends = useCallback(async () => {
        if (!currentUser) return;
        try {
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    status,
                    sender:profiles!friendships_user_id_fkey (id, display_name, avatar_url, unique_code, total_journals, latest_mood, share_mood_with_friends, college_id, colleges(name)),
                    receiver:profiles!friendships_friend_id_fkey (id, display_name, avatar_url, unique_code, total_journals, latest_mood, share_mood_with_friends, college_id, colleges(name))
                `)
                .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
                .eq('status', 'accepted');

            if (error) {
                // Fallback join if the explicit fkey syntax fails
                const { data: fallbackData } = await supabase
                    .from('friendships')
                    .select(`
                        id,
                        status,
                        sender:user_id (id, display_name, avatar_url, unique_code, total_journals, latest_mood, share_mood_with_friends, college_id, colleges(name)),
                        receiver:friend_id (id, display_name, avatar_url, unique_code, total_journals, latest_mood, share_mood_with_friends, college_id, colleges(name))
                    `)
                    .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
                    .eq('status', 'accepted');

                if (fallbackData) {
                    const formattedFriends = fallbackData.map((row: any) => {
                        const isSender = row.sender.id === currentUser.id;
                        const friendProfile = isSender ? row.receiver : row.sender;
                        return {
                            id: row.id,
                            friend_id: friendProfile.id,
                            profile: friendProfile,
                            entry_count: friendProfile.total_journals || 0
                        };
                    });
                    setAcceptedFriends(formattedFriends);
                }
            } else if (data) {
                const formattedFriends = data.map((row: any) => {
                    const isSender = row.sender.id === currentUser.id;
                    const friendProfile = isSender ? row.receiver : row.sender;
                    return {
                        id: row.id,
                        friend_id: friendProfile.id,
                        profile: friendProfile,
                        entry_count: friendProfile.total_journals || 0
                    };
                });
                setAcceptedFriends(formattedFriends);
            }
        } catch (err) {
            console.error("Error fetching accepted friends:", err);
        }
    }, [currentUser, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (currentUser) {
            fetchRequests();
            fetchFriends();
        }
    }, [currentUser, fetchRequests, fetchFriends]);

    // 3. The Real-time Sync
    useEffect(() => {
        if (!currentUser) return;

        const profileSubscription = supabase
            .channel('profile-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload: any) => {
                    const updatedProfile = payload.new;
                    setAcceptedFriends((prev) =>
                        prev.map((friend) => {
                            if (friend.friend_id === updatedProfile.id) {
                                return {
                                    ...friend,
                                    profile: { ...friend.profile, ...updatedProfile },
                                    entry_count: updatedProfile.total_journals || 0
                                };
                            }
                            return friend;
                        })
                    );

                    if (updatedProfile.id === currentUser.id) {
                        setMyEntryCount(updatedProfile.total_journals || 0);
                        setMyProfile(updatedProfile);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(profileSubscription);
        };
    }, [currentUser, supabase]);

    async function handleAddFriend(e: React.FormEvent) {
        e.preventDefault();
        if (!searchCode.trim() || !currentUser) return;

        setIsAdding(true);
        setAddStatus(null);

        try {
            // Find user by code
            const cleanSearchCode = searchCode.trim().toUpperCase();
            const { data: targetProfile, error: searchError } = await supabase
                .from("profiles")
                .select("id")
                .eq("unique_code", cleanSearchCode)
                .single();

            if (searchError || !targetProfile) {
                setAddStatus({ type: "error", msg: "User not found." });
                return;
            }

            if (targetProfile.id === currentUser.id) {
                setAddStatus({ type: "error", msg: "You cannot add yourself!" });
                return;
            }

            const { error: insertError } = await supabase
                .from("friendships")
                .insert({
                    user_id: currentUser.id,
                    friend_id: targetProfile.id,
                    status: "pending"
                });

            if (insertError) {
                setAddStatus({ type: "error", msg: "Failed to send request or already requested." });
            } else {
                setAddStatus({ type: "success", msg: "Friend request sent!" });
                setSearchCode("");
                fetchData();
            }
        } catch {
            setAddStatus({ type: "error", msg: "Network error" });
        } finally {
            setIsAdding(false);
            setTimeout(() => setAddStatus(null), 4000);
        }
    }

    async function handleAcceptRequest(requestId: string) {
        setProcessingId(requestId);
        try {
            await supabase.from("friendships").update({ status: "accepted" }).eq("id", requestId);
            fetchRequests();
            fetchFriends();
            showToast("Friend request accepted!");
        } catch (err) {
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleWithdrawOrReject(requestId: string) {
        setProcessingId(requestId);
        try {
            await supabase.from("friendships").delete().eq("id", requestId);
            fetchRequests();
        } catch (err) {
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleAccept(id: string) {
        setProcessingId(id);
        try {
            await supabase
                .from("friendships")
                .update({ status: "accepted" })
                .eq("id", id);
            fetchRequests();
            fetchFriends();
        } finally {
            setProcessingId(null);
        }
    }

    async function handleDecline(id: string) {
        setProcessingId(id);
        try {
            await supabase
                .from("friendships")
                .delete()
                .eq("id", id);
            fetchData();
        } finally {
            setProcessingId(null);
        }
    }

    async function handleCancel(id: string) {
        setProcessingId(id);
        try {
            await supabase
                .from("friendships")
                .delete()
                .eq("id", id);
            fetchData();
        } finally {
            setProcessingId(null);
        }
    }

    async function handleRemove(id: string) {
        setProcessingId(id);
        try {
            await supabase
                .from("friendships")
                .delete()
                .eq("id", id);
            fetchFriends();
        } finally {
            setProcessingId(null);
        }
    }

    // Leaderboard now fetches its own entries

    return (
        <div className="min-h-screen bg-[#050913] page-enter">
            <div className="mx-auto max-w-3xl px-4 pb-8 pt-24 sm:px-6">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        <span className="bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent">
                            Friends & Leaderboard
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Connect, support each other, and stay motivated together
                    </p>
                </div>

                {/* Add Friend */}
                <form
                    onSubmit={handleAddFriend}
                    className="mb-6 flex gap-2"
                >
                    <input
                        type="text"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        placeholder="Enter username or anonymous code..."
                        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-teal-500/40 focus:outline-none focus:ring-1 focus:ring-teal-500/30 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={isAdding || !searchCode.trim()}
                        className="rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/15 hover:shadow-teal-500/25 transition-all disabled:opacity-40 active:scale-[0.97]"
                    >
                        {isAdding ? "Sending..." : "Add Friend"}
                    </button>
                </form>
                {addStatus && (
                    <div
                        className={`mb-4 rounded-xl px-4 py-2 text-center text-sm font-medium animate-in fade-in duration-200 ${addStatus.type === "success"
                            ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                            : "text-red-400 bg-red-500/10 border border-red-500/20"
                            }`}
                    >
                        {addStatus.msg}
                    </div>
                )}

                {/* Tab bar */}
                <div className="mb-6 flex rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5">
                    {(["friends", "leaderboard"] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${activeTab === tab
                                ? "bg-gradient-to-r from-teal-500/20 to-indigo-500/20 text-white border border-teal-500/20"
                                : "text-slate-400 hover:text-white"
                                }`}
                        >
                            {tab === "friends" ? "👥 Friends" : "🏆 Leaderboard"}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="h-8 w-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                    </div>
                ) : activeTab === "friends" ? (
                    <div className="space-y-6">
                        {/* New Pending Connections UI */}
                        {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
                            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl mb-6">
                                <h2 className="text-xl font-semibold text-white mb-4">Pending Connections</h2>

                                <AnimatePresence>
                                    {incomingRequests.length > 0 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4">
                                            <h3 className="text-xs uppercase tracking-widest text-emerald-400 mb-2 font-semibold">Incoming</h3>
                                            <div className="space-y-3">
                                                {incomingRequests.map((req) => (
                                                    <motion.div
                                                        key={req.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl p-3"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="h-10 w-10 shrink-0 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                                                    {req.profile?.avatar_url ? (
                                                                        <img src={req.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-lg text-slate-500">👤</span>
                                                                    )}
                                                                </div>
                                                                {req.profile?.college_id && (
                                                                    <img 
                                                                        src={getCollegeLogoUrl(req.profile.college_id, 32)} 
                                                                        alt="College Logo" 
                                                                        className="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border border-slate-900 bg-white"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-white truncate">
                                                                    {req.profile?.display_name || req.profile?.unique_code || "Unknown"}
                                                                </p>
                                                                {req.profile?.display_name && (
                                                                    <p className="text-[11px] text-slate-400 truncate">#{req.profile?.unique_code}</p>
                                                                )}
                                                                {req.profile?.colleges?.name && (
                                                                    <div className="text-[10px] text-teal-400/80 mt-0.5 flex items-center gap-1">
                                                                        🎓 {req.profile.colleges.name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button
                                                                onClick={() => handleAcceptRequest(req.id)}
                                                                disabled={processingId === req.id}
                                                                className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/40 hover:shadow-[0_0_15px_rgba(52,211,153,0.4)] transition-all disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                ✅ Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleWithdrawOrReject(req.id)}
                                                                disabled={processingId === req.id}
                                                                className="rounded-lg bg-black/40 border border-red-900/40 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                ❌ Decline
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                    {outgoingRequests.length > 0 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">Outgoing</h3>
                                            <div className="space-y-3">
                                                {outgoingRequests.map((req) => (
                                                    <motion.div
                                                        key={req.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl p-3"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="h-10 w-10 shrink-0 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                                                    {req.profile?.avatar_url ? (
                                                                        <img src={req.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-lg text-slate-500">👤</span>
                                                                    )}
                                                                </div>
                                                                {req.profile?.college_id && (
                                                                    <img 
                                                                        src={getCollegeLogoUrl(req.profile.college_id, 32)} 
                                                                        alt="College Logo" 
                                                                        className="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border border-slate-900 bg-white"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-white truncate">
                                                                    {req.profile?.display_name || req.profile?.unique_code || "Unknown"}
                                                                </p>
                                                                {req.profile?.display_name && (
                                                                    <p className="text-[11px] text-slate-400 truncate">#{req.profile?.unique_code}</p>
                                                                )}
                                                                {req.profile?.colleges?.name && (
                                                                    <div className="text-[10px] text-teal-400/80 mt-0.5 flex items-center gap-1">
                                                                        🎓 {req.profile.colleges.name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleWithdrawOrReject(req.id)}
                                                            disabled={processingId === req.id}
                                                            className="shrink-0 rounded-lg bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            ↩️ Withdraw
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                        {/* Incoming Requests */}
                        {pendingRequests.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                                    <span>📩</span> Incoming Requests ({pendingRequests.length})
                                </h3>
                                <div className="space-y-2">
                                    {pendingRequests.map((req) => (
                                        <div
                                            key={req.friendshipId}
                                            className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                                        {req.avatar_url ? (
                                                            <img src={req.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-lg text-slate-500">👤</span>
                                                        )}
                                                    </div>
                                                    {req.college_id && (
                                                        <img 
                                                            src={getCollegeLogoUrl(req.college_id, 32)} 
                                                            alt="College Logo" 
                                                            className="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border border-slate-900 bg-white shadow-sm"
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {req.display_name || req.unique_code}
                                                    </p>
                                                    {req.display_name && (
                                                        <p className="text-[11px] text-slate-400">#{req.unique_code}</p>
                                                    )}
                                                    {req.college_name && (
                                                        <div className="text-[10px] text-teal-400/80 mt-0.5 flex items-center gap-1 font-medium">
                                                            🎓 {req.college_name}
                                                        </div>
                                                    )}
                                                    <div className="text-[11px] text-slate-400">wants to be your friend</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAccept(req.friendshipId)}
                                                    disabled={processingId === req.friendshipId}
                                                    className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleDecline(req.friendshipId)}
                                                    disabled={processingId === req.friendshipId}
                                                    className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sent Requests */}
                        {sentRequests.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                                    <span>📤</span> Sent Requests ({sentRequests.length})
                                </h3>
                                <div className="space-y-2">
                                    {sentRequests.map((req) => (
                                        <div
                                            key={req.friendshipId}
                                            className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.1] transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                                        {req.avatar_url ? (
                                                            <img src={req.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-lg text-slate-500">👤</span>
                                                        )}
                                                    </div>
                                                    {req.college_id && (
                                                        <img 
                                                            src={getCollegeLogoUrl(req.college_id, 32)} 
                                                            alt="College Logo" 
                                                            className="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border border-slate-900 bg-white shadow-sm"
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {req.display_name || req.unique_code}
                                                    </p>
                                                    {req.display_name && (
                                                        <p className="text-[11px] text-slate-400">#{req.unique_code}</p>
                                                    )}
                                                    {req.college_name && (
                                                        <div className="text-[10px] text-teal-400/80 mt-0.5 flex items-center gap-1 font-medium">
                                                            🎓 {req.college_name}
                                                        </div>
                                                    )}
                                                    <div className="text-[11px] text-slate-400">Pending...</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleCancel(req.friendshipId)}
                                                disabled={processingId === req.friendshipId}
                                                className="rounded-xl border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:bg-slate-800 transition-all disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Friends List */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                <span>💚</span> Friends ({acceptedFriends.length})
                            </h3>
                            {acceptedFriends.length === 0 ? (
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                                    <div className="text-3xl mb-2">🤝</div>
                                    <p className="text-slate-400 text-sm">
                                        No friends yet. Add someone by their username or anonymous code!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {acceptedFriends.map((friend) => (
                                        <div
                                            key={friend.id}
                                            className="group flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.1] transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                                        {friend.profile?.avatar_url ? (
                                                            <img src={friend.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-lg text-slate-500">👤</span>
                                                        )}
                                                    </div>
                                                    {friend.profile?.college_id && (
                                                        <img 
                                                            src={getCollegeLogoUrl(friend.profile.college_id, 32)} 
                                                            alt="College Logo" 
                                                            className="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border border-slate-900 bg-white shadow-sm"
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {friend.profile?.display_name || friend.profile?.unique_code}
                                                    </p>
                                                    {friend.profile?.display_name && (
                                                        <p className="text-[11px] text-slate-400">#{friend.profile?.unique_code}</p>
                                                    )}
                                                    {friend.profile?.colleges?.name && (
                                                        <div className="text-[10px] text-teal-400/90 mt-0.5 flex items-center gap-1 font-medium">
                                                            🎓 {friend.profile.colleges.name}
                                                        </div>
                                                    )}
                                                    {friend.profile?.share_mood_with_friends && friend.profile?.latest_mood && (
                                                        <div className="mt-1 flex items-center">
                                                            <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-medium text-teal-400 border border-teal-500/20">
                                                                Feeling: {friend.profile.latest_mood}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="text-[11px] flex items-center gap-1 text-emerald-400/80 font-medium mt-1">
                                                        <BookOpen className="w-3 h-3" />
                                                        {friend.entry_count} entries
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(friend.id)}
                                                disabled={processingId === friend.id}
                                                className="opacity-0 group-hover:opacity-100 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <Leaderboard />
                )}
            </div>
            <FloatingChat />

            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="fixed top-24 right-6 z-[200] bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl border-l-4 border-emerald-400 flex items-center gap-3 font-medium backdrop-blur-md"
                    >
                        <span className="text-xl">✅</span>
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
