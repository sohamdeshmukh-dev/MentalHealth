"use client";

import { useMemo, useState } from "react";
import { Mood, MOODS } from "@/lib/types";

interface EmotionWheelSelectorProps {
  value: Mood | null;
  onChange: (mood: Mood) => void;
}

const WHEEL_ORDER: Mood[] = [
  "Calm",
  "Happy",
  "Neutral",
  "Sad",
  "Overwhelmed",
  "Stressed",
];

const SEGMENT_ANGLE = 360 / WHEEL_ORDER.length;
const VIEWBOX_SIZE = 320;
const CENTER = VIEWBOX_SIZE / 2;
const OUTER_RADIUS = 150;
const INNER_RADIUS = 70;

function roundSvg(value: number) {
  return Number(value.toFixed(6));
}

function polarToCartesian(angleDeg: number, radius: number) {
  const radians = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: roundSvg(CENTER + radius * Math.cos(radians)),
    y: roundSvg(CENTER + radius * Math.sin(radians)),
  };
}

function segmentPath(startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(startAngle, OUTER_RADIUS);
  const outerEnd = polarToCartesian(endAngle, OUTER_RADIUS);
  const innerEnd = polarToCartesian(endAngle, INNER_RADIUS);
  const innerStart = polarToCartesian(startAngle, INNER_RADIUS);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${roundSvg(OUTER_RADIUS)} ${roundSvg(OUTER_RADIUS)} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${roundSvg(INNER_RADIUS)} ${roundSvg(INNER_RADIUS)} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function hexToRgba(hex: string, alpha: number) {
  const sanitized = hex.replace("#", "");
  if (sanitized.length !== 6) return `rgba(99,102,241,${alpha})`;
  const r = Number.parseInt(sanitized.slice(0, 2), 16);
  const g = Number.parseInt(sanitized.slice(2, 4), 16);
  const b = Number.parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getNearestRotation(baseRotation: number, currentRotation: number) {
  let best = baseRotation;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let turns = -3; turns <= 3; turns += 1) {
    const candidate = baseRotation + turns * 360;
    const delta = Math.abs(candidate - currentRotation);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best;
}

export default function EmotionWheelSelector({
  value,
  onChange,
}: EmotionWheelSelectorProps) {
  const moods = useMemo(
    () =>
      WHEEL_ORDER.flatMap((label) => {
        const mood = MOODS.find((m) => m.label === label);
        return mood ? [mood] : [];
      }),
    []
  );

  const initialIndex = value ? moods.findIndex((m) => m.label === value) : 0;
  const [rotation, setRotation] = useState(
    initialIndex >= 0 ? -initialIndex * SEGMENT_ANGLE : 0
  );
  const [hoveredMood, setHoveredMood] = useState<Mood | null>(null);

  const segments = useMemo(
    () =>
      moods.map((mood, index) => {
        const startAngle = index * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
        const endAngle = startAngle + SEGMENT_ANGLE;
        const labelPos = polarToCartesian(
          startAngle + SEGMENT_ANGLE / 2,
          (OUTER_RADIUS + INNER_RADIUS) / 2
        );

        return {
          mood,
          index,
          labelPos,
          path: segmentPath(startAngle, endAngle),
        };
      }),
    [moods]
  );

  function selectMood(mood: Mood, index: number) {
    onChange(mood);
    const targetRotation = -index * SEGMENT_ANGLE;
    setRotation((current) => getNearestRotation(targetRotation, current));
  }

  const selectedMoodConfig = moods.find((m) => m.label === value);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-[320px]">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,_rgba(30,41,59,0.85)_0%,_rgba(15,23,42,0.95)_58%,_rgba(2,6,23,1)_100%)] ring-1 ring-slate-700/70" />

        <svg
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          className="relative h-full w-full overflow-visible"
          aria-label="Emotion wheel selector"
        >
          <g
            style={{
              transformOrigin: `${CENTER}px ${CENTER}px`,
              transform: `rotate(${rotation}deg)`,
              transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {segments.map(({ mood, index, labelPos, path }) => {
              const isHovered = hoveredMood === mood.label;
              const isSelected = value === mood.label;
              const scale = isHovered ? 1.06 : isSelected ? 1.04 : 1;
              const brightness = isHovered ? 1.14 : isSelected ? 1.1 : 1;
              const glow = isHovered
                ? `drop-shadow(0 0 14px ${hexToRgba(mood.color, 0.75)})`
                : isSelected
                  ? `drop-shadow(0 0 9px ${hexToRgba(mood.color, 0.55)})`
                  : "none";
              const filter =
                glow === "none"
                  ? `brightness(${brightness})`
                  : `brightness(${brightness}) ${glow}`;

              return (
                <g
                  key={mood.label}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${mood.label}`}
                  onClick={() => selectMood(mood.label, index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHoveredMood(mood.label)}
                  onMouseLeave={() =>
                    setHoveredMood((current) =>
                      current === mood.label ? null : current
                    )
                  }
                  onFocus={() => setHoveredMood(mood.label)}
                  onBlur={() => setHoveredMood(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectMood(mood.label, index);
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    transform: `scale(${scale})`,
                    transition: "transform 180ms ease, filter 180ms ease",
                    filter,
                    outline: "none",
                  }}
                >
                  <path
                    d={path}
                    fill={mood.color}
                    stroke="rgba(2,6,23,0.6)"
                    strokeWidth={1.5}
                  />

                  <g
                    style={{
                      transformOrigin: `${labelPos.x}px ${labelPos.y}px`,
                      transform: `rotate(${-rotation}deg)`,
                      transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                      pointerEvents: "none",
                    }}
                  >
                    <text
                      x={labelPos.x}
                      y={labelPos.y - 8}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize="15"
                      fontWeight={700}
                      style={{
                        textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                      }}
                    >
                      {mood.icon}
                    </text>
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 11}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight={700}
                      style={{
                        letterSpacing: "0.2px",
                        textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                      }}
                    >
                      {mood.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/95 text-center shadow-[0_0_26px_rgba(2,6,23,0.75)]">
            <span className="text-2xl">{selectedMoodConfig?.icon ?? "🫶"}</span>
            <span className="mt-1 text-xs font-semibold text-slate-100">
              {selectedMoodConfig?.label ?? "Pick Mood"}
            </span>
            <span className="text-[10px] text-slate-400">
              {selectedMoodConfig ? "Ready to check in" : "Tap a segment"}
            </span>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-slate-400">
        Click a segment to spin and select your emotion.
      </p>
    </div>
  );
}
