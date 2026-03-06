import { useEffect, useRef, useState } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface Props {
  visitor: VisitorInfo;
}

let maplibrePromise: Promise<any> | null = null;

function loadMapLibre(): Promise<any> {
  if (maplibrePromise) return maplibrePromise;

  maplibrePromise = new Promise((resolve, reject) => {
    if ((window as any).maplibregl) {
      resolve((window as any).maplibregl);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.js";
    script.onload = () => resolve((window as any).maplibregl);
    script.onerror = () => reject(new Error("Failed to load MapLibre GL"));
    document.head.appendChild(script);
  });

  return maplibrePromise;
}

const MAP_STYLE = {
  version: 8 as const,
  name: "target-lock",
  sources: {
    openmaptiles: {
      type: "vector" as const,
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#020504" },
    },
    {
      id: "water",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": "#001415", "fill-opacity": 0.62 },
    },
    {
      id: "landuse",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "landuse",
      paint: { "fill-color": "#001009", "fill-opacity": 0.35 },
    },
    {
      id: "roads-minor",
      type: "line" as const,
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 12,
      filter: ["in", "class", "minor", "service", "track", "path"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#00ff41",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.25, 16, 1.2],
        "line-opacity": 0.24,
      },
    },
    {
      id: "roads-major",
      type: "line" as const,
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "in",
        "class",
        "tertiary",
        "secondary",
        "primary",
        "trunk",
        "motorway",
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#00d4ff",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          4,
          0.4,
          10,
          1.3,
          16,
          3.8,
        ],
        "line-opacity": 0.58,
      },
    },
    {
      id: "buildings",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-color": "#01120e",
        "fill-opacity": 0.46,
      },
    },
    {
      id: "buildings-outline",
      type: "line" as const,
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "line-color": "#00ff41",
        "line-width": 0.35,
        "line-opacity": 0.2,
      },
    },
    {
      id: "road-labels",
      type: "symbol" as const,
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 13, 9, 17, 12],
        "text-letter-spacing": 0.08,
      },
      paint: {
        "text-color": "#7cecff",
        "text-halo-color": "rgba(0, 0, 0, 0.75)",
        "text-halo-width": 1,
        "text-opacity": 0.62,
      },
    },
    {
      id: "place-labels",
      type: "symbol" as const,
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 8,
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": ["Noto Sans Bold"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          10,
          13,
          12,
          17,
          14,
        ],
      },
      paint: {
        "text-color": "#00ff41",
        "text-halo-color": "rgba(0, 0, 0, 0.8)",
        "text-halo-width": 1.2,
        "text-opacity": 0.75,
      },
    },
  ],
};

type SequenceStage = "standby" | "approach" | "lock";

function clampLat(lat: number): number {
  return Math.max(-70, Math.min(70, lat));
}

function formatLon(lon: number): string {
  return `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? "E" : "W"}`;
}

