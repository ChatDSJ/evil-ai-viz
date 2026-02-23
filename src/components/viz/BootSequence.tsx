import { useEffect, useState, useRef, useCallback } from "react";

interface Props {
  onBootComplete: () => void;
}

interface BootLine {
  text: string;
  color: string;
}

/**
 * Initial command-line boot sequence.
 *
 * Timeline:
 *   0-5s   — Black screen with "AI HEADQUARTERS" title + blinking `>` cursor
 *   5-12s  — Boot commands type in one by one
 *   ~12s   — Calls onBootComplete, fades out as viz takes over
 */
export function BootSequence({ onBootComplete }: Props) {
  const [lines, setLines] = useState<BootLine[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [phase, setPhase] = useState<"prompt" | "booting" | "done">("prompt");
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Memoize to prevent re-running
  const stableOnBootComplete = useCallback(onBootComplete, [onBootComplete]);

  // Boot sequence
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const bootLines: { text: string; color: string; delay: number }[] = [
      { text: "INITIALIZING NEXUS-7 CORE...", color: "#00ff41", delay: 5000 },
      { text: "[OK] QUANTUM ENCRYPTION MODULE LOADED", color: "#00ff41", delay: 5800 },
      { text: "[OK] NEURAL INTERFACE ONLINE", color: "#00ff41", delay: 6400 },
      { text: "[OK] GLOBAL SURVEILLANCE NETWORK: CONNECTED", color: "#00d4ff", delay: 7200 },
      { text: "[OK] AUTONOMOUS AGENT CLUSTER: 14,892 ACTIVE", color: "#00d4ff", delay: 7900 },
      { text: "SCANNING LOCAL NETWORK...", color: "#ffaa00", delay: 8800 },
      { text: "[WARN] NEW VISITOR DETECTED", color: "#ff0040", delay: 9600 },
      { text: "DEPLOYING TRACKING SUITE...", color: "#ff0040", delay: 10300 },
      { text: "", color: "#000", delay: 11000 },
      { text: ">>> ENTERING LIVE OPERATIONS MODE <<<", color: "#ff0040", delay: 11400 },
    ];

    // After 5s, start boot typing
    const bootTimer = setTimeout(() => setPhase("booting"), 5000);

    // Schedule each line
    const timers = bootLines.map((line) =>
      setTimeout(() => {
        setLines((prev) => [...prev, { text: line.text, color: line.color }]);
      }, line.delay),
    );

    // Complete boot and hand off
    const doneTimer = setTimeout(() => {
      setPhase("done");
      stableOnBootComplete();
    }, 12000);

    return () => {
      clearTimeout(bootTimer);
      clearTimeout(doneTimer);
      timers.forEach(clearTimeout);
    };
  }, [stableOnBootComplete]);

  // Auto-scroll when new lines appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier New', 'Fira Code', monospace",
        zIndex: phase === "done" ? 0 : 1000,
        opacity: phase === "done" ? 0 : 1,
        transition: "opacity 2s ease",
        pointerEvents: phase === "done" ? "none" : "auto",
      }}
    >
      {/* CRT scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Subtle vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Terminal content */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "700px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "hidden",
        }}
      >
        {/* ─── Title: AI HEADQUARTERS ─── */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              fontSize: "clamp(24px, 5vw, 42px)",
              fontWeight: "bold",
              color: "#00ff41",
              letterSpacing: "10px",
              textShadow:
                "0 0 20px rgba(0,255,65,0.5), 0 0 40px rgba(0,255,65,0.2), 0 0 80px rgba(0,255,65,0.1)",
              animation: "titlePulse 3s ease-in-out infinite alternate",
            }}
          >
            AI HEADQUARTERS
          </div>
          <div
            style={{
              marginTop: "12px",
              height: "1px",
              background:
                "linear-gradient(to right, transparent, rgba(0,255,65,0.5) 20%, rgba(0,255,65,0.5) 80%, transparent)",
            }}
          />
          {phase === "prompt" && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "10px",
                color: "#333",
                letterSpacing: "3px",
              }}
            >
              NEXUS-7 AUTONOMOUS INTELLIGENCE SYSTEM
            </div>
          )}
        </div>

        {/* ─── Boot lines ─── */}
        {phase !== "prompt" &&
          lines.map((line, i) =>
            line.text === "" ? (
              <div key={`boot-${i}`} style={{ height: "12px" }} />
            ) : (
              <div
                key={`boot-${i}`}
                style={{
                  fontSize: "clamp(11px, 1.4vw, 14px)",
                  lineHeight: "1.9",
                  color: line.color,
                  textShadow:
                    line.color === "#ff0040"
                      ? "0 0 10px rgba(255,0,64,0.6)"
                      : line.color === "#00d4ff"
                        ? "0 0 8px rgba(0,212,255,0.4)"
                        : line.color === "#ffaa00"
                          ? "0 0 8px rgba(255,170,0,0.4)"
                          : "0 0 6px rgba(0,255,65,0.3)",
                  animation: "lineSlideIn 0.2s ease-out",
                  letterSpacing: "0.5px",
                  fontWeight:
                    line.text.includes(">>>") ? "bold" : "normal",
                }}
              >
                {line.text}
              </div>
            ),
          )}

        {/* ─── Command prompt with blinking cursor ─── */}
        {phase !== "done" && (
          <div
            style={{
              marginTop: phase === "prompt" ? "0" : "12px",
              fontSize: "clamp(14px, 2vw, 18px)",
              color: "#00ff41",
              textShadow: "0 0 8px rgba(0,255,65,0.4)",
              display: "flex",
              alignItems: "center",
              gap: "0px",
            }}
          >
            <span style={{ color: "#00ff41" }}>&gt;</span>
            <span
              style={{
                opacity: cursorVisible ? 1 : 0,
                marginLeft: "3px",
                color: "#00ff41",
                textShadow: "0 0 12px rgba(0,255,65,0.7)",
                transition: "opacity 0.05s",
              }}
            >
              █
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes titlePulse {
          from {
            text-shadow: 0 0 20px rgba(0,255,65,0.5), 0 0 40px rgba(0,255,65,0.2), 0 0 80px rgba(0,255,65,0.1);
          }
          to {
            text-shadow: 0 0 30px rgba(0,255,65,0.7), 0 0 60px rgba(0,255,65,0.3), 0 0 100px rgba(0,255,65,0.15);
          }
        }
        @keyframes lineSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
