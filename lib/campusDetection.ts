export interface Campus {
    name: string;
    lat: number;
    lng: number;
    radiusKm: number;
}

export const CAMPUSES: Campus[] = [
    // New York City
    { name: "Columbia University", lat: 40.8075, lng: -73.9626, radiusKm: 1.8 },
    { name: "New York University", lat: 40.7295, lng: -73.9965, radiusKm: 1.5 },
    { name: "City College of New York", lat: 40.8198, lng: -73.9492, radiusKm: 1.2 },

    // Los Angeles
    { name: "University of California, Los Angeles", lat: 34.0689, lng: -118.4452, radiusKm: 2.0 },
    { name: "University of Southern California", lat: 34.0224, lng: -118.2851, radiusKm: 1.7 },
    { name: "Loyola Marymount University", lat: 33.9701, lng: -118.4165, radiusKm: 1.3 },

    // Chicago
    { name: "University of Chicago", lat: 41.7886, lng: -87.5987, radiusKm: 1.8 },
    { name: "University of Illinois Chicago", lat: 41.8708, lng: -87.6505, radiusKm: 1.6 },
    { name: "Northwestern University", lat: 42.0565, lng: -87.6753, radiusKm: 1.9 },

    // Houston
    { name: "Rice University", lat: 29.7174, lng: -95.4018, radiusKm: 1.7 },
    { name: "University of Houston", lat: 29.7199, lng: -95.3422, radiusKm: 1.8 },
    { name: "Texas Southern University", lat: 29.7211, lng: -95.3590, radiusKm: 1.4 },

    // Phoenix
    { name: "Arizona State University - Downtown Phoenix", lat: 33.4534, lng: -112.0738, radiusKm: 1.5 },
    { name: "Grand Canyon University", lat: 33.5122, lng: -112.1299, radiusKm: 1.7 },
    { name: "University of Arizona College of Medicine - Phoenix", lat: 33.4652, lng: -112.0736, radiusKm: 1.2 },

    // Philadelphia
    { name: "University of Pennsylvania", lat: 39.9522, lng: -75.1932, radiusKm: 1.7 },
    { name: "Drexel University", lat: 39.9566, lng: -75.1899, radiusKm: 1.5 },
    { name: "Temple University", lat: 39.9812, lng: -75.1553, radiusKm: 1.6 },

    // San Antonio
    { name: "The University of Texas at San Antonio", lat: 29.5849, lng: -98.6177, radiusKm: 2.0 },
    { name: "Trinity University", lat: 29.4633, lng: -98.4826, radiusKm: 1.3 },
    { name: "St. Mary's University", lat: 29.4256, lng: -98.5418, radiusKm: 1.2 },

    // San Diego
    { name: "University of California San Diego", lat: 32.8801, lng: -117.2340, radiusKm: 2.2 },
    { name: "San Diego State University", lat: 32.7757, lng: -117.0716, radiusKm: 1.8 },
    { name: "University of San Diego", lat: 32.7719, lng: -117.1887, radiusKm: 1.3 },

    // Dallas
    { name: "Southern Methodist University", lat: 32.8426, lng: -96.7848, radiusKm: 1.6 },
    { name: "The University of Texas at Dallas", lat: 32.9858, lng: -96.7501, radiusKm: 1.8 },
    { name: "Dallas Baptist University", lat: 32.7073, lng: -96.9452, radiusKm: 1.4 },

    // Jacksonville
    { name: "University of North Florida", lat: 30.2699, lng: -81.5072, radiusKm: 1.9 },
    { name: "Jacksonville University", lat: 30.3504, lng: -81.6031, radiusKm: 1.4 },
    { name: "Edward Waters University", lat: 30.3333, lng: -81.6931, radiusKm: 1.2 },

    // Charlottesville
    { name: "University of Virginia", lat: 38.0356, lng: -78.5034, radiusKm: 1.8 },
    { name: "Piedmont Virginia Community College", lat: 38.0246, lng: -78.4369, radiusKm: 1.1 },
    { name: "University of Virginia School of Law", lat: 38.0500, lng: -78.5074, radiusKm: 1.0 },
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
