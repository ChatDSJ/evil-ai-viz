import { useEffect, useState, useRef } from "react";

/**
 * SlowCreep — an imperceptible background color shift from pure black
 * to a dark, unsettling red over the course of a session. The change is
 * so gradual that users won't notice until a message points it out.
 *
 * Timeline:
 *   0-60s:    Nothing. Pure black. Building trust.
 *   60-180s:  Barely perceptible shift begins (0 → 0.02 red intensity)
 *   180-300s: Accelerating slightly (0.02 → 0.06)
 *   300s:     Tiny annotation appears: "CHROMATIC SHIFT: ACTIVE"
 *   300-600s: Continues shifting (0.06 → 0.12)
 *   600s:     Message: "You haven't noticed the color change yet, have you?"
 *   600-900s: Now obvious if you're looking (0.12 → 0.18)
 *   900s:     Sudden snap back to black for ~100ms, then continues
 *   900+:     Continues with message: "We can change what you see."
 *
 * Also includes ambient "breathing" — very subtle brightness oscillation
 * that operates below conscious perception but creates unease.
 */

const MESSAGES = [
  { time: 300, text: "CHROMATIC SHIFT: ACTIVE", opacity: 0.15, duration: 8000 },
  { time: 600, text: "You haven't noticed the color change yet, have you?", opacity: 0.4, duration: 10000 },
  { time: 900, text: "We just reset it. Did you see?", opacity: 0.5, duration: 8000 },
  { time: 1200, text: "We can change what you see. Slowly. Imperceptibly.", opacity: 0.5, duration: 12000 },
  { time: 1800, text: "It's been shifting this entire time. You can't trust your eyes.", opacity: 0.6, duration: 15000 },
];

function getRedIntensity(elapsed: number): number {
  if (elapsed < 60) return 0;
  if (elapsed < 180) {
    // Slow start: 0 → 0.02
    const t = (elapsed - 60) / 120;
    return t * 0.02;
  }
  if (elapsed < 300) {
    // Accelerating: 0.02 → 0.06
    const t = (elapsed - 180) / 120;
    return 0.02 + t * 0.04;
  }
  if (elapsed < 600) {
    // Steady: 0.06 → 0.12
    const t = (elapsed - 300) / 300;
    return 0.06 + t * 0.06;
  }
  if (elapsed < 900) {
    // More noticeable: 0.12 → 0.18
    const t = (elapsed - 600) / 300;
    return 0.12 + t * 0.06;
  }
  // Plateau with slight increase: 0.18 → 0.22
  const t = Math.min((elapsed - 900) / 600, 1);
  return 0.18 + t * 0.04;
}

export function SlowCreep() {
  const [elapsed, setElapsed] = useState(0);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [messageOpacity, setMessageOpacity] = useState(0);
  const [flashBlack, setFlashBlack] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const startRef = useRef(Date.now());
  const shownMessages = useRef(new Set<number>());
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(secs);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ambient breathing (very slow oscillation)
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathPhase(Date.now() / 8000); // Very slow cycle
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Message triggers
  useEffect(() => {
    for (const msg of MESSAGES) {
      if (elapsed >= msg.time && !shownMessages.current.has(msg.time)) {
        shownMessages.current.add(msg.time);

        // At 900s, do the flash-black trick
        if (msg.time === 900) {
          setFlashBlack(true);
          setTimeout(() => setFlashBlack(false), 150);
        }

        // Show message
        setCurrentMessage(msg.text);
        setMessageOpacity(msg.opacity);

        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => {
          setCurrentMessage(null);
          setMessageOpacity(0);
        }, msg.duration);
      }
    }
  }, [elapsed]);

  const redIntensity = flashBlack ? 0 : getRedIntensity(elapsed);

  // Add subtle breathing modulation
  const breathMod = Math.sin(breathPhase * Math.PI * 2) * 0.003;
  const finalIntensity = Math.max(0, redIntensity + breathMod);

  // Very subtle — we're tinting, not painting
  // We use a dark red-shifted overlay
  const r = Math.round(finalIntensity * 180);
  const g = Math.round(finalIntensity * 8); // Tiny bit of green to avoid pure neon red
  const b = 0;
  const a = finalIntensity * 0.6; // Keep it subtle

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1, // Below everything else, tinting the black background
      }}
    >
      {/* Red tint overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(${r}, ${g}, ${b}, ${a})`,
          transition: flashBlack ? "none" : "background 2s linear",
          mixBlendMode: "screen",
        }}
      />

      {/* Ambient breathing — very subtle brightness oscillation */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, rgba(${r}, ${g}, ${b}, ${a * 0.3}) 0%, transparent 70%)`,
          transition: "background 2s linear",
        }}
      />

      {/* Corner annotation messages */}
      {currentMessage && (
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: elapsed < 600 ? "6px" : "8px",
            fontFamily: "'Courier New', monospace",
            color: `rgba(255, 0, 64, ${messageOpacity})`,
            letterSpacing: elapsed < 600 ? "3px" : "1.5px",
            textAlign: "center",
            animation: "creep-msg-in 2s ease-out",
            textShadow: `0 0 10px rgba(255, 0, 64, ${messageOpacity * 0.3})`,
            whiteSpace: "nowrap",
          }}
        >
          {currentMessage}
        </div>
      )}

      {/* Tiny status indicator (only visible after the shift has started) */}
      {elapsed > 120 && (
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            opacity: 0.08 + finalIntensity * 0.5,
            transition: "opacity 5s linear",
          }}
        >
          <div
            style={{
              width: "3px",
              height: "3px",
              borderRadius: "50%",
              background: `rgb(${Math.round(100 + finalIntensity * 600)}, 0, 0)`,
              boxShadow: `0 0 ${2 + finalIntensity * 10}px rgba(255, 0, 0, ${finalIntensity})`,
            }}
          />
          <span
            style={{
              fontSize: "5px",
              color: "#330000",
              letterSpacing: "1px",
              fontFamily: "'Courier New', monospace",
            }}
          >
            Δλ {(finalIntensity * 100).toFixed(1)}nm
          </span>
        </div>
      )}

      <style>{`
        @keyframes creep-msg-in {
          0% { opacity: 0; letter-spacing: 8px; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
