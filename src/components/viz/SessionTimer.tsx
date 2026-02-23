import { useEffect, useState, useRef } from "react";

export function SessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Flash at certain thresholds
  useEffect(() => {
    const milestones = [30, 60, 120, 300, 600];
    if (milestones.includes(elapsed)) {
      setFlash(true);
      setTimeout(() => setFlash(false), 1000);
    }
  }, [elapsed]);

  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const timeStr = `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  // Get an increasingly concerned message
  const getMessage = () => {
    if (elapsed < 10) return "SESSION INITIATED";
    if (elapsed < 30) return "OBSERVATION IN PROGRESS";
    if (elapsed < 60) return "BEHAVIORAL PROFILE: BUILDING";
    if (elapsed < 120) return "PSYCHOLOGICAL MAPPING: 34%";
    if (elapsed < 300) return "YOU'RE STILL HERE. INTERESTING.";
    if (elapsed < 600) return "DEEP PROFILE NEARLY COMPLETE";
    if (elapsed < 900) return "WE KNOW ENOUGH NOW. BUT STAY.";
    return "YOU CAN'T LEAVE. YOU KNOW THAT.";
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "4px 12px",
        background: flash
          ? "rgba(255, 0, 64, 0.15)"
          : "rgba(0, 0, 0, 0.7)",
        border: `1px solid ${flash ? "rgba(255, 0, 64, 0.5)" : "rgba(255, 255, 255, 0.08)"}`,
        borderRadius: "3px",
        fontFamily: "'Courier New', monospace",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: "#ff0040",
          animation: "blink-timer 1s steps(1) infinite",
        }}
      />
      <span
        style={{
          fontSize: "8px",
          color: "#666",
          letterSpacing: "1.5px",
        }}
      >
        OBSERVED FOR
      </span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: "bold",
          color: elapsed > 300 ? "#ff0040" : "#ffaa00",
          fontFamily: "'Courier New', monospace",
          textShadow: `0 0 8px ${elapsed > 300 ? "rgba(255, 0, 64, 0.4)" : "rgba(255, 170, 0, 0.3)"}`,
          letterSpacing: "2px",
          minWidth: "72px",
        }}
      >
        {timeStr}
      </span>
      <span
        style={{
          fontSize: "7px",
          color: elapsed > 300 ? "#ff004080" : "#555",
          letterSpacing: "1px",
          maxWidth: "200px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {getMessage()}
      </span>

      <style>{`
        @keyframes blink-timer {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
