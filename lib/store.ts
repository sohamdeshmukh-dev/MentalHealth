import { CheckIn, CITIES, MOODS } from "./types";

// In-memory store — replace with Firebase / Supabase later.
const checkins: CheckIn[] = [];

// Seed some demo data so the heatmap isn't empty on first load.
function seed() {
  const now = Date.now();
  CITIES.forEach((city) => {
    const count = 8 + Math.floor(Math.random() * 12);
    for (let i = 0; i < count; i++) {
      const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
      checkins.push({
        id: `seed-${city.name}-${i}`,
        mood: mood.label,
        message: "",
        timestamp: new Date(now - Math.random() * 86400000).toISOString(),
        lat: city.lat + (Math.random() - 0.5) * 0.08,
        lng: city.lng + (Math.random() - 0.5) * 0.08,
        city: city.name,
      });
    }
  });
}
seed();

export function getAllCheckIns(): CheckIn[] {
  return [...checkins].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getCheckInsByCity(city: string): CheckIn[] {
  return checkins
    .filter((c) => c.city === city)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function addCheckIn(entry: CheckIn): CheckIn {
  checkins.push(entry);
  return entry;
}
