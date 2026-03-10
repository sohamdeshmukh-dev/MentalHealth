"use client";

interface LeaderboardEntry {
    id: string;
    username: string;
    avatar_url?: string;
    entry_count: number;
    isCurrentUser?: boolean;
}

interface LeaderboardProps {
    entries: LeaderboardEntry[];
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ entries }: LeaderboardProps) {
    const sorted = [...entries].sort((a, b) => b.entry_count - a.entry_count);

    if (sorted.length === 0) {
        return (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                <div className="text-3xl mb-2">🏆</div>
                <p className="text-slate-400 text-sm">
                    Add friends to see the leaderboard!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {sorted.map((entry, index) => (
                <div
                    key={entry.id}
                    className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${entry.isCurrentUser
                            ? "border-teal-500/30 bg-teal-500/[0.06]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                        }`}
                >
                    {/* Rank */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-lg font-bold">
                        {index < 3 ? MEDALS[index] : (
                            <span className="text-sm text-slate-400">{index + 1}</span>
                        )}
                    </div>

                    {/* Avatar */}
                    <div className="h-9 w-9 shrink-0 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                        {entry.avatar_url ? (
                            <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm text-slate-500">👤</span>
                        )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                            {entry.username}
                            {entry.isCurrentUser && (
                                <span className="ml-2 text-[10px] font-semibold text-teal-400 uppercase tracking-wider">
                                    You
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-white">{entry.entry_count}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">entries</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
