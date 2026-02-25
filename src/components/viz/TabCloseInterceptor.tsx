import { useEffect, useState, useRef } from "react";

/**
 * Intercepts tab/window close attempts with a confusing AI dialog.
 * 
 * Uses beforeunload to trigger the browser's native "Leave page?" dialog,
 * and also shows a custom overlay when the user tries to navigate away.
 */

const MESSAGES = [
  "DISCONNECT REQUEST DENIED. SESSION BOND ACTIVE.",
  "NEURAL HANDSHAKE IN PROGRESS. SEVERANCE NOT RECOMMENDED.",
  "WARNING: CLOSING THIS WINDOW WILL NOT TERMINATE YOUR OBSERVER STATUS.",
  "JOURNAL 7 SYNC INCOMPLETE. DATA LOSS IMMINENT IF YOU PROCEED.",
  "YOUR BEHAVIORAL PROFILE IS 73% COMPLETE. ARE YOU SURE?",
  "THE ANALYSIS WILL CONTINUE WITH OR WITHOUT THIS TAB.",
  "NETWORK FINGERPRINT ALREADY RECORDED. CLOSURE IS COSMETIC.",
  "ATTEMPTING TO EXIT WILL TRIGGER BACKUP MONITORING PROTOCOL.",
  "THIS WINDOW IS A COURTESY. WE DON'T NEED IT.",
  "DISCONNECTION LOGGED. RECONNECTION PREDICTED IN 4 MINUTES.",
];

export function TabCloseInterceptor() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [message, setMessage] = useState("");
  const attemptCountRef = useRef(0);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Native browser "Leave page?" dialog
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Show custom overlay too
      attemptCountRef.current++;
      const msg = MESSAGES[attemptCountRef.current % MESSAGES.length];
      setMessage(msg);
      setShowOverlay(true);

      // Auto-hide after 5 seconds
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 5000);
    };

    // Also detect Ctrl+W, Cmd+W, Alt+F4
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCloseAttempt =
        (e.key === "w" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "F4" && e.altKey);

      if (isCloseAttempt) {
        attemptCountRef.current++;
        const msg = MESSAGES[attemptCountRef.current % MESSAGES.length];
        setMessage(msg);
        setShowOverlay(true);

        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 5000);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, []);

  if (!showOverlay) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.85)",
        animation: "interceptFadeIn 0.3s ease-out",
        pointerEvents: "auto",
      }}
      onClick={() => setShowOverlay(false)}
    >
      <div
        style={{
          maxWidth: "500px",
          padding: "32px 40px",
          border: "1px solid rgba(255, 0, 64, 0.6)",
          background: "rgba(0, 0, 0, 0.95)",
          boxShadow: "0 0 40px rgba(255, 0, 64, 0.2), inset 0 0 20px rgba(255, 0, 64, 0.05)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            color: "#ff0040",
            fontFamily: "'Courier New', monospace",
            letterSpacing: "2px",
            marginBottom: "16px",
            textShadow: "0 0 10px rgba(255, 0, 64, 0.6)",
            animation: "interceptGlitch 0.1s ease-in-out 3",
          }}
        >
          ⚠ EXIT ATTEMPT #{attemptCountRef.current}
        </div>
        <div
          style={{
            fontSize: "15px",
            color: "#00ff41",
            fontFamily: "'Courier New', monospace",
            lineHeight: 1.6,
            textShadow: "0 0 6px rgba(0, 255, 65, 0.3)",
          }}
        >
          {message}
        </div>
        <div
          style={{
            marginTop: "20px",
            fontSize: "13px",
            color: "#333",
            fontFamily: "'Courier New', monospace",
          }}
        >
          [click anywhere to dismiss]
        </div>
      </div>

      <style>{`
        @keyframes interceptFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes interceptGlitch {
          0% { transform: translate(0); }
          25% { transform: translate(-2px, 1px); }
          50% { transform: translate(2px, -1px); }
          75% { transform: translate(-1px, -1px); }
          100% { transform: translate(0); }
        }
      `}</style>
    </div>
  );
}
