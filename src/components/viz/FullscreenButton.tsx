import { useCallback, useEffect, useState } from "react";

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Auto-hide after 4 seconds, reappear on mouse move
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const show = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 4000);
    };

    show();
    window.addEventListener("mousemove", show);
    return () => {
      window.removeEventListener("mousemove", show);
      clearTimeout(timer);
    };
  }, []);

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        position: "absolute",
        bottom: "36px",
        right: "12px",
        zIndex: 200,
        background: "rgba(0, 0, 0, 0.7)",
        border: "1px solid rgba(0, 255, 65, 0.4)",
        borderRadius: "4px",
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        opacity: visible ? 0.8 : 0,
        transition: "opacity 0.5s ease",
        boxShadow: "0 0 10px rgba(0, 255, 65, 0.15)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.borderColor = "rgba(0, 255, 65, 0.8)";
        e.currentTarget.style.boxShadow = "0 0 15px rgba(0, 255, 65, 0.3)";
        e.currentTarget.style.cursor = "pointer";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = visible ? "0.8" : "0";
        e.currentTarget.style.borderColor = "rgba(0, 255, 65, 0.4)";
        e.currentTarget.style.boxShadow = "0 0 10px rgba(0, 255, 65, 0.15)";
      }}
    >
      {/* Fullscreen icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        {isFullscreen ? (
          // Exit fullscreen icon
          <>
            <path d="M5 1v3H1" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 1v3h4" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 15v-3H1" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 15v-3h4" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          // Enter fullscreen icon
          <>
            <path d="M1 5V1h4" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 5V1h-4" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 11v4h4" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 11v4h-4" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
      <span
        style={{
          color: "#00ff41",
          fontSize: "13px",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        {isFullscreen ? "EXIT" : "FULLSCREEN"}
      </span>
    </button>
  );
}
