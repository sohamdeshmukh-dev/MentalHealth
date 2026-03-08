'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { CheckIn } from '@/lib/types';
import { checkinsToGeoJSON } from '@/lib/checkinsToGeoJSON';

interface Props {
    map: mapboxgl.Map | null;
    checkins: CheckIn[];
    selectedCity?: string | null;
    selectedMood?: string | null;
}

const SOURCE_ID = 'mood-checkins';
const LAYER_ID = 'snap-heatmap';

export default function MoodHeatmap({ map, checkins, selectedCity, selectedMood }: Props) {
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!map) return;

        const geojson = checkinsToGeoJSON(checkins);

        const setup = () => {
            if (map.getSource(SOURCE_ID)) {
                (map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(geojson);
                return;
            }

            map.addSource(SOURCE_ID, {
                type: 'geojson',
                data: geojson,
            });

            if (!map.getLayer(LAYER_ID)) {
                map.addLayer({
                    id: LAYER_ID,
                    type: 'heatmap',
                    source: SOURCE_ID,
                    paint: {
                        'heatmap-color': [
                            'interpolate',
                            ['linear'],
                            ['heatmap-density'],
                            0, 'rgba(33,102,172,0)',
                            0.2, 'rgb(103,169,207)',
                            0.4, 'rgb(209,229,240)',
                            0.6, 'rgb(253,219,199)',
                            0.8, 'rgb(239,138,98)',
                            1, 'rgb(255,0,0)'
                        ],
                        'heatmap-radius': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            10, 15,
                            15, 40
                        ],
                        'heatmap-intensity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            11, 1,
                            15, 3
                        ],
                        'heatmap-opacity': 0.7
                    },
                });
            }

            initializedRef.current = true;
        };

        if (map.isStyleLoaded()) {
            setup();
        } else {
            map.once('load', setup);
        }
    }, [map, checkins]);

    useEffect(() => {
        if (!map || !map.isStyleLoaded()) return;
        if (!map.getLayer(LAYER_ID)) return;

        // Build a Mapbox filter array dynamically
        const filters: any[] = ['all']; // 'all' means ALL conditions must be true

        if (selectedCity) {
            // Looks for the "city" property in your GeoJSON features
            filters.push(['==', ['get', 'city'], selectedCity]);
        }

        if (selectedMood) {
            // Looks for the "mood" property in your GeoJSON features
            filters.push(['==', ['get', 'mood'], selectedMood]);
        }

        // Apply the filter (if no city/mood selected, clear the filter to show all)
        if (filters.length === 1) {
            map.setFilter(LAYER_ID, null);
        } else {
            map.setFilter(LAYER_ID, filters);
        }
    }, [map, selectedMood, selectedCity]);

    return null;
}
