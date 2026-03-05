import { useEffect, useState, useRef } from "react";

/**
 * SessionMemory — Uses localStorage to persist visit data across browser
 * sessions. The site *remembers* returning visitors.
 *
 * Stores and displays:
 * - Total number of visits
 * - First contact timestamp
 * - Last session timestamp and duration
 * - Cumulative exposure time across all sessions
 * - Current session duration (live)
 * - Visit frequency pattern
 * - Days since first contact
 *
 * For first-time visitors, the panel slowly builds data.
 * For returning visitors, it immediately recalls everything.
 *
 * No commentary. Just cold recall of your history with this site.
 * The persistence across sessions is the unsettling part.
 */

const STORAGE_KEY = "aihq_memory";

interface SessionRecord {
  firstContact: number;      // timestamp of very first visit
  totalSessions: number;     // count of distinct visits
  totalExposure: number;     // cumulative ms across all sessions
  lastSessionStart: number;  // timestamp of last session start
  lastSessionDuration: number; // ms of last completed session
  visits: number[];          // timestamps of each visit (last 20)
  canvasHash: string;        // stored fingerprint for identity continuity
}

function loadMemory(): SessionRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionRecord;
  } catch {
    return null;
  }
}

function saveMemory(record: SessionRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage full or blocked — silent fail
  }
}

function getCanvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 30;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "0x00000000";
    ctx.font = "12px Arial";
    ctx.fillText("aihq", 5, 20);
    const data = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return `0x${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  } catch {
    return "0x00000000";
  }
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m ${sec}s`;
  const hrs = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hrs}h ${remMin}m`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatRelativeTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function SessionMemory() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [revealPhase, setRevealPhase] = useState(0);
  const sessionStartRef = useRef(Date.now());
  const [glitch, setGlitch] = useState(false);

  // Initialize memory on mount
  useEffect(() => {
    const now = Date.now();
    const hash = getCanvasHash();
    const existing = loadMemory();

    if (existing) {
      // RETURNING VISITOR
      setIsReturning(true);
      const updated: SessionRecord = {
        ...existing,
        totalSessions: existing.totalSessions + 1,
        lastSessionStart: now,
        visits: [...existing.visits.slice(-19), now],
        canvasHash: hash,
      };
      saveMemory(updated);
      setRecord(updated);
    } else {
      // FIRST CONTACT
      const fresh: SessionRecord = {
        firstContact: now,
        totalSessions: 1,
        totalExposure: 0,
        lastSessionStart: now,
        lastSessionDuration: 0,
        visits: [now],
        canvasHash: hash,
      };
      saveMemory(fresh);
      setRecord(fresh);
    }

    sessionStartRef.current = now;

    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Periodically save current session duration
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStartRef.current;
      setCurrentDuration(elapsed);

      // Update stored record with running duration
      const existing = loadMemory();
      if (existing) {
        existing.lastSessionDuration = elapsed;
        existing.totalExposure = (existing.totalExposure || 0) + 1000; // add 1s each tick
        saveMemory(existing);
        setRecord({ ...existing });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Progressive reveal
  useEffect(() => {
    if (!visible) return;
    const timers = [
      setTimeout(() => setRevealPhase(1), isReturning ? 300 : 1500),
      setTimeout(() => setRevealPhase(2), isReturning ? 800 : 3000),
      setTimeout(() => setRevealPhase(3), isReturning ? 1500 : 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [visible, isReturning]);

  // Glitch effect
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 70);
    }, 12000 + Math.random() * 8000);
    return () => clearInterval(interval);
  }, []);

  if (!visible || !record) return null;

  const now = Date.now();
  const daysSinceFirst = Math.floor((now - record.firstContact) / (1000 * 60 * 60 * 24));
  const avgSessionLength = record.totalSessions > 1
    ? formatDuration(record.totalExposure / record.totalSessions)
    : "—";

  // Calculate visit frequency
  const visitFrequency = record.totalSessions > 1 && daysSinceFirst > 0
    ? (record.totalSessions / daysSinceFirst).toFixed(2)
    : "—";

  const accentColor = isReturning ? "#ff4400" : "#00d4ff";
  const borderColor = isReturning ? "rgba(255, 68, 0, 0.2)" : "rgba(0, 212, 255, 0.15)";

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: `1px solid ${borderColor}`,
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: `0 0 20px ${isReturning ? "rgba(255, 68, 0, 0.06)" : "rgba(0, 212, 255, 0.04)"}`,
        width: "100%",
        maxWidth: "260px",
        opacity: visible ? 1 : 0,
        transition: "opacity 2s ease",
        transform: glitch ? "translateX(-1px)" : "none",
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
          borderBottom: `1px solid ${borderColor}`,
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
              background: accentColor,
              animation: "sm-pulse 2s ease-in-out infinite",
              boxShadow: `0 0 4px ${accentColor}`,
            }}
          />
          <span style={{ fontSize: "9px", color: "#555", letterSpacing: "1.5px" }}>
            {isReturning ? "SUBJECT RECOGNIZED" : "NEW SUBJECT"}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#444" }}>
          {expanded ? "▼" : "▶"}
        </span>
      </div>

      {expanded && (
        <>
          {/* Session counter — big number */}
          {revealPhase >= 1 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
              animation: "sm-fade-in 0.5s ease-out",
            }}>
              <div style={{ textAlign: "center", minWidth: "45px" }}>
                <div style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: accentColor,
                  lineHeight: "1",
                  textShadow: `0 0 10px ${accentColor}30`,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {record.totalSessions}
                </div>
                <div style={{
                  fontSize: "7px",
                  color: "#555",
                  letterSpacing: "1.5px",
                  marginTop: "3px",
                }}>
                  {record.totalSessions === 1 ? "SESSION" : "SESSIONS"}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                {/* Current session timer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                  <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>CURRENT</span>
                  <span style={{ fontSize: "11px", color: "#00ff41", fontVariantNumeric: "tabular-nums" }}>
                    {formatDuration(currentDuration)}
                  </span>
                </div>
                {/* Cumulative exposure */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>TOTAL EXPOSURE</span>
                  <span style={{ fontSize: "11px", color: "#ffaa00", fontVariantNumeric: "tabular-nums" }}>
                    {formatDuration(record.totalExposure)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Detailed data */}
          {revealPhase >= 2 && (
            <div style={{
              marginBottom: "6px",
              paddingTop: "5px",
              borderTop: `1px solid ${borderColor}`,
              animation: "sm-fade-in 0.5s ease-out",
            }}>
              <MemRow label="FIRST CONTACT" value={formatTimestamp(record.firstContact)} color="#888" />
              {daysSinceFirst > 0 && (
                <MemRow label="TRACKING DURATION" value={`${daysSinceFirst} day${daysSinceFirst !== 1 ? "s" : ""}`} color="#888" />
              )}
              {isReturning && record.lastSessionDuration > 0 && (
                <MemRow
                  label="PREV SESSION"
                  value={`${formatDuration(record.lastSessionDuration)} · ${formatRelativeTime(now - record.visits[record.visits.length - 2])}`}
                  color="#aa88ff"
                />
              )}
              {record.totalSessions > 1 && (
                <MemRow label="AVG SESSION" value={avgSessionLength} color="#888" />
              )}
              {visitFrequency !== "—" && (
                <MemRow label="VISIT FREQ" value={`${visitFrequency}/day`} color="#ffaa00" />
              )}
            </div>
          )}

          {/* Visit timeline dots */}
          {revealPhase >= 3 && record.visits.length > 1 && (
            <div style={{
              marginBottom: "4px",
              animation: "sm-fade-in 0.5s ease-out",
            }}>
              <div style={{ fontSize: "7px", color: "#444", letterSpacing: "1px", marginBottom: "4px" }}>
                VISIT HISTORY
              </div>
              <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                {record.visits.map((ts, i) => {
                  const isCurrent = i === record.visits.length - 1;
                  return (
                    <div
                      key={`visit-${ts}-${i}`}
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: isCurrent ? "#00ff41" : accentColor,
                        opacity: isCurrent ? 1 : 0.4 + (i / record.visits.length) * 0.5,
                        animation: isCurrent ? "sm-current-pulse 1.5s ease-in-out infinite" : "none",
                        boxShadow: isCurrent ? `0 0 4px #00ff41` : "none",
                      }}
                      title={formatTimestamp(ts)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Identity hash */}
          {revealPhase >= 3 && (
            <div style={{
              marginTop: "6px",
              paddingTop: "5px",
              borderTop: `1px solid ${borderColor}`,
              animation: "sm-fade-in 0.5s ease-out",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>SUBJECT ID</span>
                <span style={{
                  fontSize: "10px",
                  color: "#553333",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.5px",
                }}>
                  {record.canvasHash}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes sm-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes sm-fade-in {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sm-current-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #00ff41; }
          50% { opacity: 0.6; box-shadow: 0 0 2px #00ff41; }
        }
      `}</style>
    </div>
  );
}

function MemRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
      <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>{label}</span>
      <span style={{ fontSize: "10px", color, fontVariantNumeric: "tabular-nums", letterSpacing: "0.3px" }}>
        {value}
      </span>
    </div>
  );
}
