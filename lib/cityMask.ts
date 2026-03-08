import turfCircle from "@turf/circle";
import { point } from "@turf/helpers";
import { CityConfig } from "./types";

/**
 * Build an inverted polygon mask: a giant world-covering polygon with a hole
 * cut out for the city. When rendered as a fill layer with high opacity,
 * everything outside the city fades/dims.
 */
export function buildCityMask(city: CityConfig): GeoJSON.FeatureCollection {
  // Outer ring covering the whole world
  const outerRing: GeoJSON.Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];

  // Inner ring = the city circle (hole), wound in opposite direction
  const center = point([city.lng, city.lat]);
  const circle = turfCircle(center, city.radius, { steps: 80, units: "kilometers" });
  const innerRing = circle.geometry.coordinates[0].slice().reverse();

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [outerRing, innerRing],
        },
      },
    ],
  };
}
