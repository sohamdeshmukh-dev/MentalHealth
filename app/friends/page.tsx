"use client";

import { useCallback, useEffect, useState } from "react";
import Leaderboard from "@/components/Leaderboard";
import { createBrowserClient } from "@supabase/ssr";
import FloatingChat from "@/components/FloatingChat";

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

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUser(user);

            const { data: allFriendships, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    user_id,
                    friend_id,
                    status,
                    sender:profiles!friendships_user_id_fkey(id, unique_code, avatar_url, points, display_name),
                    receiver:profiles!friendships_friend_id_fkey(id, unique_code, avatar_url, points, display_name)
                `)
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            if (error) throw error;

            const incoming: any[] = [];
            const sent: any[] = [];
            const accepted: any[] = [];

            allFriendships?.forEach((f) => {
                const senderProfile = Array.isArray(f.sender) ? f.sender[0] : f.sender;
                const receiverProfile = Array.isArray(f.receiver) ? f.receiver[0] : f.receiver;

                if (f.status === 'pending') {
                    if (f.friend_id === user.id) {
                        // I am the receiver. The sender is the other person.
                        incoming.push({ friendshipId: f.id, ...senderProfile });
                    } else if (f.user_id === user.id) {
                        // I am the sender. The receiver is the other person.
                        sent.push({ friendshipId: f.id, ...receiverProfile });
                    }
                } else if (f.status === 'accepted') {
                    // Get the profile of whoever is NOT the current user
                    const friendProfile: any = f.user_id === user.id ? receiverProfile : senderProfile;
                    accepted.push({
                        id: f.id,
                        friend_id: friendProfile?.id,
                        profile: friendProfile,
                        entry_count: 0
                    });
                }
            });

            setPendingRequests(incoming);
            setSentRequests(sent);
            setAcceptedFriends(accepted);

            // Fetch current user profile and entry count
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, unique_code, avatar_url, display_name')
                .eq('id', user.id)
                .single();
            setMyProfile(profile);
            setMyEntryCount(0);
        } catch (err: any) {
            console.error("Error fetching friends:", err?.message || err?.details || err?.hint || JSON.stringify(err) || err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    async function handleAccept(id: string) {
        setProcessingId(id);
        try {
            await supabase
                .from("friendships")
                .update({ status: "accepted" })
                .eq("id", id);
            fetchData();
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
            fetchData();
        } finally {
            setProcessingId(null);
        }
    }

    // Build leaderboard entries
    const leaderboardEntries = acceptedFriends.map((f) => ({
        id: f.friend_id,
        display_name: f.profile?.display_name,
        unique_code: f.profile?.unique_code || "—",
        avatar_url: f.profile?.avatar_url,
        entry_count: f.entry_count,
        isCurrentUser: false,
    }));
    leaderboardEntries.push({
        id: currentUser?.id || "me",
        display_name: myProfile?.display_name,
        unique_code: myProfile?.unique_code || "—",
        avatar_url: myProfile?.avatar_url,
        entry_count: myEntryCount,
        isCurrentUser: true,
    });

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
                                                <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                                    {req.avatar_url ? (
                                                        <img src={req.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg text-slate-500">👤</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {req.display_name || req.unique_code}
                                                    </p>
                                                    {req.display_name && (
                                                        <p className="text-[11px] text-slate-400">#{req.unique_code}</p>
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
                                                <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                                    {req.avatar_url ? (
                                                        <img src={req.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg text-slate-500">👤</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {req.display_name || req.unique_code}
                                                    </p>
                                                    {req.display_name && (
                                                        <p className="text-[11px] text-slate-400">#{req.unique_code}</p>
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
                                                <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                                    {friend.profile?.avatar_url ? (
                                                        <img src={friend.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg text-slate-500">👤</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {friend.profile?.display_name || friend.profile?.unique_code}
                                                    </p>
                                                    {friend.profile?.display_name && (
                                                        <p className="text-[11px] text-slate-400">#{friend.profile?.unique_code}</p>
                                                    )}
                                                    <div className="text-[11px] text-slate-400">
                                                        {friend.entry_count} journal entries
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
                    <Leaderboard entries={leaderboardEntries} />
                )}
            </div>
            <FloatingChat />
        </div>
    );
}
