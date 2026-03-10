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
    'Austin': 'America/Chicago',
    'Jacksonville': 'America/New_York',
    'Charlottesville': 'America/New_York'
};

interface Props {
    selectedCity: string;
    selectedState?: string;
}

export default function LocalClock({ selectedCity, selectedState }: Props) {
    const [time, setTime] = useState('');
    const [date, setDate] = useState('');

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
        <div
            className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white shadow-xl backdrop-blur-md"
        >
            <span className="text-[11px] font-semibold tracking-wide text-white/55">
                {date}
            </span>
            <span className="text-sm font-semibold text-white/80">
                📍 {selectedCity}{selectedState ? `, ${selectedState}` : ""}
            </span>
            <span className="text-4xl font-bold tabular-nums tracking-tight leading-none">
                {time}
            </span>
        </div>
    );
}
