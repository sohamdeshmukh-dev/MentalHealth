'use client';
import { useEffect, useState } from 'react';

interface Props {
    lat: number | null;
    lng: number | null;
}

function getCityLabel(tz: string): string {
    const parts = tz.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
}

export default function LocalClock({ lat, lng }: Props) {
    const [time, setTime] = useState('');
    const [date, setDate] = useState('');
    const [city, setCity] = useState('');

    useEffect(() => {
        if (lat === null || lng === null) return;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setCity(getCityLabel(tz));

        const tick = () => {
            const now = new Date();
            setTime(new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            }).format(now));
            setDate(new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            }).format(now));
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [lat, lng]);

    if (!lat || !lng || !time) return null;

    return (
        <div className="flex flex-col gap-1 px-4 py-3 rounded-2xl bg-black/60
                    backdrop-blur-md border border-white/10 text-white shadow-xl">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                📍 Your Location
            </span>
            <span className="text-base font-semibold text-white/80">{city}</span>
            <span className="text-4xl font-bold tabular-nums tracking-tight leading-none">
                {time}
            </span>
            <span className="text-xs text-white/50 mt-0.5">{date}</span>
        </div>
    );
}
