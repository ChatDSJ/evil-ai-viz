import { useEffect, useRef, useState } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface Props {
  visitor: VisitorInfo;
}

interface RoadSegment {
  points: { x: number; y: number }[];
  type: "major" | "minor" | "residential" | "path";
}

// Fetch real street data from OpenStreetMap Overpass API
async function fetchStreetData(
  lat: number,
  lon: number,
  radiusM: number,
): Promise<{ lat: number; lon: number }[][]> {
  try {
    const query = `[out:json][timeout:10];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|service)$"](around:${radiusM},${lat},${lon}););out geom;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error("Overpass API error");
    const data = await res.json();

    const roads: { lat: number; lon: number }[][] = [];
    for (const el of data.elements || []) {
      if (el.type === "way" && el.geometry) {
        roads.push(
          el.geometry.map((g: { lat: number; lon: number }) => ({
            lat: g.lat,
            lon: g.lon,
          })),
        );
      }
    }
    return roads;
  } catch {
    return [];
  }
}

// Project lat/lon to screen coordinates
function projectRoads(
  roads: { lat: number; lon: number }[][],
  centerLat: number,
  centerLon: number,
  w: number,
  h: number,
  zoom: number,
): RoadSegment[] {
  const metersPerPixel = 2.0 / zoom; // roughly 2m per pixel at 1x zoom
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const cx = w / 2;
  const cy = h / 2;

  return roads.map((road) => {
    const points = road.map((p) => {
      const dx = ((p.lon - centerLon) * 111320 * cosLat) / metersPerPixel;
      const dy = (-(p.lat - centerLat) * 110574) / metersPerPixel;
      return { x: cx + dx, y: cy + dy };
    });
    return { points, type: "minor" as const };
  });
}

// Generate random points within a metro area
function randomMetroPoint(
  lat: number,
  lon: number,
  radiusKm: number,
): { lat: number; lon: number; label: string } {
  const angle = Math.random() * Math.PI * 2;
  const dist = (0.3 + Math.random() * 0.7) * radiusKm;
  const dLat = (dist / 111) * Math.cos(angle);
  const dLon = (dist / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);

  const streetNames = [
    "OAK", "MAPLE", "CEDAR", "PINE", "ELM", "MAIN", "PARK", "LAKE",
    "RIVER", "HILL", "VALLEY", "RIDGE", "FOREST", "MEADOW", "SUNSET",
    "HARBOR", "UNION", "LIBERTY", "MARKET", "BROADWAY", "WILLOW",
    "BIRCH", "CHERRY", "WALNUT", "PEARL", "GRAND", "CENTRAL", "HIGH",
  ];
  const suffixes = ["ST", "AVE", "BLVD", "DR", "RD", "CT", "LN", "WAY", "PL"];
  const num = Math.floor(100 + Math.random() * 9900);
  const street = streetNames[Math.floor(Math.random() * streetNames.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return {
    lat: lat + dLat,
    lon: lon + dLon,
    label: `${num} ${street} ${suffix}`,
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

const PHASE_ZOOM_IN = 0;
const PHASE_SCAN = 1;
const PHASE_ANALYZE = 2;
const PHASE_ZOOM_OUT = 3;
const PHASE_TRANSIT = 4;
const CYCLE_DURATION = 10;

export function UserLocationMap({ visitor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streetData, setStreetData] = useState<{ lat: number; lon: number }[][]>([]);

  // Fetch real street data on mount
  useEffect(() => {
    if (!visitor.loaded || !visitor.lat || !visitor.lon) return;
    fetchStreetData(visitor.lat, visitor.lon, 2000).then((roads) => {
      if (roads.length > 0) {
        setStreetData(roads);
      }
    });
  }, [visitor.loaded, visitor.lat, visitor.lon]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const parent = canvas.parentElement!;
    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let animId: number;
    const startTime = Date.now();

    const targets: ReturnType<typeof randomMetroPoint>[] = [];
    for (let i = 0; i < 50; i++) {
      targets.push(randomMetroPoint(visitor.lat, visitor.lon, 15));
    }
    let currentTarget = 0;
    let prevTarget = -1;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const now = (Date.now() - startTime) / 1000;

      const cycleTime = now % CYCLE_DURATION;
      let phase: number;
      let phaseProgress: number;

      if (cycleTime < 2) {
        phase = PHASE_ZOOM_IN;
        phaseProgress = cycleTime / 2;
      } else if (cycleTime < 6) {
        phase = PHASE_SCAN;
        phaseProgress = (cycleTime - 2) / 4;
      } else if (cycleTime < 8) {
        phase = PHASE_ANALYZE;
        phaseProgress = (cycleTime - 6) / 2;
      } else if (cycleTime < 9) {
        phase = PHASE_ZOOM_OUT;
        phaseProgress = (cycleTime - 8) / 1;
      } else {
        phase = PHASE_TRANSIT;
        phaseProgress = (cycleTime - 9) / 1;
      }

      const cycleIndex = Math.floor(now / CYCLE_DURATION);
      if (cycleIndex !== prevTarget) {
        prevTarget = cycleIndex;
        currentTarget = cycleIndex % targets.length;
      }

      const target = targets[currentTarget];
      const nextTarget = targets[(currentTarget + 1) % targets.length];

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      let zoomLevel: number;
      if (phase === PHASE_ZOOM_IN) {
        zoomLevel = 1 + easeInOutCubic(phaseProgress) * 5;
      } else if (phase === PHASE_SCAN || phase === PHASE_ANALYZE) {
        zoomLevel = 6;
      } else if (phase === PHASE_ZOOM_OUT) {
        zoomLevel = 6 - easeInOutCubic(phaseProgress) * 5;
      } else {
        zoomLevel = 1;
      }

      let viewOffsetX = 0;
      let viewOffsetY = 0;
      if (phase === PHASE_TRANSIT) {
        const ease = easeInOutCubic(phaseProgress);
        const dx = (nextTarget.lon - target.lon) * 500;
        const dy = (target.lat - nextTarget.lat) * 500;
        viewOffsetX = dx * ease;
        viewOffsetY = dy * ease;
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.translate(-cx + viewOffsetX, -cy + viewOffsetY);

      // ═══ REAL STREET DATA ═══
      if (streetData.length > 0) {
        const roads = projectRoads(
          streetData,
          target.lat,
          target.lon,
          w,
          h,
          zoomLevel,
        );

        // Draw roads as vector lines
        for (const road of roads) {
          if (road.points.length < 2) continue;

          const roadAlpha = Math.min(0.4, 0.08 * zoomLevel);
          ctx.strokeStyle = `rgba(0, 212, 255, ${roadAlpha})`;
          ctx.lineWidth = (zoomLevel > 3 ? 1.2 : 0.8) / zoomLevel;
          ctx.beginPath();
          ctx.moveTo(road.points[0].x, road.points[0].y);
          for (let i = 1; i < road.points.length; i++) {
            ctx.lineTo(road.points[i].x, road.points[i].y);
          }
          ctx.stroke();

          // Glow effect for major roads at high zoom
          if (zoomLevel > 3 && Math.random() > 0.7) {
            ctx.strokeStyle = `rgba(0, 212, 255, ${roadAlpha * 0.3})`;
            ctx.lineWidth = 3 / zoomLevel;
            ctx.beginPath();
            ctx.moveTo(road.points[0].x, road.points[0].y);
            for (let i = 1; i < road.points.length; i++) {
              ctx.lineTo(road.points[i].x, road.points[i].y);
            }
            ctx.stroke();
          }
        }

        // Building blocks between roads at high zoom
        if (zoomLevel > 3) {
          const buildingAlpha = Math.min(0.06, (zoomLevel - 3) * 0.02);
          ctx.fillStyle = `rgba(0, 212, 255, ${buildingAlpha})`;
          const roadSpacing = 30;
          for (let bx = -12; bx <= 12; bx++) {
            for (let by = -12; by <= 12; by++) {
              const blockX = cx + bx * roadSpacing + Math.sin(bx * 13 + by * 7) * 5 + 4;
              const blockY = cy + by * roadSpacing + Math.cos(bx * 5 + by * 11) * 4 + 4;
              const blockW = roadSpacing * 0.5 + Math.sin(bx * 7 + by * 3) * 2;
              const blockH = roadSpacing * 0.45 + Math.cos(bx * 11 + by * 5) * 2;
              ctx.fillRect(blockX, blockY, blockW, blockH);
            }
          }
        }
      } else {
        // Fallback: procedural grid when no real data available
        const baseGridSize = 40 / zoomLevel;
        const gridAlpha = Math.min(0.12, 0.04 * zoomLevel);
        ctx.strokeStyle = `rgba(0, 255, 65, ${gridAlpha})`;
        ctx.lineWidth = 0.3 / zoomLevel;

        for (let x = 0; x < w; x += baseGridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += baseGridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        if (zoomLevel > 2) {
          const roadAlpha = Math.min(0.2, (zoomLevel - 2) * 0.05);
          ctx.strokeStyle = `rgba(0, 212, 255, ${roadAlpha})`;
          ctx.lineWidth = 1.5 / zoomLevel;
          const roadSpacing = 35;
          for (let r = -8; r <= 8; r++) {
            ctx.beginPath();
            ctx.moveTo(0, cy + r * roadSpacing + Math.sin(r * 7) * 3);
            ctx.lineTo(w, cy + r * roadSpacing + Math.sin(r * 3) * 5);
            ctx.stroke();
          }
          for (let r = -8; r <= 8; r++) {
            ctx.beginPath();
            ctx.moveTo(cx + r * roadSpacing + Math.cos(r * 5) * 4, 0);
            ctx.lineTo(cx + r * roadSpacing + Math.cos(r * 11) * 2, h);
            ctx.stroke();
          }
        }
      }

      // Faint grid overlay always visible
      const faintGridSize = 60 / zoomLevel;
      ctx.strokeStyle = `rgba(0, 255, 65, ${Math.min(0.04, 0.015 * zoomLevel)})`;
      ctx.lineWidth = 0.2 / zoomLevel;
      for (let x = 0; x < w; x += faintGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += faintGridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Scan sweep during SCAN phase
      if (phase === PHASE_SCAN) {
        const sweepAngle = phaseProgress * Math.PI * 4;
        const sweepRadius = Math.min(w, h) * 0.45;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, sweepRadius / zoomLevel, sweepAngle, sweepAngle + 0.6);
        ctx.closePath();
        const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sweepRadius / zoomLevel);
        sweepGrad.addColorStop(0, "rgba(0, 255, 65, 0.2)");
        sweepGrad.addColorStop(1, "rgba(0, 255, 65, 0)");
        ctx.fillStyle = sweepGrad;
        ctx.fill();

        const scanX = cx + (Math.cos(sweepAngle) * sweepRadius) / zoomLevel;
        const scanY = cy + (Math.sin(sweepAngle) * sweepRadius) / zoomLevel;
        ctx.strokeStyle = "rgba(0, 255, 65, 0.4)";
        ctx.lineWidth = 1 / zoomLevel;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(scanX, scanY);
        ctx.stroke();
      }

      // Analyze phase
      if (phase === PHASE_ANALYZE) {
        const scanLineY = (phaseProgress * h * 2) % h;
        ctx.strokeStyle = "rgba(255, 0, 64, 0.3)";
        ctx.lineWidth = 1 / zoomLevel;
        ctx.beginPath();
        ctx.moveTo(0, scanLineY);
        ctx.lineTo(w, scanLineY);
        ctx.stroke();

        const markerAlpha = 0.3 + Math.sin(now * 6) * 0.2;
        ctx.fillStyle = `rgba(255, 0, 64, ${markerAlpha})`;
        for (let i = 0; i < 3; i++) {
          const mx = cx + (Math.sin(i * 2.4 + now) * 40) / zoomLevel;
          const my = cy + (Math.cos(i * 1.7 + now) * 30) / zoomLevel;
          ctx.fillRect(mx - 2 / zoomLevel, my - 2 / zoomLevel, 4 / zoomLevel, 4 / zoomLevel);
        }
      }

      ctx.restore();

      // ═══ HUD Overlay ═══

      const pulseScale = 1 + Math.sin(now * 3) * 0.1;
      const reticleSize = phase === PHASE_SCAN || phase === PHASE_ANALYZE ? 20 * pulseScale : 30 * pulseScale;

      ctx.strokeStyle = "#ff0040";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#ff0040";
      ctx.shadowBlur = phase === PHASE_ANALYZE ? 15 : 8;

      const gap = 6;
      ctx.beginPath(); ctx.moveTo(cx, cy - reticleSize); ctx.lineTo(cx, cy - gap); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + reticleSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - reticleSize, cy); ctx.lineTo(cx - gap, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + reticleSize, cy); ctx.stroke();

      // Rotating corner brackets
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(now * 0.5);
      const bracketSize = reticleSize + 8;
      const bracketLen = 8;
      ctx.lineWidth = 1;
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.beginPath();
        ctx.moveTo(dx * bracketSize, dy * (bracketSize - bracketLen));
        ctx.lineTo(dx * bracketSize, dy * bracketSize);
        ctx.lineTo(dx * (bracketSize - bracketLen), dy * bracketSize);
        ctx.stroke();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ff0040";
      ctx.fill();
      ctx.shadowBlur = 0;

      // Status text
      ctx.font = "bold 9px 'Courier New', monospace";
      ctx.textAlign = "center";

      let statusText = "";
      let statusColor = "#00ff41";
      if (phase === PHASE_ZOOM_IN) {
        statusText = "▼ ACQUIRING TARGET...";
        statusColor = "#ff6600";
      } else if (phase === PHASE_SCAN) {
        statusText = "◉ SCANNING PERIMETER";
        statusColor = "#00ff41";
      } else if (phase === PHASE_ANALYZE) {
        statusText = `█ ANALYZING ${target.label}`;
        statusColor = "#ff0040";
      } else if (phase === PHASE_ZOOM_OUT) {
        statusText = "▲ SECTOR CLEAR — REPOSITIONING";
        statusColor = "#00d4ff";
      } else {
        statusText = "⟫ TRANSIT TO NEXT TARGET";
        statusColor = "#888";
      }

      ctx.fillStyle = statusColor;
      if (phase === PHASE_ANALYZE && Math.sin(now * 8) > 0) {
        ctx.fillStyle = "transparent";
      }
      ctx.fillText(statusText, cx, cy - reticleSize - 16);

      if (phase >= PHASE_SCAN && phase <= PHASE_ANALYZE) {
        ctx.font = "8px 'Courier New', monospace";
        ctx.fillStyle = "rgba(255, 0, 64, 0.7)";
        ctx.fillText(target.label, cx, cy + reticleSize + 20);
      }

      // Data readouts
      ctx.textAlign = "left";
      ctx.font = "8px 'Courier New', monospace";
      ctx.fillStyle = "#00ff41";
      let infoY = 14;
      const lineH = 11;

      ctx.fillText(
        `${visitor.lat.toFixed(4)}°N, ${Math.abs(visitor.lon).toFixed(4)}°${visitor.lon >= 0 ? "E" : "W"}`,
        8,
        infoY,
      );
      infoY += lineH;

      ctx.fillStyle = "#00d4ff";
      ctx.fillText(
        `${target.lat.toFixed(5)}°N, ${Math.abs(target.lon).toFixed(5)}°${target.lon >= 0 ? "E" : "W"}`,
        8,
        infoY,
      );
      infoY += lineH;

      ctx.fillStyle = "#888";
      ctx.fillText(
        `${(currentTarget + 1).toString().padStart(3, "0")}/${targets.length.toString().padStart(3, "0")} ${zoomLevel.toFixed(1)}x`,
        8,
        infoY,
      );

      // Show street data source
      if (streetData.length > 0) {
        infoY += lineH;
        ctx.fillStyle = "#444";
        ctx.fillText(`OSM: ${streetData.length} road segments`, 8, infoY);
      }

      // Bottom right
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(0, 255, 65, 0.5)";
      ctx.font = "8px 'Courier New', monospace";
      const jitter = () => (Math.random() - 0.5) * 0.0001;
      ctx.fillText(
        `LAT ${(target.lat + jitter()).toFixed(6)} LON ${(target.lon + jitter()).toFixed(6)}`,
        w - 8,
        h - 8,
      );
      ctx.fillText(
        `RES: ${(0.5 / zoomLevel).toFixed(2)}m/px  LOCK: CONFIRMED`,
        w - 8,
        h - 20,
      );
      ctx.fillText(
        `SIGNAL: ${(85 + Math.sin(now * 2) * 10).toFixed(0)}%  ISP: ${visitor.isp.toUpperCase().slice(0, 20)}`,
        w - 8,
        h - 32,
      );

      // REC indicator
      if (Math.sin(now * 3) > 0) {
        ctx.fillStyle = "#ff0040";
        ctx.font = "bold 8px 'Courier New', monospace";
        ctx.textAlign = "right";
        ctx.fillText("● REC", w - 8, 16);
      }

      // Progress bar
      const barY = h - 3;
      const progress = cycleTime / CYCLE_DURATION;
      ctx.fillStyle = "rgba(0, 255, 65, 0.08)";
      ctx.fillRect(0, barY, w, 3);
      ctx.fillStyle = phase === PHASE_ANALYZE ? "#ff0040" : "#00ff41";
      ctx.fillRect(0, barY, w * progress, 3);

      // Interference dots
      for (let i = 0; i < 3; i++) {
        const rx = Math.random() * w;
        const ry = Math.random() * h;
        ctx.fillStyle = `rgba(0, 255, 65, ${Math.random() * 0.2})`;
        ctx.fillRect(rx, ry, 2, 2);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [visitor, streetData]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        border: "1px solid rgba(255, 0, 64, 0.4)",
        borderRadius: "4px",
        overflow: "hidden",
        boxShadow: "0 0 15px rgba(255, 0, 64, 0.15)",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
