import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEmotionalBalanceScore } from "@/lib/journal";
import { MOODS, Mood } from "@/lib/types";

interface CollegeRow {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  campus_radius: number;
}

interface JournalRow {
  id: string;
  user_id: string;
  mood: string | null;
  intensity: number | null;
  created_at: string | null;
}

const MIN_PARTICIPANTS = 5;
const TREND_DAYS = 30;
const MAX_HEATMAP_POINTS = 360;
const VALID_MOODS = new Set<Mood>(MOODS.map((mood) => mood.label));

async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component usage (read-only cookies)
          }
        },
      },
    }
  );
}

function normalizeMood(value: string | null): Mood {
  if (value && VALID_MOODS.has(value as Mood)) {
    return value as Mood;
  }
  return "Neutral";
}

function clampIntensity(value: number | null) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(100, Math.round(value as number)));
}

function hashToUnit(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0) / 4294967295;
}

function jitterAroundCampus(
  latitude: number,
  longitude: number,
  radiusKm: number,
  seed: string
) {
  const unitA = hashToUnit(`${seed}-a`);
  const unitB = hashToUnit(`${seed}-b`);
  const angle = unitA * Math.PI * 2;
  const distanceKm = unitB * Math.max(radiusKm, 0.8) * 0.92;

  const latOffset = (distanceKm / 110.574) * Math.cos(angle);
  const cosLat = Math.max(Math.cos((latitude * Math.PI) / 180), 0.2);
  const lngOffset = (distanceKm / (111.32 * cosLat)) * Math.sin(angle);

  return {
    lat: Number((latitude + latOffset).toFixed(6)),
    lng: Number((longitude + lngOffset).toFixed(6)),
  };
}

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function avg(sum: number, count: number) {
  return count > 0 ? Number((sum / count).toFixed(3)) : 0;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ college_id: string }> }
) {
  const { college_id: collegeId } = await context.params;
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: collegeData, error: collegeError } = await supabase
    .from("colleges")
    .select("id, name, city, latitude, longitude, campus_radius")
    .eq("id", collegeId)
    .single();
  const college = (collegeData as CollegeRow | null) ?? null;

  if (collegeError || !college) {
    return NextResponse.json(
      { error: collegeError?.message ?? "Campus not found." },
      { status: 404 }
    );
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("college_id", collegeId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const participantCount = profiles?.length ?? 0;

  if (participantCount < MIN_PARTICIPANTS) {
    return NextResponse.json({
      college_id: college.id,
      college_name: college.name,
      city: college.city,
      participant_count: participantCount,
      min_participants_required: MIN_PARTICIPANTS,
      redacted: true,
      emotion_distribution: [],
      checkin_count: 0,
      trend_data: [],
      top_reported_emotions: [],
      recent_mood_trends: null,
      heatmap_points: [],
    });
  }

  const userIds = (profiles ?? []).map((profile) => profile.id).filter(Boolean);

  const { data: entries, error: entriesError } = await supabase
    .from("journal_entries")
    .select("id, user_id, mood, intensity, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(4000)
    .returns<JournalRow[]>();

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  const { count: campusCheckinCount } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("college_id", collegeId);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);

  const monthStart = new Date(todayStart);
  monthStart.setDate(todayStart.getDate() - 29);

  const trendBuckets = new Map<string, { sumScore: number; count: number }>();
  const moodCounts = MOODS.reduce<Record<Mood, number>>((acc, mood) => {
    acc[mood.label] = 0;
    return acc;
  }, {} as Record<Mood, number>);

  const heatmapPoints: Array<{
    lat: number;
    lng: number;
    mood: Mood;
    weight: number;
    intensity: number;
  }> = [];

  let todaySum = 0;
  let todayCount = 0;
  let weekSum = 0;
  let weekCount = 0;
  let monthSum = 0;
  let monthCount = 0;

  for (const entry of entries ?? []) {
    const mood = normalizeMood(entry.mood);
    const intensity = clampIntensity(entry.intensity);
    const score = getEmotionalBalanceScore(mood, intensity);

    moodCounts[mood] += 1;

    const createdAt = entry.created_at ? new Date(entry.created_at) : null;
    const createdMs = createdAt?.getTime() ?? Number.NaN;
    if (!Number.isFinite(createdMs)) {
      continue;
    }

    const dayKey = formatDayKey(createdAt as Date);
    const currentBucket = trendBuckets.get(dayKey) ?? { sumScore: 0, count: 0 };
    currentBucket.sumScore += score;
    currentBucket.count += 1;
    trendBuckets.set(dayKey, currentBucket);

    if (createdMs >= todayStart.getTime()) {
      todaySum += score;
      todayCount += 1;
    }
    if (createdMs >= weekStart.getTime()) {
      weekSum += score;
      weekCount += 1;
    }
    if (createdMs >= monthStart.getTime()) {
      monthSum += score;
      monthCount += 1;
    }

    if (heatmapPoints.length < MAX_HEATMAP_POINTS) {
      const jitter = jitterAroundCampus(
        college.latitude,
        college.longitude,
        college.campus_radius,
        `${entry.id}-${entry.user_id}-${entry.created_at ?? ""}`
      );

      heatmapPoints.push({
        ...jitter,
        mood,
        intensity,
        weight: Number(Math.max(0.15, Math.min(1, Math.abs(score) + 0.2)).toFixed(3)),
      });
    }
  }

  const totalEntries = Object.values(moodCounts).reduce((sum, count) => sum + count, 0);
  const emotionDistribution = MOODS.map(({ label }) => {
    const count = moodCounts[label];
    return {
      emotion: label,
      count,
      share: totalEntries > 0 ? Number(((count / totalEntries) * 100).toFixed(2)) : 0,
    };
  });

  const topReportedEmotions = [...emotionDistribution]
    .sort((a, b) => b.count - a.count)
    .filter((item) => item.count > 0)
    .slice(0, 3);

  const trendData: Array<{ date: string; average_score: number; checkin_count: number }> = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(todayStart);
    day.setDate(todayStart.getDate() - i);
    const key = formatDayKey(day);
    const bucket = trendBuckets.get(key);
    trendData.push({
      date: key,
      average_score: avg(bucket?.sumScore ?? 0, bucket?.count ?? 0),
      checkin_count: bucket?.count ?? 0,
    });
  }

  return NextResponse.json({
    college_id: college.id,
    college_name: college.name,
    city: college.city,
    participant_count: participantCount,
    min_participants_required: MIN_PARTICIPANTS,
    redacted: false,
    emotion_distribution: emotionDistribution,
    checkin_count: campusCheckinCount ?? totalEntries,
    trend_data: trendData,
    top_reported_emotions: topReportedEmotions,
    recent_mood_trends: {
      today: {
        average_score: avg(todaySum, todayCount),
        checkin_count: todayCount,
      },
      week: {
        average_score: avg(weekSum, weekCount),
        checkin_count: weekCount,
      },
      month: {
        average_score: avg(monthSum, monthCount),
        checkin_count: monthCount,
      },
    },
    heatmap_points: heatmapPoints,
  });
}
