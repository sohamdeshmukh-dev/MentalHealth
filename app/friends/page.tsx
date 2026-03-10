"use client";

import { useCallback, useEffect, useState } from "react";
import FriendsList from "@/components/FriendsList";
import Leaderboard from "@/components/Leaderboard";

type Tab = "friends" | "leaderboard";

export default function FriendsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("friends");
    const [friends, setFriends] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [myEntryCount, setMyEntryCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [addUsername, setAddUsername] = useState("");
    const [addStatus, setAddStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/friends");
            if (res.ok) {
                const data = await res.json();
                setFriends(data.friends || []);
                setRequests(data.requests || []);
                setMyEntryCount(data.my_entry_count || 0);
            }
        } catch (err) {
            console.error("Error fetching friends:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function handleAddFriend(e: React.FormEvent) {
        e.preventDefault();
        if (!addUsername.trim()) return;

        setIsAdding(true);
        setAddStatus(null);

        try {
            const res = await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: addUsername.trim() }),
            });
            const data = await res.json();

            if (res.ok) {
                setAddStatus({ type: "success", msg: "Friend request sent! ✨" });
                setAddUsername("");
                fetchData();
            } else {
                setAddStatus({ type: "error", msg: data.error || "Failed to send request" });
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
            await fetch("/api/friends", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action: "accept" }),
            });
            fetchData();
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(id: string) {
        setProcessingId(id);
        try {
            await fetch("/api/friends", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action: "reject" }),
            });
            fetchData();
        } finally {
            setProcessingId(null);
        }
    }

    async function handleRemove(id: string) {
        setProcessingId(id);
        try {
            await fetch("/api/friends", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            fetchData();
        } finally {
            setProcessingId(null);
        }
    }

    // Build leaderboard entries
    const leaderboardEntries = friends.map((f) => ({
        id: f.friend_id,
        username: f.profile?.username || f.profile?.unique_code || "Anonymous",
        avatar_url: f.profile?.avatar_url,
        entry_count: f.entry_count,
    }));
    leaderboardEntries.push({
        id: "me",
        username: "You",
        avatar_url: undefined,
        entry_count: myEntryCount,
        isCurrentUser: true,
    } as any);

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
                        value={addUsername}
                        onChange={(e) => setAddUsername(e.target.value)}
                        placeholder="Enter username or anonymous code..."
                        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-teal-500/40 focus:outline-none focus:ring-1 focus:ring-teal-500/30 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={isAdding || !addUsername.trim()}
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
                    <FriendsList
                        friends={friends}
                        requests={requests}
                        onAccept={handleAccept}
                        onReject={handleReject}
                        onRemove={handleRemove}
                        processingId={processingId}
                    />
                ) : (
                    <Leaderboard entries={leaderboardEntries} />
                )}
            </div>
        </div>
    );
}
