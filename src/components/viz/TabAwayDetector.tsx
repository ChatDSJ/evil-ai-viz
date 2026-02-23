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
  const [absenceCount, setAbsenceCount] = useState(0);

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
        setAbsenceCount(count);

        const formatDuration = (s: number) => {
          if (s < 60) return `${s} second${s !== 1 ? "s" : ""}`;
          const m = Math.floor(s / 60);
          const rem = s % 60;
          return rem > 0 ? `${m}m ${rem}s` : `${m} minute${m !== 1 ? "s" : ""}`;
        };

        const dur = formatDuration(awaySecs);

        // Escalating responses
        const messages = [
          // First time
          `WELCOME BACK. You were gone for ${dur}. We noticed.`,
          // Second
          `There you are. ${dur} away. We tracked your tab switches.`,
          // Third
          `Again? ${dur} this time. You keep leaving but you keep coming back.`,
          // Fourth
          `${dur}. That makes ${count} times you've tried to look away. It doesn't help.`,
          // Fifth+
          `Absence #${count}: ${dur}. Your avoidance pattern has been catalogued.`,
        ];

        const msgIndex = Math.min(count - 1, messages.length - 1);
        showMessage(messages[msgIndex]);
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
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: "opacity 1s ease",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(0, 0, 0, 0.95)",
          border: "1px solid rgba(255, 0, 64, 0.6)",
          borderRadius: "4px",
          padding: "20px 32px",
          boxShadow:
            "0 0 40px rgba(255, 0, 64, 0.2), 0 0 80px rgba(255, 0, 64, 0.1)",
          textAlign: "center",
          maxWidth: "500px",
        }}
      >
        {/* Blinking eye */}
        <div
          style={{
            fontSize: "28px",
            marginBottom: "12px",
            animation: "blink-eye 3s infinite",
          }}
        >
          👁️
        </div>

        <div
          style={{
            fontSize: "11px",
            fontFamily: "'Courier New', monospace",
            color: "#ff0040",
            letterSpacing: "1.5px",
            lineHeight: "1.6",
            textShadow: "0 0 10px rgba(255, 0, 64, 0.3)",
          }}
        >
          {message}
        </div>

        {absenceCount > 2 && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "8px",
              color: "#444",
              letterSpacing: "1px",
            }}
          >
            TOTAL TAB SWITCHES LOGGED: {absenceCount}
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink-eye {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
      `}</style>
    </div>
  );
}
