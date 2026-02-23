import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface Props {
  visitor: VisitorInfo;
}

// Generate random points within a metro area (~5-20km from center)
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

// Easing
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// Phases
const PHASE_ZOOM_IN = 0;
const PHASE_SCAN = 1;
const PHASE_ANALYZE = 2;
const PHASE_ZOOM_OUT = 3;
const PHASE_TRANSIT = 4;

const CYCLE_DURATION = 10; // seconds per full sweep cycle

// Custom dark map style — roads + buildings only on black
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "evil-scan",
  sources: {
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#000000",
      },
    },
    // Water — very faint dark blue
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "fill-color": "#001a1a",
        "fill-opacity": 0.6,
      },
    },
    // Buildings — faint cyan outlines
    {
      id: "buildings-fill",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-color": "#001510",
        "fill-opacity": 0.4,
      },
    },
    {
      id: "buildings-outline",
      type: "line",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "line-color": "#00d4ff",
        "line-width": 0.3,
        "line-opacity": 0.25,
      },
    },
    // Landuse — very faint fill
    {
      id: "landuse",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      paint: {
        "fill-color": "#001008",
        "fill-opacity": 0.3,
      },
    },
    // Minor roads — thin green
    {
      id: "roads-minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 13,
      filter: ["all",
        ["in", "class", "minor", "service", "track", "path"],
      ],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#00ff41",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          13, 0.3,
          16, 0.8,
          18, 1.5,
        ],
        "line-opacity": 0.3,
      },
    },
    // Tertiary roads
    {
      id: "roads-tertiary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all",
        ["==", "class", "tertiary"],
      ],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#00ff41",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          10, 0.4,
          14, 1,
          18, 2,
        ],
        "line-opacity": 0.45,
      },
    },
    // Secondary roads
    {
      id: "roads-secondary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all",
        ["==", "class", "secondary"],
      ],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#00ff41",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          8, 0.5,
          14, 1.5,
          18, 3,
        ],
        "line-opacity": 0.55,
      },
    },
    // Primary roads — brighter
    {
      id: "roads-primary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all",
        ["==", "class", "primary"],
      ],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#00d4ff",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          6, 0.5,
          14, 2,
          18, 4,
        ],
        "line-opacity": 0.65,
      },
    },
    // Highways / motorways — brightest cyan
    {
      id: "roads-highway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all",
        ["in", "class", "motorway", "trunk"],
      ],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#00d4ff",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          4, 0.8,
          10, 2,
          14, 3,
          18, 5,
        ],
        "line-opacity": 0.75,
      },
    },
    // Highway glow (wider faint line underneath for glow effect)
    {
      id: "roads-highway-glow",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all",
        ["in", "class", "motorway", "trunk"],
      ],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#00d4ff",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          4, 3,
          10, 6,
          14, 10,
          18, 15,
        ],
        "line-opacity": 0.08,
      },
    },
    // Railway lines — dashed
    {
      id: "railway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["==", "class", "rail"],
      paint: {
        "line-color": "#ff6600",
        "line-width": 0.8,
        "line-opacity": 0.3,
        "line-dasharray": [3, 3],
      },
    },
  ],
};

