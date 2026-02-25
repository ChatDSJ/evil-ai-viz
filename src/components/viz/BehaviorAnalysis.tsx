import { useEffect, useState, useRef } from "react";

/**
 * BehaviorAnalysis — a menacing panel that profiles the user's mouse
 * behavior in real-time. Tracks velocity, acceleration, jitter,
 * idle periods, and click patterns to compute an "Anxiety Index"
 * and classify behavior patterns.
 *
 * Uses real mouse/pointer events — every number is genuine.
 * The "anxiety" interpretation is the evil part.
 *
 * Displays:
 * - Live velocity sparkline (last 60 samples)
 * - Anxiety Index (0-100) with color coding
 * - Movement classification (Calm, Searching, Hesitant, Scanning, Erratic, Frozen)
 * - Total distance traveled (px + meters estimate)
 * - Click frequency
 * - Idle time accumulator
 * - "Profile confidence" that creeps up over time
 * - Micro-movement detection (hand tremor estimation)
 */

interface MouseSample {
  x: number;
  y: number;
  t: number;
  vel: number;
  accel: number;
}

type BehaviorClass = "FROZEN" | "HESITANT" | "CALM" | "READING" | "SEARCHING" | "SCANNING" | "ERRATIC" | "PANICKED";

const BEHAVIOR_COLORS: Record<BehaviorClass, string> = {
  FROZEN: "#666",
  HESITANT: "#aa88ff",
  CALM: "#00d4ff",
  READING: "#00ff41",
  SEARCHING: "#ffaa00",
  SCANNING: "#ff8800",
  ERRATIC: "#ff4400",
  PANICKED: "#ff0040",
};

const BEHAVIOR_DESCRIPTIONS: Record<BehaviorClass, string> = {
  FROZEN: "Subject immobile. Processing information or fear response.",
  HESITANT: "Micro-movements detected. Uncertainty in decision-making.",
  CALM: "Smooth, deliberate movements. Subject at ease.",
  READING: "Linear horizontal tracking. Subject consuming content.",
  SEARCHING: "Moderate scanning pattern. Looking for something specific.",
  SCANNING: "Rapid area coverage. Elevated arousal state.",
  ERRATIC: "Irregular trajectory. Heightened stress indicators.",
  PANICKED: "Chaotic movement pattern. Fight-or-flight response detected.",
};

// Sparkline component
function Sparkline({
  data,
  width,
  height,
  color,
  maxVal,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
  maxVal: number;
}) {
  if (data.length < 2) return null;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (Math.min(v, maxVal) / maxVal) * height;
    return `${x},${y}`;
  });

  const fillPoints = [...points, `${width},${height}`, `0,${height}`];

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <title>Velocity sparkline</title>
      {/* Fill under curve */}
      <polygon
        points={fillPoints.join(" ")}
        fill={`${color}15`}
      />
      {/* Line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.7"
      />
      {/* Current point glow */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - (Math.min(data[data.length - 1], maxVal) / maxVal) * height}
          r="2"
          fill={color}
          opacity="0.9"
        >
          <animate attributeName="r" values="2;3;2" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

function classifyBehavior(
  velocity: number,
  jitter: number,
  idleMs: number,
  _recentAccels: number[],
): BehaviorClass {
  // Frozen = no movement for >3s
  if (idleMs > 3000) return "FROZEN";

  // Panicked = very high velocity + high jitter
  if (velocity > 2000 && jitter > 400) return "PANICKED";

  // Erratic = high jitter relative to velocity (lots of direction changes)
  if (jitter > 300 && velocity > 500) return "ERRATIC";

  // Scanning = high velocity, moderate jitter
  if (velocity > 1200) return "SCANNING";

  // Searching = moderate velocity
  if (velocity > 600) return "SEARCHING";

  // Hesitant = low velocity with some jitter (micro-movements)
  if (velocity < 100 && jitter > 30 && idleMs < 1000) return "HESITANT";

  // Reading = low velocity, very low jitter (smooth horizontal)
  if (velocity < 200 && jitter < 50) return "READING";

  // Calm = smooth moderate movement
  return "CALM";
}

