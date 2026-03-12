"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Layers } from "lucide-react";
import { CheckIn } from "@/lib/types";
import {
  EmotionCluster,
  buildEmotionClusters,
  weatherTitle,
} from "@/lib/emotionWeather";

interface EmotionWeatherOverlayProps {
  map: mapboxgl.Map | null;
  checkins: CheckIn[];
  minZoom?: number;
}

interface AnimatedCluster {
  cluster: EmotionCluster;
  x: number;
  y: number;
  radiusPx: number;
  alpha: number;
  targetAlpha: number;
}

interface ScreenCluster {
  cluster: EmotionCluster;
  x: number;
  y: number;
  radiusPx: number;
  alpha: number;
}

/* ── Raindrop & Particle pools ─────────────────────────────────── */
interface Raindrop {
  xOff: number;   // -0.5..0.5 relative to cluster center
  phase: number;  // 0..1 animation phase
  speed: number;  // multiplier
  size: number;   // length multiplier
  opacity: number;
}

interface Particle {
  angle: number;
  dist: number;    // 0..1 from center
  phase: number;
  size: number;
  speed: number;
  drift: number;
}

const MAX_RENDERED = 24;
const RAIN_PER_CLUSTER = 42;
const SPARKLE_PER_CLUSTER = 18;
const CALM_PARTICLE_COUNT = 14;

/* ── Deterministic hash ────────────────────────────────────────── */
function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result +=
      (result << 1) +
      (result << 4) +
      (result << 7) +
      (result << 8) +
      (result << 24);
  }
  return (result >>> 0) / 4294967295;
}

function seededRandom(seed: number, index: number) {
  const x = Math.sin(seed * 9301 + index * 49297 + 233280.5) * 49297;
  return x - Math.floor(x);
}

function metersPerPixel(lat: number, zoom: number) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/* ── Pre-generate particle pools per cluster ───────────────────── */
const rainPools = new Map<string, Raindrop[]>();
const sparklePools = new Map<string, Particle[]>();
const calmPools = new Map<string, Particle[]>();

function getRainPool(id: string, intensity: number): Raindrop[] {
  if (rainPools.has(id)) return rainPools.get(id)!;
  const seed = hash(id) * 10000;
  const count = Math.round(RAIN_PER_CLUSTER * Math.max(0.4, intensity));
  const pool: Raindrop[] = [];
  for (let i = 0; i < count; i++) {
    pool.push({
      xOff: seededRandom(seed, i) - 0.5,
      phase: seededRandom(seed, i + 100),
      speed: 0.6 + seededRandom(seed, i + 200) * 0.8,
      size: 0.7 + seededRandom(seed, i + 300) * 0.6,
      opacity: 0.25 + seededRandom(seed, i + 400) * 0.35,
    });
  }
  rainPools.set(id, pool);
  return pool;
}

function getSparklePool(id: string, intensity: number): Particle[] {
  if (sparklePools.has(id)) return sparklePools.get(id)!;
  const seed = hash(id) * 10000;
  const count = Math.round(SPARKLE_PER_CLUSTER * Math.max(0.5, intensity));
  const pool: Particle[] = [];
  for (let i = 0; i < count; i++) {
    pool.push({
      angle: seededRandom(seed, i) * Math.PI * 2,
      dist: 0.3 + seededRandom(seed, i + 100) * 0.6,
      phase: seededRandom(seed, i + 200),
      size: 1.5 + seededRandom(seed, i + 300) * 2.5,
      speed: 0.3 + seededRandom(seed, i + 400) * 0.7,
      drift: (seededRandom(seed, i + 500) - 0.5) * 2,
    });
  }
  sparklePools.set(id, pool);
  return pool;
}

function getCalmPool(id: string): Particle[] {
  if (calmPools.has(id)) return calmPools.get(id)!;
  const seed = hash(id) * 10000;
  const pool: Particle[] = [];
  for (let i = 0; i < CALM_PARTICLE_COUNT; i++) {
    pool.push({
      angle: seededRandom(seed, i) * Math.PI * 2,
      dist: 0.35 + seededRandom(seed, i + 100) * 0.55,
      phase: seededRandom(seed, i + 200),
      size: 1.2 + seededRandom(seed, i + 300) * 1.8,
      speed: 0.15 + seededRandom(seed, i + 400) * 0.25,
      drift: (seededRandom(seed, i + 500) - 0.5) * 1.5,
    });
  }
  calmPools.set(id, pool);
  return pool;
}

