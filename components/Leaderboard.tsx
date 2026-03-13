"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { getCollegeLogoUrl } from "@/lib/collegeList";

interface LeaderboardEntry {
    id: string;
    display_name?: string;
    unique_code: string;
    avatar_url?: string;
    total_journals: number;
    isCurrentUser?: boolean;
    college_id?: string;
    college_name?: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchLeaderboard = useCallback(async (currentUserId: string | null) => {
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, display_name, unique_code, avatar_url, total_journals, college_id, colleges(name)')
                .order('total_journals', { ascending: false })
                .limit(10);

            if (data) {
                setEntries(data.map((profile: any) => ({
                    ...profile,
                    total_journals: profile.total_journals || 0,
                    isCurrentUser: currentUserId ? profile.id === currentUserId : false,
                    college_name: profile.colleges?.name
                })));
            }
        } catch (err) {
            console.error("Failed to fetch leaderboard", err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        let currentUserId: string | null = null;

        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                currentUserId = user.id;
                setUserId(user.id);
            }
            await fetchLeaderboard(currentUserId);
        }
        init();

        const profileSubscription = supabase
            .channel('leaderboard-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                () => {
                    // Refetch totally on update so the order shifts correctly
                    fetchLeaderboard(currentUserId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(profileSubscription);
        };
    }, [supabase, fetchLeaderboard]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-8 w-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                <div className="text-3xl mb-2">🏆</div>
                <p className="text-slate-400 text-sm">
                    No users found!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {entries.map((entry, index) => (
                <div
                    key={entry.id}
                    className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${entry.isCurrentUser
                        ? "border-teal-500/30 bg-teal-500/[0.06]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                        }`}
                >
                    {/* Rank */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-lg font-bold shadow-inner">
                        {index < 3 ? MEDALS[index] : (
                            <span className="text-sm text-slate-400">{index + 1}</span>
                        )}
                    </div>

                    {/* Avatar */}
                    <div className="relative">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                            {entry.avatar_url ? (
                                <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm text-slate-500">👤</span>
                            )}
                        </div>
                        {entry.college_id && (
                            <img 
                                src={getCollegeLogoUrl(entry.college_id, 32)} 
                                alt="College" 
                                className="w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border border-slate-900 bg-white shadow-sm"
                            />
                        )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white truncate">
                                    {entry.isCurrentUser
                                        ? 'You'
                                        : (entry.display_name || entry.unique_code)}
                                </p>
                                {entry.isCurrentUser && entry.display_name && (
                                    <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                        {entry.display_name}
                                    </span>
                                )}
                            </div>
                            {(entry.display_name || entry.isCurrentUser) && (
                                <p className="text-[11px] text-slate-400 truncate">#{entry.unique_code}</p>
                            )}
                            {entry.college_name && (
                                <div className="text-[10px] text-teal-400/90 mt-0.5 flex items-center gap-1 font-medium truncate">
                                    🎓 {entry.college_name}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-white">{entry.total_journals}</div>
                        <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider font-semibold">Journals</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
