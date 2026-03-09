"use client";

import { useEffect, useRef } from "react";
import type { Mood } from "@/lib/types";

interface WeatherOverlayProps {
    mood: Mood | null;
}

// We inject keyframes + particle styles into a <style> tag once
const STYLES = `
  @keyframes rain-fall {
    0%   { transform: translateY(-10%) translateX(0);   opacity: 0.9; }
    100% { transform: translateY(110%) translateX(-8px); opacity: 0; }
  }
  @keyframes ash-drift {
    0%   { transform: translateY(-10%) translateX(0)     rotate(0deg);   opacity: 0.85; }
    50%  { transform: translateY(50%)  translateX(20px)  rotate(180deg); opacity: 0.6; }
    100% { transform: translateY(110%) translateX(-10px) rotate(360deg); opacity: 0; }
  }
  @keyframes mote-float {
    0%   { transform: translateY(110%) translateX(0)    scale(1);   opacity: 0; }
    30%  { opacity: 0.9; }
    70%  { opacity: 0.7; }
    100% { transform: translateY(-10%) translateX(12px) scale(1.4); opacity: 0; }
  }

  .weather-rain-particle {
    position: absolute;
    width: 1.5px;
    border-radius: 9999px;
    background: linear-gradient(to bottom, rgba(147,197,253,0.9), rgba(219,234,254,0.4));
    animation: rain-fall linear infinite;
  }
  .weather-ash-particle {
    position: absolute;
    border-radius: 50%;
    animation: ash-drift ease-in-out infinite;
  }
  .weather-mote-particle {
    position: absolute;
    border-radius: 50%;
    animation: mote-float ease-in-out infinite;
  }
`;

function injectStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById("weather-overlay-styles")) return;
    const style = document.createElement("style");
    style.id = "weather-overlay-styles";
    style.textContent = STYLES;
    document.head.appendChild(style);
}

// ── Rain (Sad) ───────────────────────────────────────────────────
function RainParticles() {
    const count = 80;
    return (
        <>
            {Array.from({ length: count }).map((_, i) => {
                const left = `${Math.random() * 100}%`;
                const height = `${Math.random() * 18 + 12}px`;
                const delay = `${Math.random() * 2}s`;
                const duration = `${Math.random() * 0.5 + 0.45}s`;
                const opacity = Math.random() * 0.5 + 0.4;
                return (
                    <div
                        key={i}
                        className="weather-rain-particle"
                        style={{ left, height, animationDelay: delay, animationDuration: duration, opacity }}
                    />
                );
            })}
        </>
    );
}

// ── Ash/Storm (Overwhelmed) ──────────────────────────────────────
function AshParticles() {
    const count = 60;
    return (
        <>
            {Array.from({ length: count }).map((_, i) => {
                const left = `${Math.random() * 100}%`;
                const size = `${Math.random() * 5 + 2}px`;
                const delay = `${Math.random() * 3}s`;
                const duration = `${Math.random() * 1.5 + 1}s`;
                const isRed = Math.random() > 0.6;
                const bg = isRed
                    ? `rgba(${180 + Math.floor(Math.random() * 60)}, 30, 30, 0.8)`
                    : `rgba(120, 120, 130, 0.75)`;
                return (
                    <div
                        key={i}
                        className="weather-ash-particle"
                        style={{ left, width: size, height: size, background: bg, animationDelay: delay, animationDuration: duration }}
                    />
                );
            })}
        </>
    );
}

// ── Sun motes (Happy) ────────────────────────────────────────────
function SunMoteParticles() {
    const count = 30;
    return (
        <>
            {Array.from({ length: count }).map((_, i) => {
                const left = `${Math.random() * 100}%`;
                const size = `${Math.random() * 10 + 4}px`;
                const delay = `${Math.random() * 5}s`;
                const duration = `${Math.random() * 4 + 4}s`;
                const gold = Math.random() > 0.5 ? "rgba(255,215,0,0.7)" : "rgba(255,165,0,0.55)";
                return (
                    <div
                        key={i}
                        className="weather-mote-particle"
                        style={{
                            left,
                            width: size,
                            height: size,
                            background: gold,
                            boxShadow: `0 0 ${parseInt(size) * 3}px ${gold}`,
                            animationDelay: delay,
                            animationDuration: duration,
                        }}
                    />
                );
            })}
        </>
    );
}

// ── Stressed (Hazy vignette, no particles, just overlay tint) ───
function StressedOverlay() {
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                background:
                    "radial-gradient(ellipse at center, transparent 40%, rgba(139,69,19,0.35) 100%)",
                animation: "none",
            }}
        />
    );
}

export default function WeatherOverlay({ mood }: WeatherOverlayProps) {
    const styleInjected = useRef(false);

    useEffect(() => {
        if (!styleInjected.current) {
            injectStyles();
            styleInjected.current = true;
        }
    }, []);

    if (!mood || mood === "Calm" || mood === "Neutral") return null;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                pointerEvents: "none",
                overflow: "hidden",
            }}
        >
            {mood === "Sad" && <RainParticles />}
            {mood === "Overwhelmed" && <AshParticles />}
            {mood === "Happy" && <SunMoteParticles />}
            {mood === "Stressed" && <StressedOverlay />}
        </div>
    );
}
