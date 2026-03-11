"use client";

import { useEffect, useState } from "react";

interface InkTextProps {
    text: string;
    speed?: number;
    onComplete?: () => void;
    className?: string;
}

/**
 * Typewriter-style "ink" text animation.
 * Characters appear one-by-one as if being written with a fountain pen.
 */
export default function InkText({
    text,
    speed = 28,
    onComplete,
    className = "",
}: InkTextProps) {
    const [displayed, setDisplayed] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        setDisplayed("");
        setDone(false);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) {
                clearInterval(interval);
                setDone(true);
                onComplete?.();
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, onComplete]);

    return (
        <span className={`ink-text ${className}`}>
            {displayed}
            {!done && <span className="ink-cursor">|</span>}
        </span>
    );
}