function computeAnxiety(
  velocity: number,
  jitter: number,
  clickFreq: number,
  idleRatio: number,
  dirChanges: number,
): number {
  // Weighted anxiety components
  let anxiety = 0;

  // Velocity contribution (fast = anxious, but very slow = also anxious)
  if (velocity > 800) {
    anxiety += Math.min(30, (velocity - 800) / 40);
  } else if (velocity < 50 && velocity > 0) {
    anxiety += 10; // Frozen hesitation
  }

  // Jitter (direction changes per distance)
  anxiety += Math.min(30, jitter / 10);

  // Click frequency
  anxiety += Math.min(15, clickFreq * 5);

  // Direction changes
  anxiety += Math.min(15, dirChanges / 2);

  // Idle ratio penalty (lots of freezing = uncertainty)
  anxiety += idleRatio * 10;

  return Math.min(100, Math.max(0, Math.round(anxiety)));
}

export function BehaviorAnalysis() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Mouse data
  const samplesRef = useRef<MouseSample[]>([]);
  const [velocity, setVelocity] = useState(0);
  const [sparkData, setSparkData] = useState<number[]>([]);
  const [anxiety, setAnxiety] = useState(0);
  const [behavior, setBehavior] = useState<BehaviorClass>("FROZEN");
  const [totalDistance, setTotalDistance] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [idleTime, setIdleTime] = useState(0);
  const [profileConfidence, setProfileConfidence] = useState(0);
  const [microMovements, setMicroMovements] = useState(0);
  const [directionChanges, setDirectionChanges] = useState(0);
  const [peakVelocity, setPeakVelocity] = useState(0);
  const [statusMessage, setStatusMessage] = useState("INITIALIZING BEHAVIORAL SENSORS...");

  const lastPosRef = useRef({ x: 0, y: 0, t: 0 });
  const lastVelRef = useRef({ vx: 0, vy: 0 });
  const totalDistRef = useRef(0);
  const clickCountRef = useRef(0);
  const lastMoveRef = useRef(Date.now());
  const idleAccumRef = useRef(0);
  const microMoveRef = useRef(0);
  const dirChangeRef = useRef(0);
  const peakVelRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const jitterAccum = useRef(0);
  const sparkRef = useRef<number[]>([]);

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Track mouse movement
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const now = Date.now();
      const last = lastPosRef.current;
      const dt = (now - last.t) / 1000; // seconds

      if (dt < 0.008) return; // Skip too-frequent events (>120fps)

      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vel = dt > 0 ? dist / dt : 0;

      // Track acceleration / jitter
      const vx = dt > 0 ? dx / dt : 0;
      const vy = dt > 0 ? dy / dt : 0;
      const lastVel = lastVelRef.current;
      const accel = dt > 0
        ? Math.sqrt((vx - lastVel.vx) ** 2 + (vy - lastVel.vy) ** 2) / dt
        : 0;

      // Direction changes (sign flip in velocity)
      if (
        (vx > 0 && lastVel.vx < 0) || (vx < 0 && lastVel.vx > 0) ||
        (vy > 0 && lastVel.vy < 0) || (vy < 0 && lastVel.vy > 0)
      ) {
        dirChangeRef.current++;
      }

      // Micro-movements (very small distances)
      if (dist > 0 && dist < 3) {
        microMoveRef.current++;
      }

      // Jitter accumulation
      if (vel > 0) {
        jitterAccum.current = jitterAccum.current * 0.95 + accel * 0.05;
      }

      // Total distance
      totalDistRef.current += dist;

      // Peak velocity
      if (vel > peakVelRef.current) {
        peakVelRef.current = vel;
      }

      // Store sample
      const sample: MouseSample = { x: e.clientX, y: e.clientY, t: now, vel, accel };
      samplesRef.current.push(sample);

      // Keep last 120 samples
      if (samplesRef.current.length > 120) {
        samplesRef.current = samplesRef.current.slice(-120);
      }

      lastPosRef.current = { x: e.clientX, y: e.clientY, t: now };
      lastVelRef.current = { vx, vy };
      lastMoveRef.current = now;
    };

    const handleClick = () => {
      clickCountRef.current++;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  // Update display at 4fps (every 250ms)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const samples = samplesRef.current;

      // Velocity (average of last 10 samples)
      const recent = samples.slice(-10);
      const avgVel = recent.length > 0
        ? recent.reduce((s, r) => s + r.vel, 0) / recent.length
        : 0;
      setVelocity(Math.round(avgVel));

      // Idle time
      const timeSinceMove = now - lastMoveRef.current;
      if (timeSinceMove > 500) {
        idleAccumRef.current += 250;
      }
      setIdleTime(idleAccumRef.current);

      // Sparkline data (velocity history, sampled every 250ms)
      sparkRef.current.push(avgVel);
      if (sparkRef.current.length > 80) {
        sparkRef.current = sparkRef.current.slice(-80);
      }
      setSparkData([...sparkRef.current]);

      // Classify behavior
      const cls = classifyBehavior(
        avgVel,
        jitterAccum.current,
        timeSinceMove,
        recent.map(r => r.accel),
      );
      setBehavior(cls);

      // Compute anxiety
      const elapsed = (now - sessionStartRef.current) / 1000;
      const clickFreq = elapsed > 0 ? clickCountRef.current / elapsed : 0;
      const idleRatio = elapsed > 0 ? (idleAccumRef.current / 1000) / elapsed : 0;
      const ax = computeAnxiety(
        avgVel,
        jitterAccum.current,
        clickFreq,
        idleRatio,
        dirChangeRef.current,
      );
      setAnxiety(ax);

      // Update totals
      setTotalDistance(totalDistRef.current);
      setClickCount(clickCountRef.current);
      setMicroMovements(microMoveRef.current);
      setDirectionChanges(dirChangeRef.current);
      setPeakVelocity(Math.round(peakVelRef.current));

      // Profile confidence (increases over time, faster with more data)
      const dataQuality = Math.min(1, samples.length / 50);
      const timeQuality = Math.min(1, elapsed / 120); // 2 minutes for full confidence
      const conf = Math.min(98, Math.round((dataQuality * 0.4 + timeQuality * 0.6) * 100));
      setProfileConfidence(conf);

      // Status messages
      if (elapsed < 5) {
        setStatusMessage("INITIALIZING BEHAVIORAL SENSORS...");
      } else if (elapsed < 15) {
        setStatusMessage("CALIBRATING TO SUBJECT MOVEMENT PATTERNS...");
      } else if (elapsed < 30) {
        setStatusMessage("BASELINE ESTABLISHED. PROFILING ACTIVE.");
      } else if (conf < 40) {
        setStatusMessage("BUILDING BEHAVIORAL SIGNATURE...");
      } else if (conf < 70) {
        setStatusMessage("MOTOR PATTERN RECOGNITION: ACTIVE");
      } else if (conf < 90) {
        setStatusMessage("PSYCHOLOGICAL PROFILE: NEAR COMPLETE");
      } else {
        setStatusMessage("SUBJECT FULLY PROFILED. MONITORING DEVIATIONS.");
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  const anxietyColor =
    anxiety < 20 ? "#00ff41" :
    anxiety < 40 ? "#00d4ff" :
    anxiety < 60 ? "#ffaa00" :
    anxiety < 80 ? "#ff6600" :
    "#ff0040";

  const distMeters = (totalDistance * 0.000264).toFixed(2); // rough px-to-meter estimate
  const idleSecs = Math.floor(idleTime / 1000);

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(255, 170, 0, 0.15)",
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(255, 170, 0, 0.05)",
        width: "100%",
        maxWidth: "290px",
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
          borderBottom: "1px solid rgba(255, 170, 0, 0.12)",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={() => {}}
        role="button"
        tabIndex={0}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: anxietyColor,
              animation: "ba-pulse 1.5s ease-in-out infinite",
              boxShadow: `0 0 4px ${anxietyColor}`,
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#ffaa00",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            BEHAVIORAL ANALYSIS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "9px",
              color: "#555",
              letterSpacing: "1px",
            }}
          >
            LIVE
          </span>
          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              background: "#ff0040",
              animation: "ba-live-blink 1s steps(1) infinite",
            }}
          />
          <span style={{ fontSize: "11px", color: "#444" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Anxiety Index — big number */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "6px",
              padding: "4px 0",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: anxietyColor,
                  lineHeight: "1",
                  textShadow: `0 0 10px ${anxietyColor}40`,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {anxiety}
              </div>
              <div
                style={{
                  fontSize: "8px",
                  color: "#555",
                  letterSpacing: "1.5px",
                  marginTop: "2px",
                }}
              >
                ANXIETY INDEX
              </div>
            </div>

            {/* Anxiety bar */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: "4px",
                  background: "rgba(255, 255, 255, 0.04)",
                  borderRadius: "2px",
                  overflow: "hidden",
                  marginBottom: "4px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${anxiety}%`,
                    background: `linear-gradient(90deg, #00ff41, ${anxietyColor})`,
                    borderRadius: "2px",
                    transition: "width 0.5s ease, background 0.5s ease",
                    boxShadow: `0 0 6px ${anxietyColor}30`,
                  }}
                />
              </div>
              {/* Behavior classification */}
              <div
                style={{
                  fontSize: "11px",
                  color: BEHAVIOR_COLORS[behavior],
                  letterSpacing: "1.5px",
                  fontWeight: "bold",
                }}
              >
                {behavior}
              </div>
              <div
                style={{
                  fontSize: "5.5px",
                  color: "#444",
                  letterSpacing: "0.3px",
                  marginTop: "1px",
                  lineHeight: "1.3",
                }}
              >
                {BEHAVIOR_DESCRIPTIONS[behavior]}
              </div>
            </div>
          </div>

          {/* Velocity sparkline */}
          <div style={{ marginBottom: "6px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
              }}
            >
              <span style={{ fontSize: "5.5px", color: "#555", letterSpacing: "1px" }}>
                VELOCITY (px/s)
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "#00d4ff",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {velocity}
              </span>
            </div>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "2px",
                padding: "2px",
                border: "1px solid rgba(0, 212, 255, 0.08)",
              }}
            >
              <Sparkline
                data={sparkData}
                width={260}
                height={28}
                color="#00d4ff"
                maxVal={2000}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "3px 8px",
              marginBottom: "6px",
            }}
          >
            <StatRow label="DISTANCE" value={`${Math.round(totalDistance).toLocaleString()} px`} color="#888" />
            <StatRow label="≈ PHYSICAL" value={`${distMeters} m`} color="#666" />
            <StatRow label="CLICKS" value={clickCount.toString()} color="#ff6600" />
            <StatRow label="IDLE TIME" value={`${idleSecs}s`} color="#aa88ff" />
            <StatRow label="PEAK VEL" value={`${peakVelocity} px/s`} color="#ff0040" />
            <StatRow label="MICRO-MVT" value={microMovements.toString()} color="#ffaa00" />
            <StatRow label="DIR CHANGES" value={directionChanges.toString()} color="#888" />
            <StatRow label="JITTER" value={jitterAccum.current.toFixed(0)} color="#ff4400" />
          </div>

          {/* Profile confidence */}
          <div
            style={{
              paddingTop: "5px",
              borderTop: "1px solid rgba(255, 170, 0, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}
            >
              <span style={{ fontSize: "5.5px", color: "#555", letterSpacing: "1px" }}>
                PROFILE CONFIDENCE
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: profileConfidence > 80 ? "#ff0040" : profileConfidence > 50 ? "#ffaa00" : "#555",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {profileConfidence}%
              </span>
            </div>
            <div
              style={{
                height: "2px",
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${profileConfidence}%`,
                  background: profileConfidence > 80
                    ? "linear-gradient(90deg, #ffaa00, #ff0040)"
                    : "linear-gradient(90deg, #333, #ffaa00)",
                  transition: "width 2s ease",
                  borderRadius: "1px",
                }}
              />
            </div>

            {/* Status message */}
            <div
              style={{
                marginTop: "4px",
                fontSize: "5.5px",
                color: "#444",
                letterSpacing: "1px",
                textAlign: "center",
                animation: "ba-status-pulse 3s ease-in-out infinite",
              }}
            >
              {statusMessage}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes ba-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ba-live-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes ba-status-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: "5.5px", color: "#444", letterSpacing: "1px" }}>{label}</span>
      <span
        style={{
          fontSize: "10px",
          color,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.3px",
        }}
      >
        {value}
      </span>
    </div>
  );
}