/* ── Soft rounded cloud (cartoony, multi-layered) ──────────────── */
function drawSoftCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: string,
  shadowColor: string,
  alpha: number,
  time: number,
  seed: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Subtle drift
  const drift = Math.sin(time * 0.2 + seed * 5) * w * 0.02;
  const x = cx + drift;

  // Shadow layer (slightly offset down)
  const shadowGrad = ctx.createRadialGradient(x, cy + h * 0.15, w * 0.1, x, cy + h * 0.15, w * 0.7);
  shadowGrad.addColorStop(0, shadowColor);
  shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(x, cy + h * 0.15, w * 0.65, h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main cloud body — overlapping ellipses for puffy look
  ctx.fillStyle = color;

  // Bottom-left puff
  ctx.beginPath();
  ctx.ellipse(x - w * 0.3, cy + h * 0.05, w * 0.32, h * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bottom-right puff
  ctx.beginPath();
  ctx.ellipse(x + w * 0.28, cy + h * 0.07, w * 0.3, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Center-top puff (tallest)
  ctx.beginPath();
  ctx.ellipse(x, cy - h * 0.12, w * 0.38, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Small top-right accent puff
  ctx.beginPath();
  ctx.ellipse(x + w * 0.15, cy - h * 0.08, w * 0.22, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight on top
  const highlightGrad = ctx.createRadialGradient(x - w * 0.08, cy - h * 0.2, 0, x, cy, w * 0.35);
  highlightGrad.addColorStop(0, `rgba(255,255,255,${0.12 * alpha})`);
  highlightGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = highlightGrad;
  ctx.beginPath();
  ctx.ellipse(x, cy - h * 0.08, w * 0.3, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ── Draw 4-pointed sparkle star ───────────────────────────────── */
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  color: string
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  // Glow behind sparkle
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 3;

  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.15, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.15, y + size * 0.15, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.15, y + size * 0.15, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.15, y - size * 0.15, x, y - size);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════════
   ANXIETY STORM
   ══════════════════════════════════════════════════════════════════ */
function drawAnxietyEvent(
  ctx: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  const seed = hash(cluster.id);
  const pulse = 0.6 + Math.sin(time * 1.2 + seed * 8) * 0.08;

  // Background atmospheric haze
  const haze = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius * 1.4);
  haze.addColorStop(0, `rgba(30,27,45,${0.3 * pulse * alpha})`);
  haze.addColorStop(0.5, `rgba(20,15,35,${0.15 * alpha})`);
  haze.addColorStop(1, "rgba(15,10,25,0)");
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Dark storm clouds — multiple layers for depth
  drawSoftCloud(
    ctx, x - radius * 0.15, y - radius * 0.05,
    radius * 0.9, radius * 0.5,
    "rgba(25,25,40,0.92)", "rgba(10,10,20,0.4)",
    alpha * 0.9, time, seed
  );
  drawSoftCloud(
    ctx, x + radius * 0.2, y + radius * 0.02,
    radius * 0.75, radius * 0.4,
    "rgba(35,30,50,0.88)", "rgba(15,12,25,0.35)",
    alpha * 0.8, time, seed + 1
  );
  // Front accent cloud
  drawSoftCloud(
    ctx, x - radius * 0.05, y + radius * 0.08,
    radius * 0.55, radius * 0.3,
    "rgba(45,40,60,0.75)", "rgba(20,18,30,0.3)",
    alpha * 0.65, time, seed + 2
  );

  // Wind streaks
  const windCount = 5 + Math.round(cluster.intensity * 7);
  ctx.save();
  ctx.lineWidth = 1;
  for (let i = 0; i < windCount; i++) {
    const phase = time * 0.6 + i * 0.8 + seed * 10;
    const yOff = Math.sin(phase) * radius * 0.14;
    const xStart = x - radius * 1.2 + ((phase * 38) % (radius * 2.4));
    const len = radius * (0.2 + seededRandom(seed * 100, i) * 0.2);
    const windAlpha = 0.08 + seededRandom(seed * 100, i + 50) * 0.1;

    ctx.strokeStyle = `rgba(160,170,200,${windAlpha * alpha})`;
    ctx.beginPath();
    ctx.moveTo(xStart, y + yOff + radius * 0.25);
    ctx.bezierCurveTo(
      xStart + len * 0.3, y + yOff + radius * 0.23,
      xStart + len * 0.7, y + yOff + radius * 0.27,
      xStart + len, y + yOff + radius * 0.24
    );
    ctx.stroke();
  }
  ctx.restore();

  // Lightning bolt with glow
  const lightningCycle = (time + seed * 4.2) % 6.0;
  if (lightningCycle > 5.55) {
    const flash = Math.min(1, (lightningCycle - 5.55) / 0.15);

    // Screen flash
    const flashGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.3);
    flashGrad.addColorStop(0, `rgba(200,180,255,${0.12 * flash * alpha})`);
    flashGrad.addColorStop(1, "rgba(200,180,255,0)");
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Bolt
    ctx.save();
    ctx.strokeStyle = `rgba(255,240,180,${0.95 * alpha * flash})`;
    ctx.shadowColor = "rgba(255,230,150,0.9)";
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const bx = x + radius * 0.08;
    const by = y + radius * 0.05;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - radius * 0.08, by + radius * 0.28);
    ctx.lineTo(bx + radius * 0.06, by + radius * 0.26);
    ctx.lineTo(bx - radius * 0.04, by + radius * 0.55);
    ctx.stroke();

    // Branch
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - radius * 0.08, by + radius * 0.28);
    ctx.lineTo(bx - radius * 0.2, by + radius * 0.42);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Secondary lightning (offset timing)
  const lightning2 = (time + seed * 7.1 + 2.8) % 8.0;
  if (lightning2 > 7.7 && cluster.intensity > 0.6) {
    const flash2 = Math.min(1, (lightning2 - 7.7) / 0.12);
    ctx.save();
    ctx.strokeStyle = `rgba(220,210,255,${0.7 * alpha * flash2})`;
    ctx.shadowColor = "rgba(200,190,255,0.7)";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";

    const bx2 = x - radius * 0.2;
    const by2 = y + radius * 0.1;
    ctx.beginPath();
    ctx.moveTo(bx2, by2);
    ctx.lineTo(bx2 + radius * 0.05, by2 + radius * 0.2);
    ctx.lineTo(bx2 - radius * 0.03, by2 + radius * 0.38);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════
   SADNESS RAIN
   ══════════════════════════════════════════════════════════════════ */
function drawSadnessEvent(
  ctx: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  const seed = hash(cluster.id);

  // Melancholy atmospheric glow
  const atmo = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 1.35);
  atmo.addColorStop(0, `rgba(80,100,130,${0.2 * alpha})`);
  atmo.addColorStop(0.6, `rgba(50,65,90,${0.1 * alpha})`);
  atmo.addColorStop(1, "rgba(30,40,60,0)");
  ctx.fillStyle = atmo;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.35, 0, Math.PI * 2);
  ctx.fill();

  // Soft grey clouds
  drawSoftCloud(
    ctx, x, y - radius * 0.08,
    radius * 0.85, radius * 0.42,
    "rgba(100,116,140,0.9)", "rgba(60,70,90,0.35)",
    alpha * 0.9, time, seed
  );
  drawSoftCloud(
    ctx, x + radius * 0.22, y + radius * 0.04,
    radius * 0.6, radius * 0.32,
    "rgba(120,130,155,0.75)", "rgba(70,80,100,0.25)",
    alpha * 0.7, time, seed + 1
  );

  // Rain drops from pool
  const drops = getRainPool(cluster.id, cluster.intensity);
  ctx.save();
  ctx.lineCap = "round";

  for (const drop of drops) {
    const t = ((time * drop.speed * 0.9 + drop.phase) % 1);
    const dropX = x + drop.xOff * radius * 1.2;
    const dropY = y + radius * 0.18 + t * radius * 1.1;

    // Skip if above cloud or too far below
    if (dropY < y - radius * 0.1 || dropY > y + radius * 1.3) continue;

    // Fade in/out at top and bottom
    const fadeIn = Math.min(1, (dropY - (y + radius * 0.15)) / (radius * 0.15));
    const fadeOut = Math.max(0, 1 - (dropY - (y + radius * 0.9)) / (radius * 0.4));
    const dropAlpha = drop.opacity * alpha * fadeIn * fadeOut;

    if (dropAlpha < 0.02) continue;

    const len = radius * 0.12 * drop.size;
    ctx.strokeStyle = `rgba(170,195,230,${dropAlpha})`;
    ctx.lineWidth = 1.2 * drop.size;
    ctx.beginPath();
    ctx.moveTo(dropX, dropY);
    ctx.lineTo(dropX - radius * 0.01, dropY + len);
    ctx.stroke();

    // Tiny splash at bottom
    if (t > 0.85) {
      const splashAlpha = dropAlpha * ((t - 0.85) / 0.15);
      const splashR = radius * 0.025 * drop.size;
      ctx.fillStyle = `rgba(170,195,230,${splashAlpha * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(dropX, y + radius * 1.25, splashR * 2, splashR * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════════
   CALM SUNSHINE
   ══════════════════════════════════════════════════════════════════ */
function drawCalmEvent(
  ctx: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  const seed = hash(cluster.id);
  const breathe = 0.92 + Math.sin(time * 0.6 + seed * 5.8) * 0.08;

  // Warm ambient glow — multi-layer
  const outerGlow = ctx.createRadialGradient(x, y, radius * 0.05, x, y, radius * 1.4);
  outerGlow.addColorStop(0, `rgba(255,248,220,${0.2 * alpha * breathe})`);
  outerGlow.addColorStop(0.3, `rgba(255,235,180,${0.12 * alpha * breathe})`);
  outerGlow.addColorStop(0.7, `rgba(45,212,191,${0.06 * alpha})`);
  outerGlow.addColorStop(1, "rgba(45,212,191,0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Inner warm glow
  const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.55);
  innerGlow.addColorStop(0, `rgba(255,245,200,${0.4 * alpha * breathe})`);
  innerGlow.addColorStop(0.5, `rgba(255,225,150,${0.2 * alpha})`);
  innerGlow.addColorStop(1, "rgba(255,220,130,0)");
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Rotating sun rays
  ctx.save();
  const rayCount = 10;
  for (let i = 0; i < rayCount; i++) {
    const angle = (Math.PI * 2 * i) / rayCount + time * 0.04;
    const inner = radius * 0.22;
    const outer = radius * (0.45 + Math.sin(time * 0.5 + i * 1.3) * 0.08);
    const rayAlpha = 0.18 + Math.sin(time * 0.7 + i * 0.9) * 0.06;

    const grad = ctx.createLinearGradient(
      x + Math.cos(angle) * inner, y + Math.sin(angle) * inner,
      x + Math.cos(angle) * outer, y + Math.sin(angle) * outer
    );
    grad.addColorStop(0, `rgba(253,224,71,${rayAlpha * alpha})`);
    grad.addColorStop(1, "rgba(253,224,71,0)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = radius * 0.04;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();

  // Sun core with highlight
  const coreGrad = ctx.createRadialGradient(
    x - radius * 0.04, y - radius * 0.04, 0,
    x, y, radius * 0.2
  );
  coreGrad.addColorStop(0, `rgba(255,250,230,${0.9 * alpha})`);
  coreGrad.addColorStop(0.5, `rgba(251,191,36,${0.85 * alpha})`);
  coreGrad.addColorStop(1, `rgba(245,158,11,${0.6 * alpha})`);
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Floating particles
  const particles = getCalmPool(cluster.id);
  for (const p of particles) {
    const angle = p.angle + time * p.speed * 0.3;
    const dist = p.dist * radius;
    const floatY = Math.sin(time * p.speed + p.phase * 10) * radius * 0.04;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist + floatY;

    const pAlpha = (0.3 + Math.sin(time * 0.8 + p.phase * 6) * 0.15) * alpha;

    ctx.fillStyle = `rgba(209,250,229,${pAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ══════════════════════════════════════════════════════════════════
   HAPPINESS GLOW
   ══════════════════════════════════════════════════════════════════ */
function drawHappinessEvent(
  ctx: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  const seed = hash(cluster.id);
  const pulse = 0.9 + Math.sin(time * 0.9 + seed * 9.2) * 0.1;

  // Multi-layer warm golden glow
  const outerGlow = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 1.5);
  outerGlow.addColorStop(0, `rgba(255,200,50,${0.22 * alpha * pulse})`);
  outerGlow.addColorStop(0.35, `rgba(255,170,30,${0.12 * alpha * pulse})`);
  outerGlow.addColorStop(0.7, `rgba(249,115,22,${0.05 * alpha})`);
  outerGlow.addColorStop(1, "rgba(249,115,22,0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Inner warm core
  const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.45);
  innerGlow.addColorStop(0, `rgba(255,250,240,${0.5 * alpha * pulse})`);
  innerGlow.addColorStop(0.4, `rgba(255,230,180,${0.3 * alpha})`);
  innerGlow.addColorStop(1, "rgba(255,200,100,0)");
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Center orb
  const orbGrad = ctx.createRadialGradient(
    x - radius * 0.03, y - radius * 0.03, 0,
    x, y, radius * 0.18
  );
  orbGrad.addColorStop(0, `rgba(255,255,245,${0.85 * alpha})`);
  orbGrad.addColorStop(0.6, `rgba(255,237,213,${0.7 * alpha})`);
  orbGrad.addColorStop(1, `rgba(251,191,36,${0.4 * alpha})`);
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Sparkle stars orbiting
  const sparkles = getSparklePool(cluster.id, cluster.intensity);
  for (const sp of sparkles) {
    const angle = sp.angle + time * sp.speed * 0.5;
    const dist = sp.dist * radius;
    const floatY = Math.sin(time * sp.speed * 2 + sp.phase * 12) * radius * 0.05;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist + floatY + sp.drift * Math.sin(time * 0.3);

    const twinkle = 0.4 + Math.sin(time * 2.5 + sp.phase * 15) * 0.35;
    const spAlpha = twinkle * alpha;

    if (spAlpha < 0.05) continue;

    drawSparkle(ctx, px, py, sp.size, spAlpha, "rgba(253,224,71,1)");
  }

  // Tiny floating golden dots
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + time * 0.15 + seed * 3;
    const dist = radius * (0.6 + Math.sin(time * 0.4 + i * 1.1) * 0.12);
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist + Math.sin(time * 0.8 + i) * 3;
    const dotAlpha = (0.25 + Math.sin(time + i * 2) * 0.15) * alpha;

    ctx.fillStyle = `rgba(255,237,180,${dotAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ── Event dispatcher ──────────────────────────────────────────── */
function drawEvent(
  ctx: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  switch (cluster.emotion) {
    case "anxiety":
      drawAnxietyEvent(ctx, cluster, x, y, radius, alpha, time);
      break;
    case "sadness":
      drawSadnessEvent(ctx, cluster, x, y, radius, alpha, time);
      break;
    case "happiness":
      drawHappinessEvent(ctx, cluster, x, y, radius, alpha, time);
      break;
    default:
      drawCalmEvent(ctx, cluster, x, y, radius, alpha, time);
      break;
  }
}

/* ── Hit-test for hover/click ──────────────────────────────────── */
function findHoveredCluster(screenClusters: ScreenCluster[], point: mapboxgl.Point) {
  for (let i = screenClusters.length - 1; i >= 0; i -= 1) {
    const current = screenClusters[i];
    if (current.alpha < 0.25) continue;
    const dx = point.x - current.x;
    const dy = point.y - current.y;
    if (Math.hypot(dx, dy) <= current.radiusPx * 0.82) {
      return current;
    }
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */
export default function EmotionWeatherOverlay({
  map,
  checkins,
  minZoom = 11.2,
}: EmotionWeatherOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isARMode, setIsARMode] = useState(false);
  const [arHUD, setArHUD] = useState<{ visible: boolean, x: number, y: number, address: string, vibe: string } | null>(null);
  const clustersRef = useRef<EmotionCluster[]>([]);
  const screenClustersRef = useRef<ScreenCluster[]>([]);
  const animationRef = useRef<number | null>(null);
  const statesRef = useRef<Map<string, AnimatedCluster>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const hoveredRef = useRef<ScreenCluster | null>(null);

  const clusters = useMemo(() => buildEmotionClusters(checkins), [checkins]);

  useEffect(() => {
    clustersRef.current = clusters;
    // Clear stale particle pools when clusters change
    const activeIds = new Set(clusters.map((c) => c.id));
    for (const key of rainPools.keys()) {
      if (!activeIds.has(key)) rainPools.delete(key);
    }
    for (const key of sparklePools.keys()) {
      if (!activeIds.has(key)) sparklePools.delete(key);
    }
    for (const key of calmPools.keys()) {
      if (!activeIds.has(key)) calmPools.delete(key);
    }
  }, [clusters]);

  /* ── Render loop ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!map || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const syncCanvasSize = () => {
      const container = map.getContainer();
      const w = container.clientWidth;
      const h = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      syncCanvasSize();

      const w = map.getContainer().clientWidth;
      const h = map.getContainer().clientHeight;
      const zoom = map.getZoom();
      const now = performance.now() / 1000;
      const bounds = map.getBounds();

      ctx.clearRect(0, 0, w, h);
      screenClustersRef.current = [];

      const states = statesRef.current;

      // Mark all as fading out
      for (const state of states.values()) {
        state.targetAlpha = 0;
      }

      if (zoom >= minZoom && bounds) {
        const visible = clustersRef.current
          .filter((c) => bounds.contains(c.coordinates))
          .slice(0, MAX_RENDERED);

        for (const cluster of visible) {
          const projected = map.project(cluster.coordinates);

          if (
            projected.x < -180 || projected.y < -180 ||
            projected.x > w + 180 || projected.y > h + 180
          ) continue;

          const mpp = metersPerPixel(cluster.coordinates[1], zoom);
          const baseRadius = cluster.radiusMeters / Math.max(1, mpp);
          const radiusPx = Math.max(32, Math.min(150, baseRadius));

          const seed = hash(cluster.id);
          const driftX = Math.sin(now * 0.3 + seed * 9.5) * radiusPx * 0.04;
          const driftY = Math.cos(now * 0.22 + seed * 11.2) * radiusPx * 0.025;

          const current = states.get(cluster.id) ?? {
            cluster,
            x: projected.x,
            y: projected.y,
            radiusPx,
            alpha: 0,
            targetAlpha: 1,
          };

          current.cluster = cluster;
          current.x = projected.x + driftX;
          current.y = projected.y + driftY;
          current.radiusPx = radiusPx;
          current.targetAlpha = 1;
          states.set(cluster.id, current);
        }
      }

      // Animate alpha & draw
      const hoveredId = hoveredRef.current?.cluster.id ?? null;

      // When hovering, draw non-hovered first (dimmed), then hovered on top
      const sortedEntries = Array.from(states.entries());
      if (hoveredId) {
        sortedEntries.sort((a, b) => {
          if (a[0] === hoveredId) return 1;  // hovered drawn last (on top)
          if (b[0] === hoveredId) return -1;
          return 0;
        });
      }

      for (const [id, state] of sortedEntries) {
        state.alpha += (state.targetAlpha - state.alpha) * 0.07;

        if (state.alpha < 0.01 && state.targetAlpha < 0.02) {
          states.delete(id);
          continue;
        }

        // Dim non-hovered clusters when something is hovered
        let drawAlpha = state.alpha;
        let drawRadius = state.radiusPx;
        if (hoveredId) {
          if (id === hoveredId) {
            // Boost hovered: slightly larger + full alpha
            drawAlpha = Math.min(1, state.alpha * 1.15);
            drawRadius = state.radiusPx * 1.12;
          } else {
            // Dim others significantly
            drawAlpha = state.alpha * 0.18;
          }
        }

        drawEvent(ctx, state.cluster, state.x, state.y, drawRadius, drawAlpha, now);

        screenClustersRef.current.push({
          cluster: state.cluster,
          x: state.x,
          y: state.y,
          radiusPx: state.radiusPx,
          alpha: state.alpha,
        });
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    const handleResize = () => syncCanvasSize();
    map.on("resize", handleResize);

    return () => {
      map.off("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      popupRef.current?.remove();
      popupRef.current = null;
      statesRef.current.clear();
      screenClustersRef.current = [];
      
      const canvas = map?.getCanvas ? map.getCanvas() : null;
      if (canvas) {
        canvas.style.cursor = "";
      }
    };
  }, [map, minZoom]);

  /* ── Hover + Click interaction ───────────────────────────────── */
  useEffect(() => {
    if (!map) return;

    const handleMove = (event: mapboxgl.MapMouseEvent) => {
      const hovered = findHoveredCluster(screenClustersRef.current, event.point);
      hoveredRef.current = hovered;
      map.getCanvas().style.cursor = hovered ? "pointer" : "";

      // Show hover tooltip
      if (hovered) {
        const peakLabel = `${String(hovered.cluster.peakHour).padStart(2, "0")}:00`;
        const trendColor =
          hovered.cluster.trend === "Rising" ? "#f87171" :
          hovered.cluster.trend === "Cooling" ? "#34d399" : "#94a3b8";
        const trendIcon =
          hovered.cluster.trend === "Rising" ? "&#8599;" :
          hovered.cluster.trend === "Cooling" ? "&#8600;" : "&#8594;";

        const emotionIcon =
          hovered.cluster.emotion === "anxiety" ? "⛈" :
          hovered.cluster.emotion === "sadness" ? "🌧" :
          hovered.cluster.emotion === "happiness" ? "☀️" : "🌤";

        if (!popupRef.current) {
          popupRef.current = new mapboxgl.Popup({
            className: "emotion-weather-popup",
            offset: 18,
            maxWidth: "280px",
            closeButton: false,
            closeOnClick: false,
          });
        }

        popupRef.current
          .setLngLat(hovered.cluster.coordinates)
          .setHTML(
            `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#e2e8f0;min-width:220px;line-height:1.5;padding:4px 0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <span style="font-size:20px">${emotionIcon}</span>
                <div>
                  <div style="font-size:13px;font-weight:700;color:#f8fafc;letter-spacing:-0.2px">${weatherTitle(hovered.cluster.emotion)}</div>
                  <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-top:1px">Emotional Weather</div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;padding-top:8px;border-top:1px solid rgba(100,116,139,0.2)">
                <div style="display:flex;justify-content:space-between">
                  <span style="color:#94a3b8">Nearby check-ins</span>
                  <strong style="color:#f8fafc">${hovered.cluster.count}</strong>
                </div>
                <div style="display:flex;justify-content:space-between">
                  <span style="color:#94a3b8">Peak time</span>
                  <strong style="color:#f8fafc">${peakLabel}</strong>
                </div>
                <div style="display:flex;justify-content:space-between">
                  <span style="color:#94a3b8">Trend</span>
                  <strong style="color:${trendColor}">${trendIcon} ${hovered.cluster.trend}</strong>
                </div>
                <div style="display:flex;justify-content:space-between">
                  <span style="color:#94a3b8">Intensity</span>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div style="width:48px;height:4px;border-radius:2px;background:rgba(100,116,139,0.3);overflow:hidden">
                      <div style="width:${Math.round(hovered.cluster.intensity * 100)}%;height:100%;border-radius:2px;background:linear-gradient(90deg,#6366f1,#a78bfa)"></div>
                    </div>
                    <strong style="color:#f8fafc;font-size:11px">${Math.round(hovered.cluster.intensity * 100)}%</strong>
                  </div>
                </div>
              </div>
            </div>`
          )
          .addTo(map);
      } else {
        popupRef.current?.remove();
        popupRef.current = null;
      }
    };

    const handleLeave = () => {
      map.getCanvas().style.cursor = "";
      hoveredRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
    };

    map.on("mousemove", handleMove);
    map.on("mouseleave", handleLeave);

    return () => {
      map.off("mousemove", handleMove);
      map.off("mouseleave", handleLeave);
    };
  }, [map]);

  /* ── AR Mode 3D Layer ────────────────────────────────────────── */
  useEffect(() => {
    if (!map) return;

    if (!map.getLayer('3d-buildings-ar')) {
      // Calculate overall average smile score
      const avgSmile = checkins.length > 0 
        ? checkins.reduce((sum, c) => sum + ((c as any).smile_score ?? 50), 0) / checkins.length 
        : 50;
      
      const glowColor = avgSmile > 60 ? '#10b981' : (avgSmile < 40 ? '#e11d48' : '#3b82f6');

	if (!map || !map.isStyleLoaded()) return;

	const style = map.getStyle();
	if (!style) return;

	const layers = style.layers || [];

	const labelLayerId = layers.find(
  (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
)?.id;

      if (!map.getSource('composite')) return; // Check if source is ready (wait for load event usually, but checking here works if it's already running)

      try {
        map.addLayer(
          {
            id: '3d-buildings-ar',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 14,
            layout: {
              visibility: 'none',
            },
            paint: {
              'fill-extrusion-color': glowColor,
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.8
            }
          },
          labelLayerId
        );
      } catch (e) {
         console.warn("Could not add 3D AR layer", e);
      }
    }

    if (isARMode) {
      if (map.getLayer('3d-buildings-ar')) {
        map.setLayoutProperty('3d-buildings-ar', 'visibility', 'visible');
      }
      map.flyTo({ pitch: 65, bearing: -15, zoom: 18, duration: 2000 });
    } else {
      if (map.getLayer('3d-buildings-ar')) {
        map.setLayoutProperty('3d-buildings-ar', 'visibility', 'none');
      }
      map.flyTo({ pitch: 0, bearing: 0, zoom: 12, duration: 2000 });
      setArHUD(null);
    }
  }, [map, isARMode, checkins]);

  /* ── AR Mode Interaction ─────────────────────────────────────── */
  useEffect(() => {
    if (!map || !isARMode) {
      setArHUD(null);
      return;
    }

    let hoverTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!isARMode) return;
      
      const features = map.queryRenderedFeatures(e.point, { layers: ['3d-buildings-ar'] });
      if (features.length > 0) {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(async () => {
          try {
             let address = "Unknown Location";
             const token = mapboxgl.accessToken;
             if (token) {
               const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${e.lngLat.lng},${e.lngLat.lat}.json?access_token=${token}&types=address,poi`);
               const data = await res.json();
               if (data.features && data.features.length > 0) {
                 address = data.features[0].place_name.split(',')[0];
               }
             }

             const avgSmile = checkins.length > 0 
               ? checkins.reduce((sum, c) => sum + ((c as any).smile_score ?? 50), 0) / checkins.length 
               : 50;
             const vibe = avgSmile > 60 ? "Energetic / Positive" : (avgSmile < 40 ? "Tense / Melancholy" : "Calm / Neutral");

             setArHUD({
               visible: true,
               x: e.point.x,
               y: e.point.y,
               address,
               vibe
             });
          } catch(err) {
             setArHUD({
               visible: true,
               x: e.point.x,
               y: e.point.y,
               address: "Scanning Error",
               vibe: "Unknown"
             });
          }
        }, 300);
      } else {
        setArHUD(null);
        clearTimeout(hoverTimeout);
      }
    };

    map.on('mousemove', handleMouseMove);
    return () => {
      map.off('mousemove', handleMouseMove);
      clearTimeout(hoverTimeout);
    };
  }, [map, isARMode, checkins]);

  return (
    <>
      <div className={`absolute inset-0 z-[31] pointer-events-none transition-all duration-1000 ${isARMode ? 'backdrop-contrast-125 backdrop-brightness-75' : ''}`}>
        {isARMode && (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none animate-pulse opacity-30 mix-blend-screen" />
        )}
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[32]" />
      
      {/* AR HUD overlays */}
      {isARMode && arHUD && arHUD.visible && (
        <div 
          className="absolute z-[40] pointer-events-none rounded-xl p-3 shadow-2xl transition-all duration-200"
          style={{
            left: arHUD!.x + 20,
            top: arHUD!.y - 40,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(12px) saturate(1.5)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.15), inset 0 0 0 1px rgba(255,255,255,0.05)',
            transform: 'perspective(500px) rotateX(10deg) rotateY(-5deg)',
            fontFamily: 'monospace'
          }}
        >
          <div className="text-[10px] text-emerald-400 font-bold mb-1 tracking-widest uppercase">Target Locked</div>
          <div className="text-sm text-white font-medium break-words max-w-[150px] leading-tight mb-2">
            {arHUD!.address}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <div className="text-[11px] text-slate-300">Vibe: <span className="text-emerald-300 font-semibold">{arHUD!.vibe}</span></div>
          </div>
        </div>
      )}

      {/* Mode Switcher */}
      <button
        onClick={() => setIsARMode(!isARMode)}
        className="absolute bottom-6 right-6 z-[50] flex items-center justify-center w-12 h-12 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 shadow-lg text-white hover:bg-slate-800 transition-all hover:scale-110 active:scale-95 group"
        aria-label="Toggle AR Mode"
      >
        <div className="absolute inset-0 rounded-full group-hover:bg-indigo-500/20 transition-colors pointer-events-none" />
        <Layers size={22} className={isARMode ? "text-emerald-400" : "text-white"} />
      </button>

      <style jsx global>{`
        .emotion-weather-popup .mapboxgl-popup-content {
          background: rgba(15, 23, 42, 0.95) !important;
          backdrop-filter: blur(16px) saturate(1.8) !important;
          -webkit-backdrop-filter: blur(16px) saturate(1.8) !important;
          border: 1px solid rgba(100, 116, 139, 0.2) !important;
          border-radius: 14px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04) inset !important;
          padding: 14px 16px !important;
          color: white !important;
        }
        .emotion-weather-popup .mapboxgl-popup-tip {
          border-top-color: rgba(15, 23, 42, 0.95) !important;
          border-bottom-color: rgba(15, 23, 42, 0.95) !important;
        }
      `}</style>
    </>
  );
}
