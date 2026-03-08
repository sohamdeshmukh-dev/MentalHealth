'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Resource } from '@/lib/types';

interface Props {
    map: mapboxgl.Map | null;
    resources: Resource[];
}

export default function ResourceMarkers({ map, resources }: Props) {
    const markersRef = useRef<mapboxgl.Marker[]>([]);

    useEffect(() => {
        if (!map) return;

        // Clear existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Add new markers
        resources.forEach((resource) => {
            const el = document.createElement('div');
            el.className = 'group cursor-pointer';
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
    }, [map, resources]);

    return null;
}
