import { useEffect, useState, useRef, useCallback } from "react";

/**
 * TypingBiometric — Keystroke dynamics analysis that builds a unique
 * biometric profile from HOW the user types, not WHAT they type.
 *
 * Measures:
 * - Dwell time: how long each key is held (keydown → keyup)
 * - Flight time: time between releasing one key and pressing the next
 * - Digraph timing: characteristic timing for common two-key sequences
 * - Typing rhythm consistency (coefficient of variation)
 * - Words per minute (rolling average)
 * - Estimated hand dominance from left/right key timing asymmetry
 * - Biometric hash derived from timing distributions
 *
 * Visualizes:
 * - Real-time rhythmogram: a strip-chart showing dwell (filled) and
 *   flight (gap) times as a scrolling waveform
 * - Timing distribution histogram
 *
 * This is a real authentication technique used by banks, government
 * agencies, and security firms. A website casually building your
 * typing biometric is deeply unsettling.
 *
 * No commentary. Just the data.
 */

// Which hand/finger typically presses each key (QWERTY layout)
const LEFT_HAND_KEYS = new Set("qwertasdfgzxcvb12345`~!@#$%".split(""));
const RIGHT_HAND_KEYS = new Set("yuiophjklnm67890-=[]\\;',./^&*()_+{}|:\"<>?".split(""));

interface TimingPair {
  flight: number; // ms between prev keyup and this keydown
  dwell: number;  // ms this key was held
  digraph: string; // the two-key sequence
  timestamp: number;
}

const MAX_EVENTS = 200;
const RHYTHMOGRAM_WIDTH = 240;
const RHYTHMOGRAM_HEIGHT = 50;

