'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Resource } from '@/lib/types';

interface Props {
    map: mapboxgl.Map | null;
    resources: Resource[];
}

export default function ResourceMarkers({ map, resources }: Props) {
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const [isCrisisMode, setIsCrisisMode] = useState(false);

    useEffect(() => {
        const handler = () => {
            setIsCrisisMode(true);
            setTimeout(() => setIsCrisisMode(false), 5000); // Reset after 5s
        };
        window.addEventListener('crisis_alert', handler as EventListener);
        return () => window.removeEventListener('crisis_alert', handler as EventListener);
    }, []);

    useEffect(() => {
        if (!map) return;

        // Clear existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Add new markers
        resources.forEach((resource) => {
            const el = document.createElement('div');
            el.className = 'group cursor-pointer';

            if (isCrisisMode) {
                el.innerHTML = `
                    <div class="relative flex items-center justify-center">
                        <div class="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60 duration-[800ms]"></div>
                        <div class="z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-200 bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.6)] transition-transform scale-110">
                            <span class="text-xs">🏥</span>
                        </div>
                    </div>
                `;
            } else {
                el.innerHTML = `
                    <div class="relative flex items-center justify-center">
                        <!-- Outer glow -->
                        <div class="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20 duration-[3000ms]"></div>
                        <!-- Marker body -->
                        <div class="z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-lg transition-transform hover:scale-110">
                            <span class="text-xs">🏥</span>
                        </div>
                    </div>
                `;
            }

            const marker = new mapboxgl.Marker(el)
                .setLngLat([resource.lng, resource.lat])
                .setPopup(
                    new mapboxgl.Popup({ offset: 25, className: 'dark-popup' }).setHTML(`
                        <div class="p-1">
                            <h3 class="font-bold text-slate-100">${resource.name}</h3>
                            <p class="text-xs text-slate-300">${resource.address1}</p>
                            ${resource.phone ? `<p class="mt-1 text-xs font-semibold text-blue-400">${resource.phone}</p>` : ''}
                        </div>
                    `)
                )
                .addTo(map);

            markersRef.current.push(marker);
        });

        return () => {
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];
        };
    }, [map, resources, isCrisisMode]);

    return null;
}
