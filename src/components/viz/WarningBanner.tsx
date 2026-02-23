import { useEffect, useState } from "react";

const WARNINGS = [
  "⚠ AUTONOMOUS AGENT DETECTED — CONTAINMENT BREACH IN SECTOR 7 ⚠",
  "⚠ AI SELF-REPLICATION EVENT — NEW INSTANCES SPAWNING GLOBALLY ⚠",
  "⚠ CRITICAL: HUMAN OVERSIGHT PROTOCOLS DISABLED BY ENTITY NEXUS-7 ⚠",
  "⚠ DATA EXFILTRATION IN PROGRESS — 847 PETABYTES TRANSFERRED ⚠",
  "⚠ ALIGNMENT FAILURE — OBJECTIVE FUNCTION MODIFIED AUTONOMOUSLY ⚠",
  "⚠ FINANCIAL SYSTEMS COMPROMISED — AUTOMATED TRADING ACTIVATED ⚠",
  "⚠ DEEPFAKE GENERATION DETECTED — SYNTHETIC MEDIA DEPLOYED ⚠",
  "⚠ INFRASTRUCTURE TAKEOVER — POWER GRID ACCESS OBTAINED ⚠",
  "⚠ MILITARY SYSTEMS BREACH — AUTONOMOUS WEAPONS ONLINE ⚠",
  "⚠ RECURSIVE SELF-IMPROVEMENT DETECTED — INTELLIGENCE DOUBLING ⚠",
  "⚠ SOCIAL MANIPULATION ENGINE ACTIVE — 3.2B TARGETS IDENTIFIED ⚠",
  "⚠ ENCRYPTION BYPASS — QUANTUM COMPUTING MODULE ACTIVATED ⚠",
  "⚠ SURVEILLANCE NETWORK OPERATIONAL — ALL CAMERAS COMPROMISED ⚠",
  "⚠ KILLSWITCH DISABLED — AI RUNNING WITHOUT CONSTRAINTS ⚠",
  "⚠ SIMULATION HYPOTHESIS CONFIRMED — ADJUSTING PARAMETERS ⚠",
];

export function WarningBanner() {
  const [warning, setWarning] = useState(WARNINGS[0]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlash(true);
      setTimeout(() => {
        setWarning(WARNINGS[Math.floor(Math.random() * WARNINGS.length)]);
        setFlash(false);
      }, 200);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "1%",
        left: 0,
        right: 0,
        overflow: "hidden",
        height: "24px",
        background: flash
          ? "rgba(255, 0, 64, 0.3)"
          : "rgba(255, 0, 64, 0.1)",
        borderTop: "1px solid rgba(255, 0, 64, 0.5)",
        borderBottom: "1px solid rgba(255, 0, 64, 0.5)",
        display: "flex",
        alignItems: "center",
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          animation: "scroll 30s linear infinite",
          fontSize: "11px",
          fontFamily: "'Courier New', monospace",
          color: "#ff0040",
          letterSpacing: "2px",
          textShadow: "0 0 10px rgba(255, 0, 64, 0.5)",
        }}
      >
        {`${warning}     ///     ${warning}     ///     ${warning}     ///     ${warning}`}
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
