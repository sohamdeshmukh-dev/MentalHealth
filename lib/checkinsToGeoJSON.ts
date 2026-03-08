import type { CheckIn } from './types';
import { MOOD_WEIGHT } from './types';

export function checkinsToGeoJSON(checkins: CheckIn[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: checkins.map((c) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [c.lng, c.lat],
            },
            properties: {
                mood: c.mood,
                weight: MOOD_WEIGHT[c.mood] ?? 0.5,
            },
        })),
    };
}
