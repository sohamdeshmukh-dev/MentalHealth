import { CheckIn, MOODS } from "./types";

/**
 * Grid cell size in degrees (~100m at mid latitudes).
 * Smaller = more granular skyline columns.
 */
const CELL_SIZE = 0.0012;

/**
 * Aggregate check-in points into a grid, then emit each cell as a small
 * square polygon with properties for height & color.
 * Mapbox `fill-extrusion` requires polygon geometry — points are ignored.
 */
export function buildSkylineGeoJSON(data: CheckIn[]): GeoJSON.FeatureCollection {
  // ── 1. Bucket points into grid cells ────────────────────────
  const buckets = new Map<string, { weights: number[]; moods: string[]; lat: number; lng: number }>();

  for (const c of data) {
    const col = Math.floor(c.lng / CELL_SIZE);
    const row = Math.floor(c.lat / CELL_SIZE);
    const key = `${col}:${row}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        weights: [],
        moods: [],
        lat: (row + 0.5) * CELL_SIZE,
        lng: (col + 0.5) * CELL_SIZE,
      };
      buckets.set(key, bucket);
    }

    const w = MOODS.find((m) => m.label === c.mood)?.weight ?? 0.5;
    bucket.weights.push(w);
    bucket.moods.push(c.mood);
  }

  // ── 2. Convert each bucket to a polygon feature ─────────────
  const features: GeoJSON.Feature[] = [];

  for (const [, bucket] of buckets) {
    const avgWeight =
      bucket.weights.reduce((a, b) => a + b, 0) / bucket.weights.length;
    const count = bucket.weights.length;

    // Pick the most common mood in the cell
    const freq = new Map<string, number>();
    for (const m of bucket.moods) freq.set(m, (freq.get(m) ?? 0) + 1);
    let dominant = bucket.moods[0];
    let maxFreq = 0;
    for (const [m, f] of freq) {
      if (f > maxFreq) { dominant = m; maxFreq = f; }
    }

    // Height = f(avgWeight, density). More reports + higher stress = taller.
    const densityMultiplier = Math.min(count / 3, 4); // cap at 4x
    const height = (100 + avgWeight * 800) * densityMultiplier;

    const half = CELL_SIZE * 0.45; // slight gap between cells
    const { lat, lng } = bucket;

    features.push({
      type: "Feature",
      properties: {
        weight: avgWeight,
        count,
        height,
        mood: dominant,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [lng - half, lat - half],
          [lng + half, lat - half],
          [lng + half, lat + half],
          [lng - half, lat + half],
          [lng - half, lat - half],
        ]],
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/**
 * Flat point GeoJSON for the heatmap layer (unchanged from before).
 */
export function buildPointGeoJSON(data: CheckIn[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: data.map((c) => ({
      type: "Feature" as const,
      properties: {
        mood: c.mood,
        weight: MOODS.find((m) => m.label === c.mood)?.weight ?? 0.5,
        message: c.message,
        timestamp: c.timestamp,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [c.lng, c.lat],
      },
    })),
  };
}
