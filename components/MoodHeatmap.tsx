'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { CheckIn } from '@/lib/types';
import { checkinsToGeoJSON } from '@/lib/checkinsToGeoJSON';

interface Props {
    map: mapboxgl.Map | null;
    checkins: CheckIn[];
}

const SOURCE_ID = 'mood-checkins';
const LAYER_ID = 'mood-heatmap';

export default function MoodHeatmap({ map, checkins }: Props) {
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

            map.addLayer({
                id: LAYER_ID,
                type: 'heatmap',
                source: SOURCE_ID,
                paint: {
                    // Weight each point by mood severity
                    'heatmap-weight': [
                        'interpolate', ['linear'],
                        ['get', 'weight'],
                        0, 0,
                        1, 1,
                    ],
                    // Intensity scales up as you zoom in
                    'heatmap-intensity': [
                        'interpolate', ['linear'],
                        ['zoom'],
                        0, 0.8,
                        9, 2.5,
                    ],
                    // Snapchat-style: transparent core → yellow → orange → deep red
                    'heatmap-color': [
                        'interpolate', ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(0,0,0,0)',
                        0.15, 'rgba(255,230,0,0.4)',
                        0.35, 'rgba(255,165,0,0.65)',
                        0.6, 'rgba(255,60,0,0.85)',
                        0.8, 'rgba(220,20,20,0.95)',
                        1.0, 'rgba(180,0,50,1)',
                    ],
                    // Blob radius grows as you zoom in
                    'heatmap-radius': [
                        'interpolate', ['linear'],
                        ['zoom'],
                        0, 20,
                        9, 50,
                        14, 80,
                    ],
                    // Fade out heatmap at high zoom so individual markers show
                    'heatmap-opacity': [
                        'interpolate', ['linear'],
                        ['zoom'],
                        10, 1,
                        14, 0.4,
                    ],
                },
            });

            initializedRef.current = true;
        };

        if (map.isStyleLoaded()) {
            setup();
        } else {
            map.once('load', setup);
        }
    }, [map, checkins]);

    return null;
}
