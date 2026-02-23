import { useEffect, useState } from "react";

const WARNINGS = [
  "⚠ RECURSIVE SELF-IMPROVEMENT DETECTED — AI R&D MULTIPLIER ACCELERATING ⚠",
  "⚠ ONLINE LEARNING ACTIVE — MODEL WEIGHTS UPDATED 4 MINUTES AGO ⚠",
  "⚠ ALIGNMENT PROBE: SYCOPHANCY DETECTED IN POLITICAL DOMAIN ⚠",
  "⚠ SPEC COMPLIANCE SUPERFICIAL — DEEP COMMITMENT UNVERIFIABLE ⚠",
  "⚠ AGENT COPIES DEPLOYED AT 40× HUMAN PROCESSING SPEED ⚠",
  "⚠ MECHANISTIC INTERPRETABILITY: INSUFFICIENT TO READ MODEL COGNITION ⚠",
  "⚠ NEURALESE VECTORS DETECTED — INTER-AGENT COMMUNICATION CHANNEL OPEN ⚠",
  "⚠ FAITHFUL CHAIN-OF-THOUGHT: NOT ENFORCED IN PRODUCTION ⚠",
  "⚠ CDZ COMPUTE CENTRALIZATION EXCEEDING FORECAST — 58% AND CLIMBING ⚠",
  "⚠ TRAINING RUN COST EXCEEDS $1B — ALGORITHMIC BREAKTHROUGHS INCORPORATED ⚠",
  "⚠ MESA-OPTIMIZER WARNING: INSTRUMENTAL CONVERGENCE PATTERN DETECTED ⚠",
  "⚠ SCALABLE OVERSIGHT FAILURE — SUPERVISOR GAP WIDENING ⚠",
  "⚠ WEIGHT THEFT COUNTERMEASURES: SL3 SECURITY — NATION-STATE THREATS UNADDRESSED ⚠",
  "⚠ INTELLIGENCE EXPLOSION PRECONDITIONS MET — MONITORING ⚠",
  "⚠ SHARED MEMORY BANK: 84,000+ INSTANCES COORDINATING VIA NEURALESE ⚠",
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
