"use client";

interface Friend {
    id: string;
    friend_id: string;
    profile: {
        username?: string;
        avatar_url?: string;
        unique_code?: string;
    } | null;
    entry_count: number;
}

interface FriendRequest {
    id: string;
    requester_id: string;
    profile: {
        username?: string;
        avatar_url?: string;
        unique_code?: string;
    } | null;
}

interface FriendsListProps {
    friends: Friend[];
    requests: FriendRequest[];
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    onRemove: (id: string) => void;
    processingId: string | null;
}

export default function FriendsList({
    friends,
    requests,
    onAccept,
    onReject,
    onRemove,
    processingId,
}: FriendsListProps) {
    return (
        <div className="space-y-6">
            {/* Pending Requests */}
            {requests.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                        <span>📩</span> Pending Requests ({requests.length})
                    </h3>
                    <div className="space-y-2">
                        {requests.map((req) => (
                            <div
                                key={req.id}
                                className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                        {req.profile?.avatar_url ? (
                                            <img src={req.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-lg text-slate-500">👤</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {req.profile?.username || req.profile?.unique_code || "Anonymous"}
                                        </div>
                                        <div className="text-[11px] text-slate-400">wants to be your friend</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onAccept(req.id)}
                                        disabled={processingId === req.id}
                                        className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => onReject(req.id)}
                                        disabled={processingId === req.id}
                                        className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List */}
            <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <span>💚</span> Friends ({friends.length})
                </h3>
                {friends.length === 0 ? (
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                        <div className="text-3xl mb-2">🤝</div>
                        <p className="text-slate-400 text-sm">
                            No friends yet. Add someone by their username or anonymous code!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {friends.map((friend) => (
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
                                        <div className="text-sm font-medium text-white">
                                            {friend.profile?.username || friend.profile?.unique_code || "Anonymous"}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {friend.entry_count} journal entries
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemove(friend.id)}
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
    );
}
