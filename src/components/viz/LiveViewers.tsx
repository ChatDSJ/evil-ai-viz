import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface Props {
  visitor: VisitorInfo;
}

// Generate a stable session ID
function getSessionId(): string {
  const key = "journal7_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

// Convert lat/lon to simple x/y on a rectangle (Mercator-ish)
function geoToXY(
  lat: number,
  lon: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const x = ((lon + 180) / 360) * w;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = h / 2 - (mercN / Math.PI) * (h / 2);
  return { x, y };
}

export function LiveViewers({ visitor }: Props) {
  const sessionId = useMemo(() => getSessionId(), []);
  const heartbeat = useMutation(api.visitors.heartbeat);
  const activeVisitors = useQuery(api.visitors.getActive);
  const cleanup = useMutation(api.visitors.cleanup);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Send heartbeat every 10 seconds
  useEffect(() => {
    if (!visitor.loaded) return;

    const send = () => {
      heartbeat({
        sessionId,
        city: visitor.city,
        region: visitor.region,
        country: visitor.country,
        countryCode: visitor.countryCode,
        lat: visitor.lat,
        lon: visitor.lon,
      }).catch(() => {});
    };

    send(); // Immediate
    const interval = setInterval(send, 10_000);

    // Cleanup old entries every 30s
    const cleanupInterval = setInterval(() => {
      cleanup().catch(() => {});
    }, 30_000);

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, [visitor.loaded, visitor.lat, visitor.lon, sessionId, heartbeat, cleanup, visitor.city, visitor.region, visitor.country, visitor.countryCode]);

  // Pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Draw the mini world map with dots
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeVisitors) return;

    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Dark background
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(0, 255, 65, 0.05)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Very simplified continent outlines (dots to suggest landmass)
    ctx.fillStyle = "rgba(0, 255, 65, 0.06)";
    const continentDots = [
      // North America
      ...[...Array(30)].map(() => ({
        lat: 35 + Math.random() * 20,
        lon: -120 + Math.random() * 60,
      })),
      // Europe
      ...[...Array(20)].map(() => ({
        lat: 45 + Math.random() * 15,
        lon: -10 + Math.random() * 40,
      })),
      // Asia
      ...[...Array(25)].map(() => ({
        lat: 20 + Math.random() * 40,
        lon: 60 + Math.random() * 80,
      })),
      // South America
      ...[...Array(15)].map(() => ({
        lat: -30 + Math.random() * 30,
        lon: -75 + Math.random() * 30,
      })),
      // Africa
      ...[...Array(15)].map(() => ({
        lat: -15 + Math.random() * 40,
        lon: -10 + Math.random() * 50,
      })),
      // Australia
      ...[...Array(8)].map(() => ({
        lat: -35 + Math.random() * 15,
        lon: 115 + Math.random() * 30,
      })),
    ];
    for (const dot of continentDots) {
      const { x, y } = geoToXY(dot.lat, dot.lon, w, h);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const t = pulsePhase / 100;

    // Draw each active visitor
    for (const v of activeVisitors) {
      const { x, y } = geoToXY(v.lat, v.lon, w, h);
      const isMe = v.sessionId === sessionId;

      // Pulsing ring
      const ringSize = 4 + Math.sin(t * Math.PI * 2) * 2;
      ctx.strokeStyle = isMe
        ? `rgba(255, 0, 64, ${0.6 + Math.sin(t * Math.PI * 2) * 0.3})`
        : `rgba(255, 0, 255, ${0.4 + Math.sin(t * Math.PI * 2) * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, ringSize, 0, Math.PI * 2);
      ctx.stroke();

      // Outer glow
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 8);
      glow.addColorStop(0, isMe ? "rgba(255, 0, 64, 0.3)" : "rgba(255, 0, 255, 0.2)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Center dot
      ctx.fillStyle = isMe ? "#ff0040" : "#ff00ff";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();

      // Label for current user
      if (isMe) {
        ctx.font = "bold 7px 'Courier New', monospace";
        ctx.fillStyle = "#ff0040";
        ctx.textAlign = "center";
        ctx.fillText("◄ YOU", x + 22, y + 3);
      }
    }
  }, [activeVisitors, pulsePhase, sessionId]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const count = activeVisitors?.length ?? 0;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.85)",
        border: "1px solid rgba(255, 0, 255, 0.3)",
        borderRadius: "4px",
        padding: "8px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 15px rgba(255, 0, 255, 0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
          paddingBottom: "4px",
          borderBottom: "1px solid rgba(255, 0, 255, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#ff00ff",
              animation: "pulse-live 1.5s infinite",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              color: "#ff00ff",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            CONCURRENT SESSIONS
          </span>
        </div>
        <span
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            color: "#ff00ff",
            textShadow: "0 0 8px rgba(255, 0, 255, 0.5)",
          }}
        >
          {count}
        </span>
      </div>

      {/* Mini map */}
      <div
        style={{
          width: "100%",
          height: "90px",
          position: "relative",
          marginBottom: "6px",
        }}
      >
        <canvas
          ref={canvasRef}
          width={260}
          height={90}
          style={{ width: "100%", height: "100%", borderRadius: "2px" }}
        />
      </div>

      {/* Active session locations */}
      {activeVisitors && activeVisitors.length > 0 && (
        <div
          style={{
            fontSize: "10px",
            color: "#666",
            letterSpacing: "0.5px",
            lineHeight: "1.5",
            maxHeight: "42px",
            overflow: "hidden",
          }}
        >
          {activeVisitors.slice(0, 3).map((v, i) => (
            <div key={v.sessionId} style={{ color: v.sessionId === sessionId ? "#ff0040" : "#ff00ff" }}>
              {v.city}{v.region ? `, ${v.region}` : ""} — {v.country}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #ff00ff; }
          50% { opacity: 0.3; box-shadow: 0 0 0px #ff00ff; }
        }
      `}</style>
    </div>
  );
}
