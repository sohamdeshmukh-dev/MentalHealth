import { CheckIn, CITIES, MOODS, CityConfig } from "./types";

const checkins: CheckIn[] = [];

/**
 * Generate 300-500 clustered demo points per city so the skyline
 * and heatmap are immediately visible on load.
 */
function generateCityData(city: CityConfig) {
  const now = Date.now();

  // 8-12 clusters per city
  const clusterCount = 8 + Math.floor(Math.random() * 5);

  for (let c = 0; c < clusterCount; c++) {
    // Cluster center — within ~0.04 deg of city center
    const cLat = city.lat + (Math.random() - 0.5) * 0.08;
    const cLng = city.lng + (Math.random() - 0.5) * 0.08;

    // 20-50 points per cluster
    const pointCount = 20 + Math.floor(Math.random() * 30);

    // ~40% of clusters are "hot zones" biased toward stress
    const isHotZone = Math.random() < 0.4;

    for (let i = 0; i < pointCount; i++) {
      const moodPool = isHotZone
        ? MOODS.filter((m) => m.weight >= 0.7)
        : MOODS;
      const mood = moodPool[Math.floor(Math.random() * moodPool.length)];

      // Gaussian-ish spread via sum of randoms (tighter clusters)
      const spreadLat = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 0.018;
      const spreadLng = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 0.018;

      checkins.push({
        id: `seed-${city.name}-${c}-${i}`,
        mood: mood.label,
        message: "",
        timestamp: new Date(now - Math.random() * 86400000).toISOString(),
        lat: cLat + spreadLat,
        lng: cLng + spreadLng,
        city: city.name,
      });
    }
  }
}

// Seed all cities
CITIES.forEach(generateCityData);

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
