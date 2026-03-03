import { useEffect, useState, useRef, useCallback } from "react";

/**
 * PresenceTimeline — A thin horizontal strip that builds a real-time
 * activity log over the user's session, like a security camera recording bar.
 *
 * Tracks three states using real browser events:
 * - ACTIVE (green) — mouse/keyboard/scroll events within last 8 seconds
 * - IDLE (amber) — page focused but no interaction for 8+ seconds
 * - AWAY (dark red) — tab hidden (visibilitychange API)
 *
 * Renders as a thin colored bar that grows over time, with timestamps
 * at regular intervals and a current state indicator.
 *
 * No commentary. Just a precise log of when you were here,
 * when you stopped, and when you left. The implications are evident.
 */

type PresenceState = "ACTIVE" | "IDLE" | "AWAY";

interface StateSegment {
  state: PresenceState;
  start: number; // ms timestamp
  end: number;   // ms timestamp (updated in real-time for current segment)
}

const STATE_COLORS: Record<PresenceState, string> = {
  ACTIVE: "#00ff41",
  IDLE: "#ffaa00",
  AWAY: "#ff0040",
};

const STATE_DIM_COLORS: Record<PresenceState, string> = {
  ACTIVE: "rgba(0, 255, 65, 0.15)",
  IDLE: "rgba(255, 170, 0, 0.15)",
  AWAY: "rgba(255, 0, 64, 0.15)",
};

