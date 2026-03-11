import { CheckIn, CityConfig, Mood, MOODS } from "@/lib/types";

/**
 * Generates synthetic check-in points spread widely across a city so the
 * emotional weather overlay has data across the full urban area, not just
 * the center.
 *
 * Points are deterministic per city (seeded by city name) so they stay
 * stable across React re-renders.
 */

const SEED_COUNT = 180; // points per city

const MOOD_LABELS: Mood[] = MOODS.map((m) => m.label);

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ~111 km per degree of latitude; longitude varies by cos(lat)
function kmToDegLat(km: number) {
  return km / 111;
}
function kmToDegLng(km: number, lat: number) {
  return km / (111 * Math.cos((lat * Math.PI) / 180));
}

interface Neighborhood {
  latOff: number;
  lngOff: number;
  spread: number; // degrees — how spread out points are within this hood
  moodBias: Mood[];
  weight: number;
}

function generateNeighborhoods(rand: () => number, city: CityConfig): Neighborhood[] {
  const count = 8 + Math.floor(rand() * 6); // 8–13 neighborhoods
  const neighborhoods: Neighborhood[] = [];

  // Convert city radius (km) to degrees for placement range
  const radiusLat = kmToDegLat(city.radius * 0.85);
  const radiusLng = kmToDegLng(city.radius * 0.85, city.lat);

  for (let i = 0; i < count; i++) {
    // Spread neighborhoods across the full city area using polar coords
    // with varying distance from center — not just the edge, not just center
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.8;

    // Use sqrt for uniform area distribution (avoids center clustering)
    const distFraction = 0.15 + Math.sqrt(rand()) * 0.85;
    const latOff = Math.sin(angle) * radiusLat * distFraction;
    const lngOff = Math.cos(angle) * radiusLng * distFraction;

    // Each neighborhood has a mood tendency
    const biasStart = Math.floor(rand() * MOOD_LABELS.length);
    const biasCount = 1 + Math.floor(rand() * 2);
    const moodBias: Mood[] = [];
    for (let j = 0; j < biasCount; j++) {
      moodBias.push(MOOD_LABELS[(biasStart + j) % MOOD_LABELS.length]);
    }

    // Neighborhood internal spread — proportional to city size
    const hoodSpread = kmToDegLat(1.2 + rand() * 2.5);

    neighborhoods.push({
      latOff,
      lngOff,
      spread: hoodSpread,
      moodBias,
      weight: 0.5 + rand() * 1.5,
    });
  }

  return neighborhoods;
}

export function generateSeedCheckins(city: CityConfig): CheckIn[] {
  const seed = hashString(city.name);
  const rand = mulberry32(seed);
  const neighborhoods = generateNeighborhoods(rand, city);

  const totalWeight = neighborhoods.reduce((s, n) => s + n.weight, 0);
  const checkins: CheckIn[] = [];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Also sprinkle some fully random scatter points across the entire city
  const scatterCount = Math.round(SEED_COUNT * 0.2);
  const hoodCount = SEED_COUNT - scatterCount;

  // Neighborhood-based points
  for (const hood of neighborhoods) {
    const count = Math.round((hood.weight / totalWeight) * hoodCount);

    for (let i = 0; i < count; i++) {
      // Gaussian distribution within neighborhood
      const u1 = rand();
      const u2 = rand();
      const r = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001)));
      const theta = 2 * Math.PI * u2;
      const gx = r * Math.cos(theta);
      const gy = r * Math.sin(theta);

      const lat = city.lat + hood.latOff + gx * hood.spread * 0.5;
      const lng = city.lng + hood.lngOff + gy * hood.spread * 0.5;

      let mood: Mood;
      if (rand() < 0.65) {
        mood = hood.moodBias[Math.floor(rand() * hood.moodBias.length)];
      } else {
        mood = MOOD_LABELS[Math.floor(rand() * MOOD_LABELS.length)];
      }

      const timestamp = now - Math.floor(rand() * dayMs);

      checkins.push({
        id: `seed-${city.name}-${checkins.length}`,
        mood,
        message: "",
        timestamp,
        lat,
        lng,
        city: city.name,
        hugs: 0,
      });
    }
  }

  // Scatter points — uniform random across full city radius
  const scatterRadLat = kmToDegLat(city.radius * 0.9);
  const scatterRadLng = kmToDegLng(city.radius * 0.9, city.lat);

  for (let i = 0; i < scatterCount; i++) {
    // Uniform disk distribution (sqrt for even area coverage)
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand());

    const lat = city.lat + Math.sin(angle) * scatterRadLat * dist;
    const lng = city.lng + Math.cos(angle) * scatterRadLng * dist;
    const mood = MOOD_LABELS[Math.floor(rand() * MOOD_LABELS.length)];
    const timestamp = now - Math.floor(rand() * dayMs);

    checkins.push({
      id: `seed-${city.name}-${checkins.length}`,
      mood,
      message: "",
      timestamp,
      lat,
      lng,
      city: city.name,
      hugs: 0,
    });
  }

  return checkins;
}
