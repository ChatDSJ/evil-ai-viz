import { useEffect, useState } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface Props {
  visitor: VisitorInfo;
}

export function VisitorInfoBar({ visitor }: Props) {
  const [visible, setVisible] = useState(false);
  const [revealed, setRevealed] = useState(0);

  // Dramatic reveal: show items one by one
  useEffect(() => {
    if (!visitor.loaded) return;

    const showTimer = setTimeout(() => setVisible(true), 1500);
    const revealTimers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < 5; i++) {
      revealTimers.push(
        setTimeout(() => setRevealed(i + 1), 2000 + i * 700),
      );
    }

    return () => {
      clearTimeout(showTimer);
      revealTimers.forEach(clearTimeout);
    };
  }, [visitor.loaded]);

  if (!visible) return null;

  const items = [
    { label: "TARGET IP", value: visitor.ip, color: "#ff0040" },
    {
      label: "LOCATION",
      value: `${visitor.city}, ${visitor.region}`,
      color: "#ff6600",
    },
    { label: "ISP", value: visitor.isp.slice(0, 24), color: "#00d4ff" },
    {
      label: "SYSTEM",
      value: visitor.osVersion || visitor.os.toUpperCase(),
      color: "#ff00ff",
    },
    { label: "BROWSER", value: visitor.browser, color: "#00ff41" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: "48px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "16px",
        padding: "6px 14px",
        background: "rgba(0, 0, 0, 0.85)",
        border: "1px solid rgba(255, 0, 64, 0.4)",
        borderRadius: "4px",
        boxShadow: "0 0 20px rgba(255, 0, 64, 0.15)",
        animation: "fadeSlideDown 0.5s ease",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            textAlign: "center",
            minWidth: "80px",
            opacity: i < revealed ? 1 : 0,
            transform: i < revealed ? "translateY(0)" : "translateY(-8px)",
            transition: "all 0.4s ease",
          }}
        >
          <div
            style={{
              fontSize: "7px",
              color: "#666",
              letterSpacing: "1px",
              marginBottom: "1px",
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "bold",
              color: item.color,
              fontFamily: "'Courier New', monospace",
              textShadow: `0 0 8px ${item.color}50`,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "160px",
            }}
          >
            {i < revealed ? item.value : "███████"}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes blink-dot {
          0%, 40% { opacity: 1; }
          50%, 90% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
