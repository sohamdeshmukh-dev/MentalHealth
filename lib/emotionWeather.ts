import { CheckIn, Mood } from "@/lib/types";

export type WeatherEmotion = "anxiety" | "sadness" | "calm" | "happiness";

export interface EmotionCluster {
  id: string;
  emotion: WeatherEmotion;
  intensity: number;
  coordinates: [number, number];
  radiusMeters: number;
  count: number;
  peakHour: number;
  trend: "Rising" | "Cooling" | "Stable";
}

interface Bucket {
  key: string;
  latTotal: number;
  lngTotal: number;
  count: number;
  moodCounts: Record<WeatherEmotion, number>;
  checkins: CheckIn[];
}

const GRID_SIZE_DEGREES = 0.014;
const MAX_CLUSTERS = 28;

function toTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Date.now();
}

function toWeatherEmotion(mood: Mood): WeatherEmotion {
  if (mood === "Stressed" || mood === "Overwhelmed") {
    return "anxiety";
  }
  if (mood === "Sad") {
    return "sadness";
  }
  if (mood === "Happy") {
    return "happiness";
  }
  return "calm";
}

function getPeakHour(checkins: CheckIn[], dominantEmotion: WeatherEmotion) {
  const hours = new Array(24).fill(0) as number[];

  for (const checkin of checkins) {
    if (toWeatherEmotion(checkin.mood) !== dominantEmotion) {
      continue;
    }
    const ts = toTimestamp(checkin.timestamp);
    const hour = new Date(ts).getHours();
    hours[hour] += 1;
  }

  let peakHour = 0;
  let peakCount = -1;
  for (let hour = 0; hour < 24; hour += 1) {
    if (hours[hour] > peakCount) {
      peakHour = hour;
      peakCount = hours[hour];
    }
  }

  return peakHour;
}

function getTrend(checkins: CheckIn[], dominantEmotion: WeatherEmotion) {
  const now = Date.now();
  const recentWindowStart = now - 6 * 60 * 60 * 1000;
  const priorWindowStart = now - 12 * 60 * 60 * 1000;

  let recentCount = 0;
  let previousCount = 0;

  for (const checkin of checkins) {
    if (toWeatherEmotion(checkin.mood) !== dominantEmotion) {
      continue;
    }

    const ts = toTimestamp(checkin.timestamp);
    if (ts >= recentWindowStart) {
      recentCount += 1;
    } else if (ts >= priorWindowStart) {
      previousCount += 1;
    }
  }

  if (recentCount > previousCount * 1.15) {
    return "Rising" as const;
  }
  if (recentCount < previousCount * 0.85) {
    return "Cooling" as const;
  }
  return "Stable" as const;
}

export function buildEmotionClusters(checkins: CheckIn[]) {
  if (!Array.isArray(checkins) || checkins.length === 0) {
    return [] as EmotionCluster[];
  }

  const buckets = new Map<string, Bucket>();

  for (const checkin of checkins) {
    if (!Number.isFinite(checkin.lat) || !Number.isFinite(checkin.lng)) {
      continue;
    }

    const col = Math.floor(checkin.lng / GRID_SIZE_DEGREES);
    const row = Math.floor(checkin.lat / GRID_SIZE_DEGREES);
    const key = `${col}:${row}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        latTotal: 0,
        lngTotal: 0,
        count: 0,
        moodCounts: {
          anxiety: 0,
          sadness: 0,
          calm: 0,
          happiness: 0,
        },
        checkins: [],
      };
      buckets.set(key, bucket);
    }

    const weatherEmotion = toWeatherEmotion(checkin.mood);
    bucket.latTotal += checkin.lat;
    bucket.lngTotal += checkin.lng;
    bucket.count += 1;
    bucket.moodCounts[weatherEmotion] += 1;
    bucket.checkins.push(checkin);
  }

  const clusters: EmotionCluster[] = [];

  for (const bucket of buckets.values()) {
    if (bucket.count < 2) {
      continue;
    }

    const dominant = (Object.entries(bucket.moodCounts).sort((a, b) => b[1] - a[1])[0] ?? ["calm", 0]) as [WeatherEmotion, number];
    const dominantEmotion = dominant[0];
    const dominantCount = dominant[1];

    const clusterRatio = dominantCount / bucket.count;
    const densityBoost = Math.min(bucket.count / 18, 1);
    const intensity = Math.max(0.2, Math.min(1, clusterRatio * 0.7 + densityBoost * 0.6));

    const avgLat = bucket.latTotal / bucket.count;
    const avgLng = bucket.lngTotal / bucket.count;
    const radiusMeters = Math.round(130 + intensity * 210 + Math.min(bucket.count, 22) * 9);

    clusters.push({
      id: bucket.key,
      emotion: dominantEmotion,
      intensity: Number(intensity.toFixed(3)),
      coordinates: [avgLng, avgLat],
      radiusMeters,
      count: bucket.count,
      peakHour: getPeakHour(bucket.checkins, dominantEmotion),
      trend: getTrend(bucket.checkins, dominantEmotion),
    });
  }

  return clusters
    .sort((a, b) => b.intensity * b.count - a.intensity * a.count)
    .slice(0, MAX_CLUSTERS);
}

export function weatherTitle(emotion: WeatherEmotion) {
  switch (emotion) {
    case "anxiety":
      return "Anxiety Spike";
    case "sadness":
      return "Sadness Rain";
    case "happiness":
      return "Happiness Glow";
    default:
      return "Calm Zone";
  }
}
