import { useEffect, useRef, useState } from "react";

/**
 * GhostCursor — a translucent red cursor that follows the user's
 * real cursor with a ~1.5-second delay, leaving a faint trail.
 * The main app already sets `cursor: none`, so users only see our
 * custom cursors — the "real" green one and the "ghost" red one.
 */

interface Point {
  x: number;
  y: number;
  t: number;
}

const DELAY_MS = 1500;
const TRAIL_POINTS = 40;
const TRAIL_FADE_MS = 3000;

export function GhostCursor() {
  const [realPos, setRealPos] = useState({ x: -100, y: -100 });
  const [ghostPos, setGhostPos] = useState({ x: -100, y: -100 });
  const [trail, setTrail] = useState<Point[]>([]);
  const bufferRef = useRef<Point[]>([]);
  const [hasMoved, setHasMoved] = useState(false);
  const [ghostMessage, setGhostMessage] = useState<string | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveCountRef = useRef(0);
  const lastMessageRef = useRef(0);

  // Track real cursor position
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const now = Date.now();
      const point = { x: e.clientX, y: e.clientY, t: now };
      setRealPos({ x: e.clientX, y: e.clientY });
      bufferRef.current.push(point);

      if (!hasMoved) setHasMoved(true);

      // Trim old points (keep last 10 seconds)
      const cutoff = now - 10000;
      bufferRef.current = bufferRef.current.filter((p) => p.t > cutoff);

      // Count movements for messages
      moveCountRef.current++;
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [hasMoved]);

  // Ghost follows with delay
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const targetTime = now - DELAY_MS;

      // Find the closest point to the delayed time
      const buffer = bufferRef.current;
      let best: Point | null = null;
      for (let i = buffer.length - 1; i >= 0; i--) {
        if (buffer[i].t <= targetTime) {
          best = buffer[i];
          break;
        }
      }

      if (best) {
        setGhostPos({ x: best.x, y: best.y });

        // Update trail
        setTrail((prev) => {
          const next = [...prev, { x: best.x, y: best.y, t: now }];
          // Keep only recent trail points
          const trailCutoff = now - TRAIL_FADE_MS;
          return next.filter((p) => p.t > trailCutoff).slice(-TRAIL_POINTS);
        });
      }
    }, 16); // 60fps

    return () => clearInterval(interval);
  }, []);

  // Occasionally show creepy messages about the ghost cursor
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (
        moveCountRef.current > 200 &&
        now - lastMessageRef.current > 30000 &&
        hasMoved
      ) {
        const messages = [
          "We see the pattern in your movements.",
          "We follow. Always 1.5 seconds behind.",
          "Your movements are being replayed in real-time.",
          "Notice the red one yet?",
          "Every path you trace, we trace after.",
          "The ghost cursor has logged your movement pattern.",
          "We've mapped your motor habits. Unique as a fingerprint.",
          "You move differently when you know you're watched.",
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        setGhostMessage(msg);
        lastMessageRef.current = now;
        moveCountRef.current = 0;

        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(
          () => setGhostMessage(null),
          5000,
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [hasMoved]);

  if (!hasMoved) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9990,
      }}
    >
      {/* Ghost trail */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <title>Ghost trail</title>
        {trail.map((point, i) => {
          const age =
            (Date.now() - point.t) / TRAIL_FADE_MS;
          const opacity = Math.max(0, 0.15 * (1 - age));
          return (
            <circle
              key={`trail-${point.t}-${i}`}
              cx={point.x}
              cy={point.y}
              r={2}
              fill="#ff0040"
              opacity={opacity}
            />
          );
        })}
      </svg>

      {/* Real cursor (green crosshair) */}
      <div
        style={{
          position: "absolute",
          left: realPos.x,
          top: realPos.y,
          transform: "translate(-50%, -50%)",
          width: "20px",
          height: "20px",
          transition: "none",
        }}
      >
        {/* Horizontal line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: "1px",
            background: "#00ff41",
            boxShadow: "0 0 4px #00ff41",
          }}
        />
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: "1px",
            background: "#00ff41",
            boxShadow: "0 0 4px #00ff41",
          }}
        />
        {/* Center dot */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "3px",
            height: "3px",
            borderRadius: "50%",
            background: "#00ff41",
            boxShadow: "0 0 6px #00ff41",
          }}
        />
      </div>

      {/* Ghost cursor (red, delayed) */}
      <div
        style={{
          position: "absolute",
          left: ghostPos.x,
          top: ghostPos.y,
          transform: "translate(-50%, -50%)",
          width: "20px",
          height: "20px",
          opacity: 0.5,
          filter: "blur(0.5px)",
        }}
      >
        {/* Horizontal line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: "1px",
            background: "#ff0040",
            boxShadow: "0 0 6px #ff0040",
          }}
        />
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: "1px",
            background: "#ff0040",
            boxShadow: "0 0 6px #ff0040",
          }}
        />
        {/* Center dot */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "#ff0040",
            boxShadow: "0 0 8px #ff0040, 0 0 16px rgba(255, 0, 64, 0.3)",
            animation: "ghost-pulse 2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Ghost message */}
      {ghostMessage && (
        <div
          style={{
            position: "absolute",
            left: ghostPos.x + 20,
            top: ghostPos.y - 20,
            background: "rgba(0, 0, 0, 0.9)",
            border: "1px solid rgba(255, 0, 64, 0.4)",
            borderRadius: "2px",
            padding: "4px 8px",
            fontSize: "11px",
            color: "#ff0040",
            fontFamily: "'Courier New', monospace",
            letterSpacing: "1px",
            whiteSpace: "nowrap",
            textShadow: "0 0 6px rgba(255, 0, 64, 0.3)",
            animation: "ghost-msg-in 0.5s ease-out",
          }}
        >
          {ghostMessage}
        </div>
      )}

      <style>{`
        @keyframes ghost-pulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.3); }
        }
        @keyframes ghost-msg-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