function formatLat(lat: number): string {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}`;
}

export function UserLocationMap({ visitor }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<any>(null);
  const stageRef = useRef<SequenceStage>("standby");
  const stageStartedAtRef = useRef(Date.now());

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let map: any = null;
    let cancelled = false;
    let cycleInterval: ReturnType<typeof setInterval> | null = null;
    const scheduled: ReturnType<typeof setTimeout>[] = [];

    const setStage = (next: SequenceStage) => {
      stageRef.current = next;
      stageStartedAtRef.current = Date.now();
    };

    loadMapLibre()
      .then(ml => {
        if (!mapContainerRef.current || cancelled) return;

        const target: [number, number] = [visitor.lon, visitor.lat];
        const detachedCenter: [number, number] = [
          visitor.lon + 26,
          clampLat(visitor.lat + 13),
        ];

        map = new ml.Map({
          container: mapContainerRef.current,
          style: MAP_STYLE,
          center: detachedCenter,
          zoom: 3,
          bearing: 0,
          pitch: 0,
          attributionControl: false,
          interactive: false,
          fadeDuration: 0,
          dragRotate: false,
          pitchWithRotate: false,
        });

        map.on("load", () => {
          if (cancelled) return;

          map.addSource("target-point", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: target,
                  },
                  properties: {},
                },
              ],
            },
          });

          map.addLayer({
            id: "target-pulse",
            type: "circle",
            source: "target-point",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                3,
                2,
                18,
                20,
              ],
              "circle-color": "#ff003c",
              "circle-opacity": 0.14,
              "circle-blur": 0.3,
            },
          });

          map.addLayer({
            id: "target-core",
            type: "circle",
            source: "target-point",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                3,
                1.5,
                18,
                6,
              ],
              "circle-color": "#ff003c",
              "circle-opacity": 0.95,
              "circle-stroke-color": "#ffd9e1",
              "circle-stroke-width": 1,
            },
          });

          setMapReady(true);
          const runCycle = () => {
            if (cancelled || !map) return;
            setStage("standby");
            map.jumpTo({
              center: detachedCenter,
              zoom: 3,
              bearing: 0,
              pitch: 0,
            });

            scheduled.push(
              setTimeout(() => {
                if (cancelled || !map) return;
                setStage("approach");
                map.flyTo({
                  center: target,
                  zoom: 13.5,
                  speed: 0.2,
                  curve: 1.8,
                  essential: true,
                  easing: (t: number) => t,
                });
              }, 1000),
            );

            scheduled.push(
              setTimeout(() => {
                if (cancelled || !map) return;
                setStage("lock");
                map.easeTo({
                  center: target,
                  zoom: 17.5,
                  duration: 9000,
                  easing: (t: number) => t,
                });
              }, 15000),
            );
          };

          runCycle();
          cycleInterval = setInterval(runCycle, 28000);
        });

        mapRef.current = map;
      })
      .catch(() => {
        setLoadError(true);
      });

    return () => {
      cancelled = true;
      if (cycleInterval) clearInterval(cycleInterval);
      for (const timer of scheduled) clearTimeout(timer);
      if (map) {
        map.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, [visitor.lat, visitor.lon]);

  useEffect(() => {
    if (!mapReady && !loadError) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const now = Date.now();
      const elapsedSec = (now - stageStartedAtRef.current) / 1000;
      const map = mapRef.current;
      const stage = stageRef.current;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      let reticleX = cx;
      let reticleY = cy;
      if (map && typeof map.project === "function") {
        const projected = map.project([visitor.lon, visitor.lat]);
        reticleX = projected.x;
        reticleY = projected.y;
      }

      const pulse = 1 + Math.sin(now / 230) * 0.08;
      const size = 18 * pulse;
      const gap = 6;
      ctx.strokeStyle = "rgba(255, 0, 60, 0.95)";
      ctx.lineWidth = 1.2;
      ctx.shadowColor = "rgba(255, 0, 60, 0.7)";
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(reticleX, reticleY - size);
      ctx.lineTo(reticleX, reticleY - gap);
      ctx.moveTo(reticleX, reticleY + gap);
      ctx.lineTo(reticleX, reticleY + size);
      ctx.moveTo(reticleX - size, reticleY);
      ctx.lineTo(reticleX - gap, reticleY);
      ctx.moveTo(reticleX + gap, reticleY);
      ctx.lineTo(reticleX + size, reticleY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(reticleX, reticleY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff003c";
      ctx.fill();

      const scanY = ((now / 15) % (h + 30)) - 15;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0, 255, 65, 0.08)";
      ctx.fillRect(0, scanY, w, 2);

      ctx.textAlign = "center";
      ctx.font = "bold 10px 'Courier New', monospace";
      let headline = "TARGET ACTIVITY: STANDBY ORBIT";
      let headlineColor = "#00d4ff";
      if (stage === "approach") {
        headline = "TARGET ACTIVITY: HONING IN ON SUBJECT";
        headlineColor = "#ffaa00";
      } else if (stage === "lock") {
        headline = "TARGET ACTIVITY: SURVEILLANCE LOCK ESTABLISHED";
        headlineColor = "#00ff41";
      }
      if (stage === "lock" && Math.sin(now / 160) > 0.35) {
        headlineColor = "#ff003c";
      }
      ctx.fillStyle = headlineColor;
      ctx.fillText(headline, cx, 16);

      const zoom = map ? map.getZoom().toFixed(2) : "--";
      const center = map ? map.getCenter() : null;
      const city = visitor.city || "UNKNOWN";
      const region = visitor.region || "UNKNOWN";
      const isp = visitor.isp || "UNKNOWN ISP";

      ctx.textAlign = "left";
      ctx.font = "8px 'Courier New', monospace";
      ctx.fillStyle = "rgba(0, 255, 65, 0.9)";
      ctx.fillText(
        `TARGET LAT: ${formatLat(visitor.lat)}  LON: ${formatLon(visitor.lon)}`,
        8,
        h - 32,
      );
      ctx.fillText(
        `CAMERA ZOOM: ${zoom}x   STAGE T+${elapsedSec.toFixed(1)}s`,
        8,
        h - 20,
      );
      if (center) {
        ctx.fillStyle = "rgba(0, 212, 255, 0.75)";
        ctx.fillText(
          `VIEW CENTER: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`,
          8,
          h - 8,
        );
      }

      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(0, 255, 65, 0.8)";
      ctx.fillText(
        `NODE: ${city.toUpperCase()} // ${region.toUpperCase()}`,
        w - 8,
        16,
      );
      ctx.fillText(`ISP: ${isp.toUpperCase().slice(0, 24)}`, w - 8, 28);
      ctx.fillStyle = "rgba(255, 0, 60, 0.9)";
      if (Math.sin(now / 220) > 0) {
        ctx.fillText("REC ●", w - 8, 40);
      }

      let progress = 0.12;
      if (stage === "approach")
        progress = 0.12 + Math.min(elapsedSec / 14, 0.55);
      if (stage === "lock") progress = 0.8 + Math.min(elapsedSec / 8, 0.2);
      ctx.fillStyle = "rgba(0, 255, 65, 0.12)";
      ctx.fillRect(0, h - 3, w, 3);
      ctx.fillStyle = stage === "lock" ? "#ff003c" : "#00ff41";
      ctx.fillRect(0, h - 3, w * progress, 3);

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [mapReady, loadError, visitor]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        border: "1px solid rgba(0, 255, 65, 0.35)",
        borderRadius: "4px",
        overflow: "hidden",
        background: "#000",
        boxShadow: "0 0 14px rgba(0, 255, 65, 0.2)",
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.92,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

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