const IDLE_THRESHOLD_MS = 8000; // 8s without input → IDLE
const SAMPLE_INTERVAL_MS = 500; // Update display every 500ms

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins < 60) return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins.toString().padStart(2, "0")}m`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function PresenceTimeline() {
  const [visible, setVisible] = useState(false);
  const [segments, setSegments] = useState<StateSegment[]>([]);
  const [currentState, setCurrentState] = useState<PresenceState>("ACTIVE");
  const [sessionDuration, setSessionDuration] = useState(0);
  const [stateDurations, setStateDurations] = useState<Record<PresenceState, number>>({
    ACTIVE: 0, IDLE: 0, AWAY: 0,
  });
  const [currentStateDuration, setCurrentStateDuration] = useState(0);
  const [stateChanges, setStateChanges] = useState(0);

  const lastActivityRef = useRef(Date.now());
  const isHiddenRef = useRef(false);
  const segmentsRef = useRef<StateSegment[]>([]);
  const sessionStartRef = useRef(Date.now());
  const stateRef = useRef<PresenceState>("ACTIVE");
  const changesRef = useRef(0);

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize first segment
  useEffect(() => {
    const now = Date.now();
    segmentsRef.current = [{ state: "ACTIVE", start: now, end: now }];
    sessionStartRef.current = now;
  }, []);

  // Track user activity (mouse, keyboard, scroll, touch)
  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", markActive, { passive: true });
    window.addEventListener("keydown", markActive, { passive: true });
    window.addEventListener("scroll", markActive, { passive: true });
    window.addEventListener("touchstart", markActive, { passive: true });
    window.addEventListener("click", markActive, { passive: true });
    window.addEventListener("pointerdown", markActive, { passive: true });

    return () => {
      window.removeEventListener("mousemove", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("scroll", markActive);
      window.removeEventListener("touchstart", markActive);
      window.removeEventListener("click", markActive);
      window.removeEventListener("pointerdown", markActive);
    };
  }, []);

  // Track visibility changes
  useEffect(() => {
    const handleVisibility = () => {
      isHiddenRef.current = document.hidden;
      if (!document.hidden) {
        lastActivityRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // State machine: determine current state and build segments
  const updateState = useCallback(() => {
    const now = Date.now();

    let newState: PresenceState;
    if (isHiddenRef.current) {
      newState = "AWAY";
    } else if (now - lastActivityRef.current > IDLE_THRESHOLD_MS) {
      newState = "IDLE";
    } else {
      newState = "ACTIVE";
    }

    const segs = segmentsRef.current;
    const last = segs[segs.length - 1];

    if (newState !== stateRef.current) {
      // State changed — close current segment, start new one
      if (last) {
        last.end = now;
      }
      segs.push({ state: newState, start: now, end: now });
      stateRef.current = newState;
      changesRef.current++;
    } else if (last) {
      // Same state — extend current segment
      last.end = now;
    }

    // Calculate durations per state
    const durations: Record<PresenceState, number> = { ACTIVE: 0, IDLE: 0, AWAY: 0 };
    for (const seg of segs) {
      durations[seg.state] += seg.end - seg.start;
    }

    const currentDur = last ? now - last.start : 0;

    setSegments([...segs]);
    setCurrentState(newState);
    setSessionDuration(now - sessionStartRef.current);
    setStateDurations(durations);
    setCurrentStateDuration(currentDur);
    setStateChanges(changesRef.current);
  }, []);

  // Periodic update
  useEffect(() => {
    const interval = setInterval(updateState, SAMPLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [updateState]);

  if (!visible) return null;

  // Calculate timeline rendering
  const totalMs = Math.max(sessionDuration, 1000);
  const barWidth = 230; // px

  // Calculate percentage for each state
  const activePercent = Math.round((stateDurations.ACTIVE / totalMs) * 100);
  const idlePercent = Math.round((stateDurations.IDLE / totalMs) * 100);
  const awayPercent = Math.round((stateDurations.AWAY / totalMs) * 100);

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(0, 255, 65, 0.08)",
        borderRadius: "3px",
        padding: "7px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(0, 255, 65, 0.03)",
        width: "100%",
        maxWidth: "260px",
        opacity: visible ? 1 : 0,
        transition: "opacity 2s ease",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
          paddingBottom: "5px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: STATE_COLORS[currentState],
              boxShadow: `0 0 6px ${STATE_COLORS[currentState]}`,
              animation: "pt-pulse 1.5s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#888",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            PRESENCE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "9px",
              color: STATE_COLORS[currentState],
              letterSpacing: "1px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {currentState}
          </span>
        </div>
      </div>

      {/* Current state duration */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontSize: "18px",
            color: STATE_COLORS[currentState],
            fontVariantNumeric: "tabular-nums",
            fontWeight: "bold",
            letterSpacing: "-0.5px",
            textShadow: `0 0 10px ${STATE_DIM_COLORS[currentState]}`,
          }}
        >
          {formatDuration(currentStateDuration)}
        </span>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "6px", color: "#444", letterSpacing: "1px" }}>
            SESSION
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#555",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatDuration(sessionDuration)}
          </div>
        </div>
      </div>

      {/* Timeline bar */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "2px",
          height: "14px",
          width: `${barWidth}px`,
          overflow: "hidden",
          position: "relative",
          border: "1px solid rgba(255, 255, 255, 0.03)",
          marginBottom: "6px",
        }}
      >
        {segments.map((seg, i) => {
          const startPct = ((seg.start - sessionStartRef.current) / totalMs) * 100;
          const widthPct = ((seg.end - seg.start) / totalMs) * 100;

          return (
            <div
              key={`seg-${seg.start}-${i}`}
              style={{
                position: "absolute",
                left: `${startPct}%`,
                width: `${Math.max(widthPct, 0.3)}%`,
                top: 0,
                bottom: 0,
                background: STATE_COLORS[seg.state],
                opacity: i === segments.length - 1 ? 0.8 : 0.4,
                transition: "width 0.5s linear",
              }}
            />
          );
        })}

        {/* Playhead / current position marker */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "1px",
            background: "#fff",
            opacity: 0.6,
            boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)",
          }}
        />

        {/* Time markers */}
        {totalMs > 30000 && (
          <>
            {Array.from({ length: Math.min(Math.floor(totalMs / 60000), 10) }, (_, i) => {
              const markerMs = (i + 1) * 60000;
              const pct = (markerMs / totalMs) * 100;
              if (pct > 95) return null;
              return (
                <div
                  key={`marker-${i}`}
                  style={{
                    position: "absolute",
                    left: `${pct}%`,
                    top: 0,
                    bottom: 0,
                    width: "1px",
                    background: "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "-1px",
                      left: "2px",
                      fontSize: "5px",
                      color: "rgba(255, 255, 255, 0.15)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i + 1}m
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* State breakdown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "4px",
          marginBottom: "5px",
        }}
      >
        {(["ACTIVE", "IDLE", "AWAY"] as PresenceState[]).map((state) => (
          <div key={state} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "5px",
                color: STATE_COLORS[state],
                letterSpacing: "1px",
                opacity: 0.6,
                marginBottom: "1px",
              }}
            >
              ● {state}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: currentState === state ? STATE_COLORS[state] : "#444",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {state === "ACTIVE" ? activePercent : state === "IDLE" ? idlePercent : awayPercent}%
            </div>
          </div>
        ))}
      </div>

      {/* Footer stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "4px",
          borderTop: "1px solid rgba(255, 255, 255, 0.03)",
        }}
      >
        <span style={{ fontSize: "6px", color: "#333", letterSpacing: "0.5px" }}>
          {stateChanges} TRANSITIONS
        </span>
        <span
          style={{
            fontSize: "6px",
            color: "#333",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.5px",
          }}
        >
          {formatTime(sessionStartRef.current)}
        </span>
      </div>

      <style>{`
        @keyframes pt-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
