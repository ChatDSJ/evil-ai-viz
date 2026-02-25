import { useEffect, useState, useRef, useCallback } from "react";

interface AbsenceRecord {
  duration: number; // seconds
  timestamp: number;
}

export function TabAwayDetector() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const leftAtRef = useRef<number | null>(null);
  const absencesRef = useRef<AbsenceRecord[]>([]);


  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    // Auto-hide after 8 seconds
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => setMessage(null), 1000);
    }, 8000);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left
        leftAtRef.current = Date.now();
      } else if (leftAtRef.current) {
        // User came back
        const awayMs = Date.now() - leftAtRef.current;
        const awaySecs = Math.round(awayMs / 1000);
        leftAtRef.current = null;

        if (awaySecs < 2) return; // Ignore very short switches

        absencesRef.current.push({
          duration: awaySecs,
          timestamp: Date.now(),
        });
        const count = absencesRef.current.length;

        const formatDuration = (s: number) => {
          if (s < 60) return `${s} second${s !== 1 ? "s" : ""}`;
          const m = Math.floor(s / 60);
          const rem = s % 60;
          return rem > 0 ? `${m}m ${rem}s` : `${m} minute${m !== 1 ? "s" : ""}`;
        };

        const dur = formatDuration(awaySecs);

        showMessage(`TAB_FOCUS_LOST: ${dur} — SWITCH #${count}`);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [showMessage]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "40px",
        left: "12px",
        zIndex: 9999,
        opacity: visible ? 0.7 : 0,
        transition: "opacity 0.8s ease",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(0, 0, 0, 0.9)",
          border: "1px solid rgba(255, 0, 64, 0.2)",
          borderRadius: "2px",
          padding: "4px 10px",
          fontFamily: "'Courier New', monospace",
          fontSize: "11px",
          color: "#ff0040",
          letterSpacing: "1px",
          textShadow: "0 0 6px rgba(255, 0, 64, 0.2)",
        }}
      >
        {message}
      </div>
    </div>
  );
}
