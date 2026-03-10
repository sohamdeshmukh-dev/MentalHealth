"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
  from: string;
  to: string;
  glow: string;
}

interface SegmentGeometry extends NavItem {
  index: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  path: string;
  iconX: number;
  iconY: number;
}

interface Point {
  x: number;
  y: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home Map",
    shortLabel: "Home",
    icon: "🏠",
    from: "#22d3ee",
    to: "#14b8a6",
    glow: "rgba(45,212,191,0.65)",
  },
  {
    href: "/journal",
    label: "Mood Journal",
    shortLabel: "Mood",
    icon: "😊",
    from: "#fca5a5",
    to: "#fb7185",
    glow: "rgba(251,113,133,0.62)",
  },
  {
    href: "/friends",
    label: "Friends Leaderboard",
    shortLabel: "Friends",
    icon: "👥",
    from: "#86efac",
    to: "#4ade80",
    glow: "rgba(74,222,128,0.62)",
  },
  {
    href: "/profile",
    label: "Profile Safety",
    shortLabel: "Profile",
    icon: "👤",
    from: "#93c5fd",
    to: "#60a5fa",
    glow: "rgba(96,165,250,0.62)",
  },
];

const VIEWBOX_SIZE = 320;
const CENTER = VIEWBOX_SIZE / 2;
const OUTER_RADIUS = 144;
const INNER_RADIUS = 86;
const SEGMENT_ANGLE = 360 / NAV_ITEMS.length;
const START_ANGLE = -135;

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

function round(value: number) {
  return Number(value.toFixed(3));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function polarToCartesian(angleDeg: number, radius: number): Point {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: round(CENTER + radius * Math.cos(radians)),
    y: round(CENTER + radius * Math.sin(radians)),
  };
}