// Generate a biometric hash from timing distributions
function computeBiometricHash(pairs: TimingPair[]): string {
  if (pairs.length < 5) return "—";

  const dwells = pairs.map(p => p.dwell);
  const flights = pairs.map(p => p.flight);

  const meanDwell = dwells.reduce((a, b) => a + b, 0) / dwells.length;
  const meanFlight = flights.reduce((a, b) => a + b, 0) / flights.length;
  const stdDwell = Math.sqrt(dwells.reduce((a, b) => a + (b - meanDwell) ** 2, 0) / dwells.length);
  const stdFlight = Math.sqrt(flights.reduce((a, b) => a + (b - meanFlight) ** 2, 0) / flights.length);

  // Hash from statistical moments
  let hash = 0;
  const vals = [meanDwell, meanFlight, stdDwell, stdFlight, dwells.length];
  for (const v of vals) {
    const bits = Math.round(v * 1000);
    hash = ((hash << 5) - hash + bits) & 0xFFFFFFFF;
  }

  return `0x${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

export function TypingBiometric() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [pairs, setPairs] = useState<TimingPair[]>([]);
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [biometricHash, setBiometricHash] = useState("—");
  const [wpm, setWpm] = useState(0);
  const [consistency, setConsistency] = useState(0);
  const [handBalance, setHandBalance] = useState({ left: 0, right: 0 });
  const [meanDwell, setMeanDwell] = useState(0);
  const [meanFlight, setMeanFlight] = useState(0);

  const pendingKeys = useRef<Map<string, number>>(new Map());
  const lastKeyUp = useRef<{ time: number; key: string } | null>(null);
  const allPairs = useRef<TimingPair[]>([]);
  const wordTimestamps = useRef<number[]>([]);
  const leftCount = useRef(0);
  const rightCount = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const updateStats = useCallback(() => {
    const p = allPairs.current;
    if (p.length < 3) return;

    const recent = p.slice(-50);

    // Mean dwell & flight
    const dwells = recent.map(x => x.dwell);
    const flights = recent.map(x => x.flight).filter(f => f > 0 && f < 2000);

    const mD = dwells.reduce((a, b) => a + b, 0) / dwells.length;
    const mF = flights.length > 0 ? flights.reduce((a, b) => a + b, 0) / flights.length : 0;

    setMeanDwell(Math.round(mD));
    setMeanFlight(Math.round(mF));

    // Consistency (coefficient of variation of dwell times — lower = more consistent)
    const stdDwell = Math.sqrt(dwells.reduce((a, b) => a + (b - mD) ** 2, 0) / dwells.length);
    const cv = mD > 0 ? (1 - Math.min(stdDwell / mD, 1)) * 100 : 0;
    setConsistency(Math.round(cv));

    // WPM (based on word-boundary keystrokes in last 30 seconds)
    const now = Date.now();
    const recentWords = wordTimestamps.current.filter(t => now - t < 30000);
    if (recentWords.length > 1) {
      const elapsed = (now - recentWords[0]) / 60000; // minutes
      setWpm(Math.round(recentWords.length / elapsed));
    }

    // Hand balance
    const total = leftCount.current + rightCount.current;
    if (total > 0) {
      setHandBalance({
        left: Math.round((leftCount.current / total) * 100),
        right: Math.round((rightCount.current / total) * 100),
      });
    }

    // Biometric hash
    setBiometricHash(computeBiometricHash(p));
  }, []);

  // Draw rhythmogram
  const drawRhythmogram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const p = allPairs.current;
    const w = RHYTHMOGRAM_WIDTH;
    const h = RHYTHMOGRAM_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    if (p.length < 2) {
      // "Waiting" state
      ctx.strokeStyle = "rgba(255, 170, 0, 0.15)";
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    // Show last N pairs that fit in the width
    const barWidth = 3;
    const gap = 1;
    const maxBars = Math.floor(w / (barWidth + gap));
    const visiblePairs = p.slice(-maxBars);

    // Normalize: max dwell/flight for scaling
    const maxDwell = Math.max(...visiblePairs.map(x => x.dwell), 200);
    const maxFlight = Math.max(...visiblePairs.map(x => Math.min(x.flight, 1000)), 200);
    const midY = h / 2;

    visiblePairs.forEach((pair, i) => {
      const x = i * (barWidth + gap);

      // Dwell time: bar going UP from center (filled, warm color)
      const dwellH = (pair.dwell / maxDwell) * (midY - 2);
      const dwellHue = Math.max(0, 60 - (pair.dwell / maxDwell) * 60); // yellow → red
      ctx.fillStyle = `hsla(${dwellHue}, 100%, 50%, 0.7)`;
      ctx.fillRect(x, midY - dwellH, barWidth, dwellH);

      // Flight time: bar going DOWN from center (outline, cool color)
      const flightClamped = Math.min(pair.flight, 1000);
      const flightH = (flightClamped / maxFlight) * (midY - 2);
      ctx.fillStyle = `rgba(0, 170, 255, ${Math.min(0.6, 0.2 + flightClamped / 1000)})`;
      ctx.fillRect(x, midY + 1, barWidth, flightH);
    });

    // Center line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "rgba(255, 170, 0, 0.3)";
    ctx.font = "6px 'Courier New'";
    ctx.fillText("DWELL", 1, 8);
    ctx.fillStyle = "rgba(0, 170, 255, 0.3)";
    ctx.fillText("FLIGHT", 1, h - 2);
  }, []);

  // Keyboard event handlers
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key.length > 1 && key !== " ") return; // Skip modifier keys etc.
      if (pendingKeys.current.has(key)) return; // Already held

      pendingKeys.current.set(key, performance.now());
      setKeystrokeCount(prev => prev + 1);

      // Track hand usage
      if (LEFT_HAND_KEYS.has(key)) leftCount.current++;
      else if (RIGHT_HAND_KEYS.has(key)) rightCount.current++;

      // Track word boundaries for WPM
      if (key === " " || key === "enter") {
        wordTimestamps.current.push(Date.now());
        // Keep only last 60s
        const cutoff = Date.now() - 60000;
        wordTimestamps.current = wordTimestamps.current.filter(t => t > cutoff);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const downTime = pendingKeys.current.get(key);
      if (downTime === undefined) return;

      pendingKeys.current.delete(key);

      const upTime = performance.now();
      const dwell = upTime - downTime;

      // Calculate flight time from previous key
      let flight = 0;
      if (lastKeyUp.current) {
        flight = downTime - lastKeyUp.current.time;
        const digraph = lastKeyUp.current.key + key;

        const pair: TimingPair = {
          flight: Math.max(0, flight),
          dwell,
          digraph,
          timestamp: Date.now(),
        };

        allPairs.current.push(pair);
        if (allPairs.current.length > MAX_EVENTS) {
          allPairs.current = allPairs.current.slice(-MAX_EVENTS);
        }

        setPairs([...allPairs.current]);
      }

      lastKeyUp.current = { time: upTime, key };

      // Update stats periodically
      updateStats();
      drawRhythmogram();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [visible, updateStats, drawRhythmogram]);

  // Periodic redraw
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      drawRhythmogram();
      updateStats();
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, drawRhythmogram, updateStats]);

  if (!visible) return null;

  const hasSufficientData = pairs.length >= 5;
  const statusColor = hasSufficientData ? "#ffaa00" : "#444";
  const hashDisplay = hasSufficientData ? biometricHash : "INSUFFICIENT DATA";

  // Top 5 digraph timings
  const digraphMap = new Map<string, number[]>();
  pairs.forEach(p => {
    if (p.digraph.length === 2 && p.flight > 0 && p.flight < 2000) {
      const existing = digraphMap.get(p.digraph) || [];
      existing.push(p.flight);
      digraphMap.set(p.digraph, existing);
    }
  });
  const topDigraphs = [...digraphMap.entries()]
    .filter(([, times]) => times.length >= 2)
    .map(([dg, times]) => ({
      digraph: dg,
      avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      count: times.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(255, 170, 0, 0.12)",
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(255, 170, 0, 0.04)",
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
          borderBottom: "1px solid rgba(255, 170, 0, 0.1)",
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
              background: statusColor,
              animation: hasSufficientData
                ? "tb-active 2s ease-in-out infinite"
                : "tb-waiting 3s ease-in-out infinite",
              boxShadow: `0 0 4px ${statusColor}`,
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
            KEYSTROKE DYNAMICS
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#444" }}>
          {expanded ? "▼" : "▶"}
        </span>
      </div>

      {expanded && (
        <>
          {/* Rhythmogram */}
          <div
            style={{
              background: "rgba(255, 170, 0, 0.02)",
              border: "1px solid rgba(255, 170, 0, 0.06)",
              borderRadius: "2px",
              padding: "3px",
              marginBottom: "6px",
            }}
          >
            <canvas
              ref={canvasRef}
              width={RHYTHMOGRAM_WIDTH}
              height={RHYTHMOGRAM_HEIGHT}
              style={{
                display: "block",
                width: "100%",
                height: `${RHYTHMOGRAM_HEIGHT}px`,
                imageRendering: "pixelated",
              }}
            />
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2px 8px",
              marginBottom: "6px",
            }}
          >
            <TBRow label="KEYSTROKES" value={`${keystrokeCount}`} color="#ffaa00" />
            <TBRow label="SAMPLES" value={`${pairs.length}`} color="#888" />
            <TBRow
              label="AVG DWELL"
              value={hasSufficientData ? `${meanDwell}ms` : "—"}
              color={hasSufficientData ? "#ff6600" : "#333"}
            />
            <TBRow
              label="AVG FLIGHT"
              value={hasSufficientData ? `${meanFlight}ms` : "—"}
              color={hasSufficientData ? "#00aaff" : "#333"}
            />
            <TBRow
              label="SPEED"
              value={wpm > 0 ? `${wpm} WPM` : "—"}
              color={wpm > 0 ? "#00ff41" : "#333"}
            />
            <TBRow
              label="CONSISTENCY"
              value={hasSufficientData ? `${consistency}%` : "—"}
              color={
                !hasSufficientData ? "#333"
                : consistency > 70 ? "#00ff41"
                : consistency > 40 ? "#ffaa00"
                : "#ff0040"
              }
            />
          </div>

          {/* Hand balance bar */}
          {(handBalance.left > 0 || handBalance.right > 0) && (
            <div style={{ marginBottom: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span style={{ fontSize: "6px", color: "#555", letterSpacing: "1px" }}>L {handBalance.left}%</span>
                <span style={{ fontSize: "6px", color: "#444", letterSpacing: "1px" }}>HAND BALANCE</span>
                <span style={{ fontSize: "6px", color: "#555", letterSpacing: "1px" }}>R {handBalance.right}%</span>
              </div>
              <div style={{ display: "flex", height: "3px", borderRadius: "1px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${handBalance.left}%`,
                    background: "rgba(0, 170, 255, 0.5)",
                    transition: "width 0.5s ease",
                  }}
                />
                <div
                  style={{
                    width: `${handBalance.right}%`,
                    background: "rgba(255, 106, 0, 0.5)",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Top digraphs */}
          {topDigraphs.length > 0 && (
            <div
              style={{
                paddingTop: "5px",
                borderTop: "1px solid rgba(255, 170, 0, 0.06)",
                marginBottom: "5px",
              }}
            >
              <div style={{ fontSize: "7px", color: "#555", letterSpacing: "1.5px", marginBottom: "3px" }}>
                DIGRAPH TIMING
              </div>
              <div style={{ display: "grid", gap: "1px" }}>
                {topDigraphs.map((dg) => (
                  <div
                    key={`dg-${dg.digraph}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        color: "#ffaa00",
                        fontWeight: "bold",
                        width: "20px",
                        textAlign: "center",
                        letterSpacing: "1px",
                      }}
                    >
                      {dg.digraph.replace(" ", "␣").toUpperCase()}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: "3px",
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: "1px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min((dg.avg / 500) * 100, 100)}%`,
                          background: `linear-gradient(90deg, #ffaa00, ${dg.avg > 200 ? "#ff0040" : "#00ff41"})`,
                          borderRadius: "1px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "8px", color: "#666", fontVariantNumeric: "tabular-nums", width: "36px", textAlign: "right" }}>
                      {dg.avg}ms
                    </span>
                    <span style={{ fontSize: "6px", color: "#333" }}>×{dg.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biometric hash */}
          <div
            style={{
              paddingTop: "5px",
              borderTop: "1px solid rgba(255, 170, 0, 0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "6px", color: "#555", letterSpacing: "1px" }}>
              BIOMETRIC HASH
            </span>
            <span
              style={{
                fontSize: "10px",
                color: hasSufficientData ? "#ff0040" : "#333",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.5px",
                fontWeight: hasSufficientData ? "bold" : "normal",
              }}
            >
              {hashDisplay}
            </span>
          </div>
        </>
      )}

      <style>{`
        @keyframes tb-active {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #ffaa00; }
          50% { opacity: 0.5; box-shadow: 0 0 2px #ffaa00; }
        }
        @keyframes tb-waiting {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}

function TBRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: "6px", color: "#444", letterSpacing: "1px" }}>{label}</span>
      <span style={{ fontSize: "9px", color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