export function UserLocationMap({ visitor }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Pre-generate sweep targets
  const targetsRef = useRef<ReturnType<typeof randomMetroPoint>[]>([]);
  if (targetsRef.current.length === 0) {
    for (let i = 0; i < 50; i++) {
      targetsRef.current.push(randomMetroPoint(visitor.lat, visitor.lon, 15));
    }
  }

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [visitor.lon, visitor.lat],
      zoom: 11,
      attributionControl: false,
      interactive: false, // Disable user interaction — this is a display-only map
      fadeDuration: 0,
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.on("load", () => {
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [visitor.lat, visitor.lon]);

  // Animation cycle: drive the map zoom/pan + draw HUD
  const animateMap = useCallback(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas) return;

    const ctx = canvas.getContext("2d")!;
    const startTime = Date.now();
    const targets = targetsRef.current;
    let prevCycleIndex = -1;
    let animId: number;

    const resize = () => {
      const parent = canvas.parentElement!;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const now = (Date.now() - startTime) / 1000;

      // Determine cycle time and phase
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

      // Update target at start of each cycle
      const cycleIndex = Math.floor(now / CYCLE_DURATION);
      const currentTarget = cycleIndex % targets.length;
      const target = targets[currentTarget];
      const nextTarget = targets[(currentTarget + 1) % targets.length];

      // ═══ Drive the map view ═══
      if (cycleIndex !== prevCycleIndex) {
        prevCycleIndex = cycleIndex;
        // Jump to current target at start of cycle
        map.jumpTo({
          center: [target.lon, target.lat],
          zoom: 11,
        });
      }

      // Smoothly animate map zoom/pan based on phase
      if (phase === PHASE_ZOOM_IN) {
        const zoom = 11 + easeInOutCubic(phaseProgress) * 5; // 11 → 16
        map.jumpTo({
          center: [target.lon, target.lat],
          zoom,
        });
      } else if (phase === PHASE_SCAN) {
        // Slow rotation while scanning
        const bearing = phaseProgress * 45;
        map.jumpTo({
          center: [target.lon, target.lat],
          zoom: 16,
          bearing,
        });
      } else if (phase === PHASE_ANALYZE) {
        // Slight zoom pulse during analysis
        const pulse = 16 + Math.sin(phaseProgress * Math.PI * 3) * 0.3;
        map.jumpTo({
          center: [target.lon, target.lat],
          zoom: pulse,
          bearing: 45,
        });
      } else if (phase === PHASE_ZOOM_OUT) {
        const zoom = 16 - easeInOutCubic(phaseProgress) * 5; // 16 → 11
        const bearing = 45 * (1 - easeInOutCubic(phaseProgress));
        map.jumpTo({
          center: [target.lon, target.lat],
          zoom,
          bearing,
        });
      } else if (phase === PHASE_TRANSIT) {
        // Lerp between targets
        const ease = easeInOutCubic(phaseProgress);
        const lng = target.lon + (nextTarget.lon - target.lon) * ease;
        const lat = target.lat + (nextTarget.lat - target.lat) * ease;
        map.jumpTo({
          center: [lng, lat],
          zoom: 11,
          bearing: 0,
        });
      }

      // ═══ HUD Canvas Overlay ═══
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      // Scan sweep when in SCAN phase
      if (phase === PHASE_SCAN) {
        const sweepAngle = phaseProgress * Math.PI * 4;
        const sweepRadius = Math.min(w, h) * 0.45;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, sweepRadius, sweepAngle, sweepAngle + 0.6);
        ctx.closePath();
        const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sweepRadius);
        sweepGrad.addColorStop(0, "rgba(0, 255, 65, 0.15)");
        sweepGrad.addColorStop(1, "rgba(0, 255, 65, 0)");
        ctx.fillStyle = sweepGrad;
        ctx.fill();

        // Scan line
        const scanX = cx + Math.cos(sweepAngle) * sweepRadius;
        const scanY = cy + Math.sin(sweepAngle) * sweepRadius;
        ctx.strokeStyle = "rgba(0, 255, 65, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(scanX, scanY);
        ctx.stroke();
      }

      // Analyze phase - horizontal scan lines
      if (phase === PHASE_ANALYZE) {
        const scanLineY = (phaseProgress * h * 2) % h;
        ctx.strokeStyle = "rgba(255, 0, 64, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanLineY);
        ctx.lineTo(w, scanLineY);
        ctx.stroke();

        // Analysis grid markers
        const markerAlpha = 0.3 + Math.sin(now * 6) * 0.2;
        ctx.fillStyle = `rgba(255, 0, 64, ${markerAlpha})`;
        for (let i = 0; i < 3; i++) {
          const mx = cx + Math.sin(i * 2.4 + now) * 40;
          const my = cy + Math.cos(i * 1.7 + now) * 30;
          ctx.fillRect(mx - 2, my - 2, 4, 4);
        }
      }

      // ═══ Target reticle ═══
      const pulseScale = 1 + Math.sin(now * 3) * 0.1;
      const reticleSize = (phase === PHASE_SCAN || phase === PHASE_ANALYZE ? 20 : 30) * pulseScale;

      ctx.strokeStyle = "#ff0040";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#ff0040";
      ctx.shadowBlur = phase === PHASE_ANALYZE ? 15 : 8;

      // Crosshairs
      const gap = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - reticleSize);
      ctx.lineTo(cx, cy - gap);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + gap);
      ctx.lineTo(cx, cy + reticleSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - reticleSize, cy);
      ctx.lineTo(cx - gap, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + gap, cy);
      ctx.lineTo(cx + reticleSize, cy);
      ctx.stroke();

      // Rotating corner brackets
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(now * 0.5);
      const bracketSize = reticleSize + 8;
      const bracketLen = 8;
      ctx.lineWidth = 1;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (const [dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(dx * bracketSize, dy * (bracketSize - bracketLen));
        ctx.lineTo(dx * bracketSize, dy * bracketSize);
        ctx.lineTo(dx * (bracketSize - bracketLen), dy * bracketSize);
        ctx.stroke();
      }
      ctx.restore();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ff0040";
      ctx.fill();
      ctx.shadowBlur = 0;

      // ═══ Status labels ═══
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

      // Target address below reticle
      if (phase >= PHASE_SCAN && phase <= PHASE_ANALYZE) {
        ctx.font = "8px 'Courier New', monospace";
        ctx.fillStyle = "rgba(255, 0, 64, 0.7)";
        ctx.fillText(target.label, cx, cy + reticleSize + 20);
      }

      // ═══ Info panels ═══
      ctx.textAlign = "left";
      ctx.font = "8px 'Courier New', monospace";
      ctx.fillStyle = "#00ff41";
      let infoY = 14;
      const lineH = 11;

      ctx.fillText(
        `${visitor.lat.toFixed(4)}°N, ${Math.abs(visitor.lon).toFixed(4)}°${visitor.lon >= 0 ? "E" : "W"}`,
        8, infoY,
      );
      infoY += lineH;

      ctx.fillStyle = "#00d4ff";
      ctx.fillText(
        `${target.lat.toFixed(5)}°N, ${Math.abs(target.lon).toFixed(5)}°${target.lon >= 0 ? "E" : "W"}`,
        8, infoY,
      );
      infoY += lineH;

      ctx.fillStyle = "#888";
      ctx.fillText(
        `${(currentTarget + 1).toString().padStart(3, "0")}/${targets.length.toString().padStart(3, "0")} Z:${map.getZoom().toFixed(1)}`,
        8, infoY,
      );

      // Bottom right — live data
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(0, 255, 65, 0.5)";
      ctx.font = "8px 'Courier New', monospace";
      const jitter = () => (Math.random() - 0.5) * 0.0001;
      ctx.fillText(
        `LAT ${(target.lat + jitter()).toFixed(6)} LON ${(target.lon + jitter()).toFixed(6)}`,
        w - 8, h - 8,
      );
      ctx.fillText(
        `RES: ${(0.5 / (map.getZoom() / 11)).toFixed(2)}m/px  LOCK: CONFIRMED`,
        w - 8, h - 20,
      );
      ctx.fillText(
        `SIGNAL: ${(85 + Math.sin(now * 2) * 10).toFixed(0)}%  ISP: ${visitor.isp.toUpperCase().slice(0, 20)}`,
        w - 8, h - 32,
      );

      // Blinking REC indicator
      if (Math.sin(now * 3) > 0) {
        ctx.fillStyle = "#ff0040";
        ctx.font = "bold 8px 'Courier New', monospace";
        ctx.textAlign = "right";
        ctx.fillText("● REC", w - 8, 16);
      }

      // Progress bar at bottom
      const barY = h - 3;
      const progress = cycleTime / CYCLE_DURATION;
      ctx.fillStyle = "rgba(0, 255, 65, 0.08)";
      ctx.fillRect(0, barY, w, 3);
      ctx.fillStyle = phase === PHASE_ANALYZE ? "#ff0040" : "#00ff41";
      ctx.fillRect(0, barY, w * progress, 3);

      // Random interference dots
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
  }, [visitor]);

  // Start animation loop when map is ready
  useEffect(() => {
    if (!mapReady) return;
    const cleanup = animateMap();
    return cleanup;
  }, [mapReady, animateMap]);

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
      {/* MapLibre GL map layer */}
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.85,
        }}
      />

      {/* Green scanline / vignette overlay for atmosphere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* HUD canvas overlay */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </div>
  );
}
