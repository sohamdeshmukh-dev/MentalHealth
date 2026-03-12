"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CampusEmotionResponse, College } from "@/lib/types";
import { getEmotionalBalanceScore, normalizeEmotion } from "@/lib/journal";
import CollegeLogo from "./CollegeLogo";

interface JournalEntryRow {
  mood?: string | null;
  intensity?: number | null;
  created_at?: string | null;
}

interface CampusDashboardProps {
  college: College | null;
  campusInsights: CampusEmotionResponse | null;
  journalEntries: JournalEntryRow[];
  loading: boolean;
}

function clampIntensity(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.max(1, Math.min(100, Math.round(value as number)));
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function average(sum: number, count: number) {
  return count > 0 ? Number((sum / count).toFixed(3)) : 0;
}

function scoreLabel(score: number) {
  return `${score >= 0 ? "+" : ""}${score.toFixed(2)}`;
}

export default function CampusDashboard({ college, campusInsights, journalEntries, loading }: CampusDashboardProps) {
  const userTrend = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = new Map<string, { scoreSum: number; count: number }>();
    let todaySum = 0;
    let todayCount = 0;
    let weekSum = 0;
    let weekCount = 0;
    let monthSum = 0;
    let monthCount = 0;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 29);

    for (const entry of journalEntries ?? []) {
      if (!entry?.created_at) {
        continue;
      }

      const parsed = new Date(entry.created_at);
      const parsedMs = parsed.getTime();
      if (!Number.isFinite(parsedMs)) {
        continue;
      }

      const emotion = normalizeEmotion(typeof entry.mood === "string" ? entry.mood : "Neutral");
      const intensity = clampIntensity(entry.intensity);
      const score = getEmotionalBalanceScore(emotion, intensity);
      const dayKey = toDayKey(parsed);

      const current = buckets.get(dayKey) ?? { scoreSum: 0, count: 0 };
      current.scoreSum += score;
      current.count += 1;
      buckets.set(dayKey, current);

      if (parsedMs >= today.getTime()) {
        todaySum += score;
        todayCount += 1;
      }
      if (parsedMs >= weekStart.getTime()) {
        weekSum += score;
        weekCount += 1;
      }
      if (parsedMs >= monthStart.getTime()) {
        monthSum += score;
        monthCount += 1;
      }
    }

    const points: Array<{ date: string; user_average_score: number; user_checkins: number }> = [];
    for (let i = 29; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const key = toDayKey(day);
      const bucket = buckets.get(key);
      points.push({
        date: key,
        user_average_score: average(bucket?.scoreSum ?? 0, bucket?.count ?? 0),
        user_checkins: bucket?.count ?? 0,
      });
    }

    return {
      points,
      windows: {
        today: {
          average_score: average(todaySum, todayCount),
          checkin_count: todayCount,
        },
        week: {
          average_score: average(weekSum, weekCount),
          checkin_count: weekCount,
        },
        month: {
          average_score: average(monthSum, monthCount),
          checkin_count: monthCount,
        },
      },
    };
  }, [journalEntries]);

  const mergedTrendData = useMemo(() => {
    const campusByDay = new Map(
      (campusInsights?.trend_data ?? []).map((point) => [point.date, point])
    );

    return userTrend.points.map((point) => ({
      date: point.date,
      campus_average_score: campusByDay.get(point.date)?.average_score ?? 0,
      campus_checkins: campusByDay.get(point.date)?.checkin_count ?? 0,
      user_average_score: point.user_average_score,
      user_checkins: point.user_checkins,
    }));
  }, [campusInsights?.trend_data, userTrend.points]);

  // --- Phase 3: Classmates List ---
  const [classmates, setClassmates] = useState<any[]>([]);
  const [loadingClassmates, setLoadingClassmates] = useState(false);

  useEffect(() => {
    const fetchClassmates = async () => {
      setLoadingClassmates(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingClassmates(false); return; }
      
      const { data: myProfile } = await supabase
          .from('profiles')
          .select('university_name, major, grade_level, is_student')
          .eq('id', user.id)
          .single();

      if (!myProfile?.is_student || !myProfile?.university_name) {
          setLoadingClassmates(false);
          return;
      }

      const { data: peers } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, major, grade_level, latest_mood')
          .eq('university_name', myProfile.university_name)
          .eq('major', myProfile.major)
          .neq('id', user.id)
          .limit(20);

      if (peers) {
          setClassmates(peers);
      }
      setLoadingClassmates(false);
    };

    fetchClassmates();
  }, [college]);

  // --- Phase 4: Add Friend ---
  const handleAddFriend = async (peerId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
          .from('friendships')
          .insert({
              user_id: user.id,
              friend_id: peerId,
              status: 'pending'
          });

      if (error) {
          toast.error("Failed to send request");
      } else {
          toast.success("Friend request sent!");
      }
  };

  if (!college) {
    return (
      <section className="mt-6 app-surface rounded-3xl p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Campus Dashboard</h2>
        <p className="mt-2 text-sm text-[var(--muted-text)]">
          Add your college during sign-up to unlock campus emotional analytics.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 app-surface rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Campus Dashboard</h2>
          <p className="mt-1 text-xs text-[var(--muted-text)]">
            Anonymous campus-level trends with identity-safe aggregation.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">
          <CollegeLogo collegeName={college.name} size={18} />
          {college.name}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Campus Overview</p>
          <div className="mt-2 flex items-center gap-2.5">
            <CollegeLogo collegeName={college.name} size={32} />
            <div>
              <p className="text-sm font-semibold text-slate-200">{college.name}</p>
              <p className="text-xs text-slate-400">{college.city}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Students on Platform</p>
          <p className="mt-2 text-xl font-semibold text-emerald-300">
            {campusInsights?.participant_count ?? "--"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Campus participants</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Total Check-ins</p>
          <p className="mt-2 text-xl font-semibold text-indigo-300">
            {campusInsights?.checkin_count ?? "--"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Anonymous aggregate only</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center text-sm text-slate-400">
          Loading campus trends...
        </div>
      ) : campusInsights?.redacted ? (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-5 text-sm text-amber-200">
          Campus data is hidden until at least {campusInsights.min_participants_required} students are active.
          Current participants: {campusInsights.participant_count}.
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-200">Campus Emotional Trends</h3>
              <p className="text-xs text-slate-400">You vs campus average (last 30 days)</p>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(value) => value.slice(5)}
                    minTickGap={26}
                  />
                  <YAxis
                    domain={[-1, 1]}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(148,163,184,0.35)",
                      borderRadius: 12,
                      color: "#e2e8f0",
                    }}
                    formatter={(value, name) => [
                      scoreLabel(typeof value === "number" ? value : Number(value ?? 0)),
                      name === "campus_average_score" ? "Campus" : "You",
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="campus_average_score"
                    stroke="#38bdf8"
                    strokeWidth={2.4}
                    dot={false}
                    name="campus_average_score"
                  />
                  <Line
                    type="monotone"
                    dataKey="user_average_score"
                    stroke="#34d399"
                    strokeWidth={2.4}
                    dot={false}
                    name="user_average_score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-slate-200">Your Campus Contribution</h3>
              <p className="mt-1 text-xs text-slate-400">Compared to campus average score</p>

              <div className="mt-4 grid gap-2">
                {["today", "week", "month"].map((period) => {
                  const userWindow = userTrend.windows[period as "today" | "week" | "month"];
                  const campusWindow = campusInsights?.recent_mood_trends?.[period as "today" | "week" | "month"];
                  const delta = (userWindow.average_score ?? 0) - (campusWindow?.average_score ?? 0);

                  return (
                    <div key={period} className="rounded-xl border border-white/[0.08] bg-slate-900/40 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wide text-slate-400">{period}</p>
                        <p className={`text-xs font-semibold ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {delta >= 0 ? "+" : ""}{delta.toFixed(2)} vs campus
                        </p>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-300">
                        <span>You: {scoreLabel(userWindow.average_score)}</span>
                        <span>Campus: {scoreLabel(campusWindow?.average_score ?? 0)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">Your check-ins: {userWindow.checkin_count}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-slate-200">Top Reported Emotions</h3>
              <p className="mt-1 text-xs text-slate-400">Campus-wide anonymous distribution</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {(campusInsights?.top_reported_emotions ?? []).map((emotion) => (
                  <div
                    key={emotion.emotion}
                    className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200"
                  >
                    {emotion.emotion} • {emotion.share.toFixed(1)}%
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {(campusInsights?.emotion_distribution ?? [])
                  .filter((emotion) => emotion.count > 0)
                  .slice(0, 5)
                  .map((emotion) => (
                    <div key={emotion.emotion} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{emotion.emotion}</span>
                      <span className="font-semibold text-slate-100">{emotion.count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Phase 3 & 4 UI: Classmates List */}
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
             <h3 className="text-sm font-semibold text-slate-200">Meet Like-Minded Peers</h3>
             <p className="mt-1 text-xs text-slate-400">Classmates in your major</p>

             {loadingClassmates ? (
                <p className="mt-4 text-xs text-slate-500">Looking for peers...</p>
             ) : classmates.length === 0 ? (
                <p className="mt-4 text-xs text-slate-500">No peers found in your exact major yet! Invite some friends.</p>
             ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                   {classmates.map(peer => (
                      <div key={peer.id} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-slate-900/50 p-3">
                         <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg">
                               {peer.avatar_url ? (
                                  <img src={peer.avatar_url} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
                               ) : (
                                  "🎓"
                               )}
                            </div>
                            <div>
                               <p className="text-sm font-medium text-slate-200">{peer.full_name || "Anonymous Student"}</p>
                               <p className="text-[10px] text-slate-400">{peer.grade_level} • {peer.major}</p>
                            </div>
                         </div>
                         <button 
                            onClick={() => handleAddFriend(peer.id)}
                            className="rounded-lg bg-teal-500/20 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/30 transition"
                         >
                            Add Friend
                         </button>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </>
      )}
    </section>
  );
}
