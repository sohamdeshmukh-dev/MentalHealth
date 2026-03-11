"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
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

const MAX_RENDERED = 24;

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

function metersPerPixel(lat: number, zoom: number) {
  return 156543.03392 * Math.cos((lat * Math.PI) / 180) / Math.pow(2, zoom);
}

function drawCloud(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number
) {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;

  context.beginPath();
  context.arc(x - radius * 0.42, y + radius * 0.05, radius * 0.44, 0, Math.PI * 2);
  context.arc(x, y - radius * 0.16, radius * 0.52, 0, Math.PI * 2);
  context.arc(x + radius * 0.45, y + radius * 0.04, radius * 0.4, 0, Math.PI * 2);
  context.closePath();
  context.fill();
  context.restore();
}

function drawAnxietyEvent(
  context: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  const seed = hash(cluster.id);
  const pulse = 0.55 + Math.sin(time * 1.4 + seed * 8) * 0.09;

  const gradient = context.createRadialGradient(x, y, radius * 0.28, x, y, radius * 1.15);
  gradient.addColorStop(0, `rgba(30,41,59,${0.24 * pulse * alpha})`);
  gradient.addColorStop(1, "rgba(15,23,42,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius * 1.2, 0, Math.PI * 2);
  context.fill();

  drawCloud(context, x, y, radius * 0.72, "#1f2937", alpha * 0.85);
  drawCloud(context, x + radius * 0.18, y - radius * 0.08, radius * 0.58, "#111827", alpha * 0.78);

  const windCount = 5 + Math.round(cluster.intensity * 6);
  context.save();
  context.strokeStyle = `rgba(148,163,184,${0.17 * alpha})`;
  context.lineWidth = 1.2;
  for (let i = 0; i < windCount; i += 1) {
    const phase = time * 0.5 + i * 0.9 + seed * 10;
    const yOffset = Math.sin(phase) * radius * 0.16;
    const xStart = x - radius * 1.1 + ((phase * 32) % (radius * 2.2));
    context.beginPath();
    context.moveTo(xStart, y + yOffset);
    context.lineTo(xStart + radius * 0.32, y + yOffset - radius * 0.06);
    context.stroke();
  }
  context.restore();

  const lightningPhase = (time + seed * 4.2) % 5.6;
  if (lightningPhase > 5.18) {
    context.save();
    context.strokeStyle = `rgba(250,204,21,${0.85 * alpha})`;
    context.shadowColor = "rgba(250,204,21,0.7)";
    context.shadowBlur = 12;
    context.lineWidth = 2;

    context.beginPath();
    context.moveTo(x + radius * 0.12, y + radius * 0.1);
    context.lineTo(x - radius * 0.05, y + radius * 0.44);
    context.lineTo(x + radius * 0.15, y + radius * 0.42);
    context.lineTo(x, y + radius * 0.78);
    context.stroke();
    context.restore();
  }
}

function drawSadnessEvent(
  context: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  const seed = hash(cluster.id);

  const gradient = context.createRadialGradient(x, y, radius * 0.22, x, y, radius * 1.2);
  gradient.addColorStop(0, `rgba(100,116,139,${0.2 * alpha})`);
  gradient.addColorStop(1, "rgba(30,41,59,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius * 1.15, 0, Math.PI * 2);
  context.fill();

  drawCloud(context, x, y, radius * 0.68, "#64748b", alpha * 0.88);
  drawCloud(context, x - radius * 0.14, y - radius * 0.05, radius * 0.52, "#94a3b8", alpha * 0.42);

  const dropCount = 10 + Math.round(cluster.intensity * 16);
  context.save();
  context.strokeStyle = `rgba(191,219,254,${0.38 * alpha})`;
  context.lineWidth = 1.35;

  for (let i = 0; i < dropCount; i += 1) {
    const phase = (time * 85 + i * 31 + seed * 910) % (radius * 1.55);
    const xOffset = ((i / dropCount) - 0.5) * radius * 1.4;
    const startY = y + radius * 0.2 - phase;

    context.beginPath();
    context.moveTo(x + xOffset, startY);
    context.lineTo(x + xOffset - radius * 0.03, startY + radius * 0.18);
    context.stroke();
  }

  context.restore();
}

function drawCalmEvent(
  context: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  const seed = hash(cluster.id);
  const breathe = 0.95 + Math.sin(time * 0.8 + seed * 5.8) * 0.06;

  const glow = context.createRadialGradient(x, y, radius * 0.18, x, y, radius * 1.24);
  glow.addColorStop(0, `rgba(254,249,195,${0.25 * alpha * breathe})`);
  glow.addColorStop(1, "rgba(45,212,191,0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, radius * 1.2, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.strokeStyle = `rgba(253,224,71,${0.42 * alpha})`;
  context.lineWidth = 1.4;
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8 + time * 0.06;
    const inner = radius * 0.26;
    const outer = radius * 0.52;
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    context.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    context.stroke();
  }
  context.restore();

  context.fillStyle = `rgba(251,191,36,${0.8 * alpha})`;
  context.beginPath();
  context.arc(x, y, radius * 0.24, 0, Math.PI * 2);
  context.fill();

  const particleCount = 8 + Math.round(cluster.intensity * 8);
  context.fillStyle = `rgba(209,250,229,${0.45 * alpha})`;
  for (let i = 0; i < particleCount; i += 1) {
    const angle = (i / particleCount) * Math.PI * 2 + time * 0.18 + seed;
    const distance = radius * (0.58 + ((i % 3) * 0.18));
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance + Math.sin(time + i) * 2;
    context.beginPath();
    context.arc(px, py, 1.6, 0, Math.PI * 2);
    context.fill();
  }
}

function drawSparkle(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.moveTo(x, y - size);
  context.lineTo(x + size * 0.3, y - size * 0.3);
  context.lineTo(x + size, y);
  context.lineTo(x + size * 0.3, y + size * 0.3);
  context.lineTo(x, y + size);
  context.lineTo(x - size * 0.3, y + size * 0.3);
  context.lineTo(x - size, y);
  context.lineTo(x - size * 0.3, y - size * 0.3);
  context.closePath();
  context.fill();
}

function drawHappinessEvent(
  context: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  const seed = hash(cluster.id);
  const pulse = 0.94 + Math.sin(time * 1.05 + seed * 9.2) * 0.11;

  const glow = context.createRadialGradient(x, y, radius * 0.22, x, y, radius * 1.3);
  glow.addColorStop(0, `rgba(251,191,36,${0.28 * alpha * pulse})`);
  glow.addColorStop(1, "rgba(249,115,22,0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, radius * 1.3, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = `rgba(255,237,213,${0.78 * alpha})`;
  context.beginPath();
  context.arc(x, y, radius * 0.23, 0, Math.PI * 2);
  context.fill();

  const sparkleCount = 7 + Math.round(cluster.intensity * 10);
  context.fillStyle = `rgba(253,224,71,${0.75 * alpha})`;
  for (let i = 0; i < sparkleCount; i += 1) {
    const angle = (i / sparkleCount) * Math.PI * 2 + time * 0.4 + seed * 3;
    const drift = Math.sin(time * 1.2 + i + seed) * 4;
    const distance = radius * (0.52 + (i % 4) * 0.15);
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance + drift;
    drawSparkle(context, px, py, 2.2);
  }
}

function drawEvent(
  context: CanvasRenderingContext2D,
  cluster: EmotionCluster,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  time: number
) {
  switch (cluster.emotion) {
    case "anxiety":
      drawAnxietyEvent(context, cluster, x, y, radius, alpha, time);
      break;
    case "sadness":
      drawSadnessEvent(context, cluster, x, y, radius, alpha, time);
      break;
    case "happiness":
      drawHappinessEvent(context, cluster, x, y, radius, alpha, time);
      break;
    default:
      drawCalmEvent(context, cluster, x, y, radius, alpha, time);
      break;
  }
}

function findHoveredCluster(screenClusters: ScreenCluster[], point: mapboxgl.Point) {
  for (let i = screenClusters.length - 1; i >= 0; i -= 1) {
    const current = screenClusters[i];
    if (current.alpha < 0.25) {
      continue;
    }
    const dx = point.x - current.x;
    const dy = point.y - current.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= current.radiusPx * 0.82) {
      return current;
    }
  }
  return null;
}

export default function EmotionWeatherOverlay({
  map,
  checkins,
  minZoom = 11.2,
}: EmotionWeatherOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clustersRef = useRef<EmotionCluster[]>([]);
  const screenClustersRef = useRef<ScreenCluster[]>([]);
  const animationRef = useRef<number | null>(null);
  const statesRef = useRef<Map<string, AnimatedCluster>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const clusters = useMemo(() => buildEmotionClusters(checkins), [checkins]);

  useEffect(() => {
    clustersRef.current = clusters;
  }, [clusters]);

  useEffect(() => {
    if (!map || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return;
    }

    const syncCanvasSize = () => {
      const container = map.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (
        canvas.width !== Math.round(width * dpr) ||
        canvas.height !== Math.round(height * dpr)
      ) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      syncCanvasSize();

      const width = map.getContainer().clientWidth;
      const height = map.getContainer().clientHeight;
      const zoom = map.getZoom();
      const now = performance.now() / 1000;
      const visibleBounds = map.getBounds();

      context.clearRect(0, 0, width, height);
      screenClustersRef.current = [];

      const states = statesRef.current;
      for (const state of states.values()) {
        state.targetAlpha = 0;
      }

      if (zoom >= minZoom && visibleBounds) {
        const visibleClusters = clustersRef.current
          .filter((cluster) => visibleBounds.contains(cluster.coordinates))
          .slice(0, MAX_RENDERED);

        for (const cluster of visibleClusters) {
          const projected = map.project(cluster.coordinates);

          if (
            projected.x < -160 ||
            projected.y < -160 ||
            projected.x > width + 160 ||
            projected.y > height + 160
          ) {
            continue;
          }

          const mpp = metersPerPixel(cluster.coordinates[1], zoom);
          const baseRadius = cluster.radiusMeters / Math.max(1, mpp);
          const radiusPx = Math.max(28, Math.min(130, baseRadius));

          const seed = hash(cluster.id);
          const driftX = Math.sin(now * 0.35 + seed * 9.5) * radiusPx * 0.05;
          const driftY = Math.cos(now * 0.28 + seed * 11.2) * radiusPx * 0.03;

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

      for (const [id, state] of states.entries()) {
        state.alpha += (state.targetAlpha - state.alpha) * 0.085;

        if (state.alpha < 0.012 && state.targetAlpha < 0.02) {
          states.delete(id);
          continue;
        }

        drawEvent(
          context,
          state.cluster,
          state.x,
          state.y,
          state.radiusPx,
          state.alpha,
          now
        );

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

    const handleResize = () => {
      syncCanvasSize();
    };

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
      map.getCanvas().style.cursor = "";
    };
  }, [map, minZoom]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const handleMove = (event: mapboxgl.MapMouseEvent) => {
      const hovered = findHoveredCluster(screenClustersRef.current, event.point);
      map.getCanvas().style.cursor = hovered ? "pointer" : "";
    };

    const handleLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const handleClick = (event: mapboxgl.MapMouseEvent) => {
      const hovered = findHoveredCluster(screenClustersRef.current, event.point);
      if (!hovered) {
        return;
      }

      popupRef.current?.remove();

      const peakHourLabel = `${String(hovered.cluster.peakHour).padStart(2, "0")}:00`;

      popupRef.current = new mapboxgl.Popup({
        className: "dark-popup",
        offset: 16,
        maxWidth: "260px",
      })
        .setLngLat(hovered.cluster.coordinates)
        .setHTML(
          `<div style="font-size:12px;color:#e2e8f0;min-width:220px;line-height:1.45">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8">${weatherTitle(hovered.cluster.emotion)}</div>
            <div style="margin-top:8px;display:flex;justify-content:space-between;gap:12px">
              <span style="color:#94a3b8">Nearby check-ins</span>
              <strong style="color:#f8fafc">${hovered.cluster.count}</strong>
            </div>
            <div style="margin-top:4px;display:flex;justify-content:space-between;gap:12px">
              <span style="color:#94a3b8">Peak time</span>
              <strong style="color:#f8fafc">${peakHourLabel}</strong>
            </div>
            <div style="margin-top:4px;display:flex;justify-content:space-between;gap:12px">
              <span style="color:#94a3b8">Trend</span>
              <strong style="color:#f8fafc">${hovered.cluster.trend}</strong>
            </div>
          </div>`
        )
        .addTo(map);
    };

    map.on("mousemove", handleMove);
    map.on("mouseleave", handleLeave);
    map.on("click", handleClick);

    return () => {
      map.off("mousemove", handleMove);
      map.off("mouseleave", handleLeave);
      map.off("click", handleClick);
    };
  }, [map]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[32]" />;
}
