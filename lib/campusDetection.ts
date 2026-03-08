export interface Campus {
    name: string;
    lat: number;
    lng: number;
    radiusKm: number;
}

export const CAMPUSES: Campus[] = [
    { name: "UVA", lat: 38.0336, lng: -78.5080, radiusKm: 1.6 }, // 1 mile is approx 1.6 km
    { name: "Virginia Tech", lat: 37.2284, lng: -80.4234, radiusKm: 1.6 },
    { name: "JMU", lat: 38.4351, lng: -78.8698, radiusKm: 1.6 },
    { name: "VCU", lat: 37.5483, lng: -77.4527, radiusKm: 1.6 },
    { name: "George Mason", lat: 38.8315, lng: -77.3117, radiusKm: 1.6 },
    // Adding NY / CA ones to match cities
    { name: "NYU", lat: 40.7295, lng: -73.9965, radiusKm: 1.6 },
    { name: "USC", lat: 34.0224, lng: -118.2851, radiusKm: 1.6 },
];

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

export function detectCampus(lat: number, lng: number): Campus | null {
    for (const campus of CAMPUSES) {
        const dist = getDistanceFromLatLonInKm(lat, lng, campus.lat, campus.lng);
        if (dist <= campus.radiusKm) {
            return campus;
        }
    }
    return null;
}
