'use client';
import { useEffect, useState } from 'react';

const cityTimezones: Record<string, string> = {
    'New York City': 'America/New_York',
    'Los Angeles': 'America/Los_Angeles',
    'Chicago': 'America/Chicago',
    'Houston': 'America/Chicago',
    'Phoenix': 'America/Phoenix',
    'Philadelphia': 'America/New_York',
    'San Antonio': 'America/Chicago',
    'San Diego': 'America/Los_Angeles',
    'Dallas': 'America/Chicago',
    'San Jose': 'America/Los_Angeles',
    'Austin': 'America/Chicago'
};

interface Props {
    selectedCity: string;
}

export default function LocalClock({ selectedCity }: Props) {
    const [time, setTime] = useState('');
    const [date, setDate] = useState('');
    const [city, setCity] = useState('');

    useEffect(() => {
        if (!selectedCity) return;
        const tz = cityTimezones[selectedCity] || Intl.DateTimeFormat().resolvedOptions().timeZone;

        const tick = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { timeZone: tz, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateString = now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });
            setTime(timeString);
            setDate(dateString);
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [selectedCity]);

    if (!selectedCity || !time) return null;

    return (
        <div className="flex flex-col gap-1 px-4 py-3 rounded-2xl bg-black/60
                    backdrop-blur-md border border-white/10 text-white shadow-xl">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                📍 Your Location
            </span>
            <span className="text-base font-semibold text-white/80">{selectedCity}</span>
            <span className="text-4xl font-bold tabular-nums tracking-tight leading-none">
                {time}
            </span>
            <span className="text-xs text-white/50 mt-0.5">{date}</span>
        </div>
    );
}