function segmentPath(startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(startAngle, OUTER_RADIUS);
  const outerEnd = polarToCartesian(endAngle, OUTER_RADIUS);
  const innerEnd = polarToCartesian(endAngle, INNER_RADIUS);
  const innerStart = polarToCartesian(startAngle, INNER_RADIUS);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function toTranslate(midAngle: number, distance: number) {
  const radians = ((midAngle - 90) * Math.PI) / 180;
  return {
    x: round(Math.cos(radians) * distance),
    y: round(Math.sin(radians) * distance),
  };
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [supportsHover, setSupportsHover] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [parallax, setParallax] = useState(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    isActiveRoute(pathname, item.href)
  );
  const currentIndex = hoveredIndex ?? (activeIndex >= 0 ? activeIndex : 0);

  const segments = useMemo<SegmentGeometry[]>(
    () =>
      NAV_ITEMS.map((item, index) => {
        const startAngle = START_ANGLE + index * SEGMENT_ANGLE;
        const endAngle = startAngle + SEGMENT_ANGLE;
        const midAngle = startAngle + SEGMENT_ANGLE / 2;
        const iconPos = polarToCartesian(midAngle, (OUTER_RADIUS + INNER_RADIUS) / 2);

        return {
          ...item,
          index,
          startAngle,
          endAngle,
          midAngle,
          path: segmentPath(startAngle, endAngle),
          iconX: iconPos.x,
          iconY: iconPos.y,
        };
      }),
    []
  );

  const activeItem = NAV_ITEMS[currentIndex] ?? NAV_ITEMS[0];

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const resetPointerMotion = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setParallax(0);
  }, []);

  const closeWheel = useCallback(() => {
    clearCloseTimer();
    setIsOpen(false);
    setHoveredIndex(null);
    resetPointerMotion();
  }, [clearCloseTimer, resetPointerMotion]);

  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;

    const audioWindow = window as AudioWindow;
    const AudioCtor = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioCtor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtor();
    }

    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    (frequency: number, durationMs: number, volume: number, type: OscillatorType) => {
      const context = ensureAudioContext();
      if (!context) return;

      if (context.state === "suspended") {
        void context.resume();
      }

      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const duration = durationMs / 1000;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(now);
      oscillator.stop(now + duration + 0.01);
    },
    [ensureAudioContext]
  );

  const playOpenSound = useCallback(() => {
    if (reduceMotion) return;
    playTone(520, 90, 0.038, "triangle");
    window.setTimeout(() => {
      playTone(760, 75, 0.026, "sine");
    }, 45);
  }, [playTone, reduceMotion]);

  const playSelectSound = useCallback(() => {
    playTone(860, 80, 0.034, "triangle");
  }, [playTone]);

  const openWheel = useCallback(
    (withSound: boolean) => {
      clearCloseTimer();
      setIsOpen((previous) => {
        if (!previous && withSound) playOpenSound();
        return true;
      });
    },
    [clearCloseTimer, playOpenSound]
  );

  const scheduleDesktopClose = useCallback(() => {
    if (!supportsHover) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeWheel();
    }, 140);
  }, [clearCloseTimer, closeWheel, supportsHover]);

  const handleSegmentSelect = useCallback(
    (href: string) => {
      playSelectSound();
      setHoveredIndex(null);
      router.push(href);
      if (!supportsHover) closeWheel();
    },
    [closeWheel, playSelectSound, router, supportsHover]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setSupportsHover(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearCloseTimer();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [clearCloseTimer]);

  if (pathname === "/login") return null;

  return (
    <nav className="pointer-events-none fixed left-3 top-3 z-[9200] sm:left-5 sm:top-5">
      <AnimatePresence>
        {!supportsHover && isOpen && (
          <motion.button
            type="button"
            aria-label="Close radial navigation"
            className="fixed inset-0 pointer-events-auto bg-transparent"
            onClick={closeWheel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div
        className="relative h-[330px] w-[330px] sm:h-[350px] sm:w-[350px]"
        onMouseEnter={() => {
          if (supportsHover) openWheel(true);
        }}
        onMouseLeave={() => {
          if (supportsHover) scheduleDesktopClose();
        }}
      >
        <motion.button
          type="button"
          aria-label={isOpen ? "Collapse command wheel" : "Expand command wheel"}
          onClick={() => {
            if (isOpen) {
              closeWheel();
              return;
            }
            openWheel(true);
          }}
          className="pointer-events-auto absolute left-2 top-2 z-20 rounded-full border border-cyan-300/30 bg-slate-950/88 p-3.5 shadow-[0_0_30px_rgba(34,211,238,0.5)] backdrop-blur-xl transition-colors hover:border-cyan-200/60 focus:outline-none"
          animate={
            isOpen || reduceMotion
              ? { scale: 1, boxShadow: "0 0 24px rgba(45,212,191,0.45)" }
              : {
                  scale: [1, 1.06, 1],
                  boxShadow: [
                    "0 0 14px rgba(34,211,238,0.35)",
                    "0 0 26px rgba(45,212,191,0.62)",
                    "0 0 14px rgba(34,211,238,0.35)",
                  ],
                }
          }
          transition={
            isOpen || reduceMotion
              ? { duration: 0.2 }
              : { duration: 2.1, repeat: Infinity, ease: "easeInOut" }
          }
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex h-7 w-7 flex-col items-center justify-center gap-1.5">
            <span className="h-[2px] w-5 rounded-full bg-cyan-100/95 shadow-[0_0_8px_rgba(34,211,238,0.65)]" />
            <span className="h-[2px] w-5 rounded-full bg-cyan-100/95 shadow-[0_0_8px_rgba(34,211,238,0.65)]" />
            <span className="h-[2px] w-5 rounded-full bg-cyan-100/95 shadow-[0_0_8px_rgba(34,211,238,0.65)]" />
          </div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="pointer-events-auto absolute left-5 top-5 h-[min(78vw,306px)] w-[min(78vw,306px)] origin-top-left sm:h-[306px] sm:w-[306px]"
              initial={{ opacity: 0, scale: 0.62, rotate: -26 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.62, rotate: -24 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 24,
                mass: 0.9,
              }}
              onMouseEnter={clearCloseTimer}
              onMouseLeave={() => {
                if (supportsHover) scheduleDesktopClose();
              }}
              onPointerMove={(event) => {
                if (!supportsHover || reduceMotion) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const relativeX = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
                const relativeY = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
                const clampedX = clamp(relativeX, -1, 1);
                const clampedY = clamp(relativeY, -1, 1);
                setTilt({
                  x: round(-clampedY * 6),
                  y: round(clampedX * 7),
                });
                setParallax(round(clampedX * 5));
              }}
              onPointerLeave={() => {
                setHoveredIndex(null);
                resetPointerMotion();
              }}
              style={{ perspective: 900 }}
            >
              <motion.div
                className="relative h-full w-full"
                animate={{
                  rotate: reduceMotion ? 0 : parallax,
                  rotateX: reduceMotion ? 0 : tilt.x,
                  rotateY: reduceMotion ? 0 : tilt.y,
                }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="h-full w-full">
                  <defs>
                    <radialGradient id="wheel-shell" cx="50%" cy="50%" r="58%">
                      <stop offset="0%" stopColor="rgba(12,21,40,0.88)" />
                      <stop offset="100%" stopColor="rgba(2,6,23,0.96)" />
                    </radialGradient>
                    {segments.map((segment) => (
                      <linearGradient
                        key={`gradient-${segment.href}`}
                        id={`segment-gradient-${segment.index}`}
                        gradientUnits="userSpaceOnUse"
                        x1={polarToCartesian(segment.startAngle, OUTER_RADIUS).x}
                        y1={polarToCartesian(segment.startAngle, OUTER_RADIUS).y}
                        x2={polarToCartesian(segment.endAngle, OUTER_RADIUS).x}
                        y2={polarToCartesian(segment.endAngle, OUTER_RADIUS).y}
                      >
                        <stop offset="0%" stopColor={segment.from} stopOpacity={0.92} />
                        <stop offset="100%" stopColor={segment.to} stopOpacity={0.75} />
                      </linearGradient>
                    ))}
                  </defs>

                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={OUTER_RADIUS + 8}
                    fill="url(#wheel-shell)"
                    stroke="rgba(148,163,184,0.28)"
                    strokeWidth={1.2}
                  />

                  {segments.map((segment) => {
                    const active = isActiveRoute(pathname, segment.href);
                    const hovered = hoveredIndex === segment.index;
                    const distance = hovered ? 11 : active ? 4 : 0;
                    const translate = toTranslate(segment.midAngle, distance);

                    return (
                      <motion.g
                        key={segment.href}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${segment.label}`}
                        aria-current={active ? "page" : undefined}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHoveredIndex(segment.index)}
                        onFocus={() => setHoveredIndex(segment.index)}
                        onBlur={() => setHoveredIndex(null)}
                        onMouseLeave={() => setHoveredIndex((current) => (current === segment.index ? null : current))}
                        onClick={() => handleSegmentSelect(segment.href)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSegmentSelect(segment.href);
                          }
                        }}
                        animate={{
                          opacity: 1,
                          x: translate.x,
                          y: translate.y,
                          scale: hovered ? 1.045 : active ? 1.018 : 1,
                          filter: hovered
                            ? `drop-shadow(0 0 15px ${segment.glow})`
                            : active
                            ? `drop-shadow(0 0 9px ${segment.glow})`
                            : "drop-shadow(0 0 0 rgba(0,0,0,0))",
                        }}
                        transition={{
                          delay: reduceMotion ? 0 : segment.index * 0.045,
                          duration: reduceMotion ? 0.12 : 0.35,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{
                          cursor: "pointer",
                          transformOrigin: `${CENTER}px ${CENTER}px`,
                          outline: "none",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <path
                          d={segment.path}
                          fill={`url(#segment-gradient-${segment.index})`}
                          stroke={hovered || active ? "rgba(226,232,240,0.55)" : "rgba(2,6,23,0.52)"}
                          strokeWidth={hovered || active ? 2 : 1.3}
                        />
                        <path
                          d={segment.path}
                          fill={hovered ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0)"}
                          stroke="none"
                        />
                        <text
                          x={segment.iconX}
                          y={segment.iconY - 8}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#f8fafc"
                          fontSize="22"
                          style={{ textShadow: "0 1px 3px rgba(2,6,23,0.72)", pointerEvents: "none" }}
                        >
                          {segment.icon}
                        </text>
                        <text
                          x={segment.iconX}
                          y={segment.iconY + 12}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#e2e8f0"
                          fontSize="10"
                          fontWeight={700}
                          style={{ letterSpacing: 0.25, textShadow: "0 1px 2px rgba(2,6,23,0.75)", pointerEvents: "none" }}
                        >
                          {segment.shortLabel}
                        </text>
                      </motion.g>
                    );
                  })}

                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={INNER_RADIUS - 14}
                    fill="rgba(2,6,23,0.92)"
                    stroke="rgba(148,163,184,0.35)"
                    strokeWidth={1.2}
                  />
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={20}
                    fill="rgba(15,23,42,0.9)"
                    stroke="rgba(34,211,238,0.45)"
                    strokeWidth={1.4}
                  />
                </svg>

                <motion.div
                  className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center"
                  key={activeItem.href}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <span className="text-[22px] leading-none drop-shadow-md">{activeItem.icon}</span>
                  <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-200">
                    {activeItem.shortLabel}
                  </span>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
