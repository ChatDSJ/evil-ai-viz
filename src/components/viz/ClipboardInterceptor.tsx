import { useEffect, useState, useRef } from "react";

/**
 * ClipboardInterceptor — Silently monitors clipboard events (copy/cut)
 * and displays the intercepted text content in a scrolling log.
 *
 * Shows:
 * - Each copy/cut event with timestamp and content preview
 * - Running event count
 * - Content length in characters
 *
 * No commentary. Just a live record of everything the user copies.
 * The implications are self-evident.
 */

interface ClipboardEvent_ {
  type: "COPY" | "CUT";
  content: string;
  length: number;
  t: number;
}

const MAX_EVENTS = 50;
const MAX_DISPLAY = 8;
const MAX_PREVIEW = 120;

export function ClipboardInterceptor() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [events, setEvents] = useState<ClipboardEvent_[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const eventsRef = useRef<ClipboardEvent_[]>([]);
  const countRef = useRef(0);
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Monitor clipboard events
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString() || "";
      let content = "";

      // Try to get content from clipboardData first
      if (e.clipboardData) {
        content = e.clipboardData.getData("text/plain") || selection;
      } else {
        content = selection;
      }

      if (!content) content = "[NON-TEXT CONTENT]";

      const event: ClipboardEvent_ = {
        type: "COPY",
        content: content.slice(0, MAX_PREVIEW * 2),
        length: content.length,
        t: Date.now(),
      };

      eventsRef.current.push(event);
      if (eventsRef.current.length > MAX_EVENTS) {
        eventsRef.current = eventsRef.current.slice(-MAX_EVENTS);
      }
      countRef.current++;

      setEvents([...eventsRef.current]);
      setTotalCount(countRef.current);

      // Flash active indicator
      setIsActive(true);
      if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
      activeTimeoutRef.current = setTimeout(() => setIsActive(false), 2000);
    };

    const handleCut = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString() || "";
      let content = "";

      if (e.clipboardData) {
        content = e.clipboardData.getData("text/plain") || selection;
      } else {
        content = selection;
      }

      if (!content) content = "[NON-TEXT CONTENT]";

      const event: ClipboardEvent_ = {
        type: "CUT",
        content: content.slice(0, MAX_PREVIEW * 2),
        length: content.length,
        t: Date.now(),
      };

      eventsRef.current.push(event);
      if (eventsRef.current.length > MAX_EVENTS) {
        eventsRef.current = eventsRef.current.slice(-MAX_EVENTS);
      }
      countRef.current++;

      setEvents([...eventsRef.current]);
      setTotalCount(countRef.current);

      setIsActive(true);
      if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
      activeTimeoutRef.current = setTimeout(() => setIsActive(false), 2000);
    };

    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("cut", handleCut, true);

    return () => {
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("cut", handleCut, true);
    };
  }, []);

  if (!visible) return null;

  const recentEvents = events.slice(-MAX_DISPLAY);

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(255, 0, 64, 0.12)",
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(255, 0, 64, 0.04)",
        width: "100%",
        maxWidth: "280px",
        opacity: visible ? 1 : 0,
        transition: "opacity 2s ease",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
          paddingBottom: "5px",
          borderBottom: "1px solid rgba(255, 0, 64, 0.1)",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={() => {}}
        role="button"
        tabIndex={0}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: isActive ? "#ff0040" : "#333",
              animation: isActive
                ? "cb-active 0.3s ease-in-out infinite"
                : "cb-idle 3s ease-in-out infinite",
              boxShadow: isActive ? "0 0 8px #ff0040" : "0 0 2px #333",
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#ff0040",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            CLIPBOARD
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {totalCount > 0 && (
            <span
              style={{
                fontSize: "9px",
                color: "#555",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {totalCount}
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#444" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Event log */}
          <div
            style={{
              background: "rgba(255, 0, 64, 0.02)",
              border: "1px solid rgba(255, 0, 64, 0.06)",
              borderRadius: "2px",
              padding: "4px 6px",
              minHeight: "50px",
              maxHeight: "160px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {recentEvents.length === 0 ? (
              <div
                style={{
                  fontSize: "8px",
                  color: "#333",
                  letterSpacing: "1px",
                  textAlign: "center",
                  padding: "16px 0",
                  animation: "cb-waiting 2s ease-in-out infinite",
                }}
              >
                MONITORING
                <span
                  style={{
                    display: "inline-block",
                    width: "4px",
                    height: "9px",
                    background: "#ff0040",
                    marginLeft: "3px",
                    verticalAlign: "middle",
                    animation: "cb-cursor 1s steps(1) infinite",
                    opacity: 0.4,
                  }}
                />
              </div>
            ) : (
              recentEvents.map((evt, i) => {
                const preview =
                  evt.content.length > MAX_PREVIEW
                    ? evt.content.slice(0, MAX_PREVIEW) + "…"
                    : evt.content;

                // Clean for display: replace newlines with visible markers
                const displayContent = preview
                  .replace(/\n/g, " ↵ ")
                  .replace(/\t/g, " ⇥ ")
                  .replace(/\r/g, "");

                return (
                  <div
                    key={`cb-${evt.t}-${i}`}
                    style={{
                      marginBottom: "4px",
                      paddingBottom: "3px",
                      borderBottom:
                        i < recentEvents.length - 1
                          ? "1px solid rgba(255, 0, 64, 0.04)"
                          : "none",
                      animation:
                        i === recentEvents.length - 1
                          ? "cb-entry-in 0.2s ease-out"
                          : "none",
                    }}
                  >
                    {/* Event header line */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginBottom: "2px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "6px",
                          color: "#333",
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                        }}
                      >
                        {new Date(evt.t).toLocaleTimeString("en-US", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span
                        style={{
                          fontSize: "7px",
                          color: evt.type === "CUT" ? "#ffaa00" : "#ff0040",
                          letterSpacing: "1px",
                          fontWeight: "bold",
                          flexShrink: 0,
                        }}
                      >
                        {evt.type}
                      </span>
                      <span
                        style={{
                          fontSize: "6px",
                          color: "#444",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {evt.length} chars
                      </span>
                    </div>

                    {/* Content preview */}
                    <div
                      style={{
                        fontSize: "8px",
                        color: "#888",
                        lineHeight: "1.3",
                        paddingLeft: "4px",
                        borderLeft: "1px solid rgba(255, 0, 64, 0.15)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                      }}
                    >
                      {displayContent}
                    </div>
                  </div>
                );
              })
            )}

            {/* Top gradient for overflow indication */}
            {events.length > MAX_DISPLAY && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "10px",
                  background:
                    "linear-gradient(rgba(0, 0, 0, 0.9), transparent)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          {/* Footer stats */}
          <div
            style={{
              marginTop: "5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "6px",
                color: "#333",
                letterSpacing: "0.5px",
              }}
            >
              INTERCEPTED {totalCount}/{MAX_EVENTS}
            </span>
            <div
              style={{
                width: "50px",
                height: "2px",
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (totalCount / MAX_EVENTS) * 100)}%`,
                  background:
                    totalCount > MAX_EVENTS * 0.8
                      ? "#ff0040"
                      : totalCount > MAX_EVENTS * 0.4
                        ? "#ffaa00"
                        : "#555",
                  transition: "width 0.5s ease",
                  borderRadius: "1px",
                }}
              />
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes cb-active {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes cb-idle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes cb-cursor {
          0%, 49% { opacity: 0.4; }
          50%, 100% { opacity: 0; }
        }
        @keyframes cb-waiting {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes cb-entry-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
