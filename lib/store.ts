import { CheckIn, CITIES, MOODS, CityConfig, Resource } from "./types";

const checkins: CheckIn[] = [];
let seeded = false;

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
        timestamp: now - Math.random() * 86400000,
        lat: cLat + spreadLat,
        lng: cLng + spreadLng,
        city: city.name,
      });
    }
  }
}

function ensureSeeded() {
  if (seeded) return;
  CITIES.forEach(generateCityData);
  seeded = true;
}

export function getAllCheckIns(): CheckIn[] {
  ensureSeeded();
  return [...checkins].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getCheckInsByCity(city: string): CheckIn[] {
  ensureSeeded();
  return checkins
    .filter((c) => c.city === city)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function addCheckIn(entry: CheckIn): CheckIn {
  checkins.push(entry);
  return entry;
}

export const SAMPLE_RESOURCES: Record<string, Resource[]> = {
  Philadelphia: [
    {
      name: "Hall-Mercer Community MH Center",
      address1: "245 S 8th St",
      lat: 39.9463,
      lng: -75.1551,
      phone: "215-829-5249",
    },
    {
      name: "Consortium Inc",
      address1: "5501 Chestnut St",
      lat: 39.9575,
      lng: -75.2319,
      phone: "215-748-8400",
    },
    {
      name: "Intercultural Family Services Inc",
      address1: "4225 Chestnut St",
      lat: 39.9567,
      lng: -75.2078,
      phone: "215-386-1298",
    },
  ],
  Chicago: [
    {
      name: "Thresholds",
      address1: "4101 N Ravenswood Ave",
      lat: 41.9566,
      lng: -87.6746,
      phone: "773-572-5200",
    },
    {
      name: "Bobby E Wright Comprehensive BH Center",
      address1: "9 S Kedzie Ave",
      lat: 41.8812,
      lng: -87.7062,
      phone: "773-722-7900",
    },
  ],
};

export function getResourcesByCity(cityName: string): Resource[] {
  return SAMPLE_RESOURCES[cityName] ?? [];
}
