import { useEffect, useState, useRef } from "react";

/**
 * KeystreamPanel — Silently captures every keystroke the user makes
 * while the page is focused and displays them in a scrolling terminal.
 *
 * Shows:
 * - Raw keystroke stream in real-time
 * - Total key count
 * - Keys per minute rate
 * - Special keys rendered as labeled tokens (⇧SHIFT, ⌫BACK, etc.)
 *
 * No commentary. No explanation. Just a live feed of their keystrokes.
 * The implications are self-evident.
 */

interface KeyEvent {
  key: string;
  code: string;
  display: string;
  t: number;
  modifiers: string[];
}

const SPECIAL_KEY_MAP: Record<string, string> = {
  Backspace: "⌫",
  Delete: "⌦DEL",
  Enter: "⏎",
  Tab: "⇥TAB",
  Escape: "ESC",
  " ": "␣",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Shift: "⇧",
  Control: "⌃",
  Alt: "⌥",
  Meta: "⌘",
  CapsLock: "⇪CAPS",
  NumLock: "NUM",
  ScrollLock: "SCROLL",
  Home: "HOME",
  End: "END",
  PageUp: "PGUP",
  PageDown: "PGDN",
  Insert: "INS",
  PrintScreen: "PRTSC",
  Pause: "PAUSE",
  ContextMenu: "MENU",
  F1: "F1", F2: "F2", F3: "F3", F4: "F4",
  F5: "F5", F6: "F6", F7: "F7", F8: "F8",
  F9: "F9", F10: "F10", F11: "F11", F12: "F12",
};

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

const MAX_BUFFER = 200;
const MAX_DISPLAY_LINES = 12;

export function KeystreamPanel() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [keyEvents, setKeyEvents] = useState<KeyEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [kpm, setKpm] = useState(0);
  const [isCapturing, setIsCapturing] = useState(true);

  const eventsRef = useRef<KeyEvent[]>([]);
  const countRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Capture keystrokes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture pure modifier keys as individual events
      if (MODIFIER_KEYS.has(e.key)) return;

      const now = Date.now();
      lastActivityRef.current = now;

      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push("⌃");
      if (e.altKey) modifiers.push("⌥");
      if (e.metaKey) modifiers.push("⌘");
      if (e.shiftKey && !SPECIAL_KEY_MAP[e.key]) modifiers.push("⇧");

      const display = SPECIAL_KEY_MAP[e.key] || e.key;

      const event: KeyEvent = {
        key: e.key,
        code: e.code,
        display,
        t: now,
        modifiers,
      };

      eventsRef.current.push(event);
      if (eventsRef.current.length > MAX_BUFFER) {
        eventsRef.current = eventsRef.current.slice(-MAX_BUFFER);
      }

      countRef.current++;
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // Update display at 4fps
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 60000; // minutes
      const currentKpm = elapsed > 0.05 ? Math.round(countRef.current / elapsed) : 0;

      setKeyEvents([...eventsRef.current]);
      setTotalCount(countRef.current);
      setKpm(currentKpm);

      // Detect if still capturing (has there been activity in last 5s?)
      setIsCapturing(now - lastActivityRef.current < 5000);
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  // Group keystrokes into display lines (by time proximity)
  const displayLines: { text: string; tokens: { display: string; modifiers: string[]; isSpecial: boolean }[]; t: number }[] = [];
  const recent = keyEvents.slice(-80);
  let currentLine: typeof displayLines[0] | null = null;

  for (const evt of recent) {
    const isSpecial = !!SPECIAL_KEY_MAP[evt.key];
    const token = { display: evt.display, modifiers: evt.modifiers, isSpecial };

    if (!currentLine || evt.t - currentLine.t > 2000 || (isSpecial && evt.key === "Enter")) {
      if (currentLine) displayLines.push(currentLine);
      currentLine = { text: "", tokens: [token], t: evt.t };
    } else {
      currentLine.tokens.push(token);
    }
    currentLine.text += evt.display;
  }
  if (currentLine) displayLines.push(currentLine);

  const visibleLines = displayLines.slice(-MAX_DISPLAY_LINES);

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(0, 255, 65, 0.12)",
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(0, 255, 65, 0.04)",
        width: "100%",
        maxWidth: "260px",
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
          borderBottom: "1px solid rgba(0, 255, 65, 0.1)",
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
              background: isCapturing ? "#00ff41" : "#444",
              animation: isCapturing ? "ks-pulse 0.5s ease-in-out infinite" : "ks-idle 3s ease-in-out infinite",
              boxShadow: isCapturing ? "0 0 6px #00ff41" : "0 0 2px #444",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#00ff41",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            KEYSTREAM
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
          {/* Stats row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
              padding: "2px 0",
            }}
          >
            <div>
              <span style={{ fontSize: "6px", color: "#444", letterSpacing: "1px" }}>
                CAPTURED
              </span>
              <div style={{ fontSize: "12px", color: "#00ff41", fontVariantNumeric: "tabular-nums" }}>
                {totalCount}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "6px", color: "#444", letterSpacing: "1px" }}>
                KEYS/MIN
              </span>
              <div style={{ fontSize: "12px", color: kpm > 60 ? "#ffaa00" : "#555", fontVariantNumeric: "tabular-nums" }}>
                {kpm}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "6px", color: "#444", letterSpacing: "1px" }}>
                STATUS
              </span>
              <div style={{ fontSize: "10px", color: isCapturing ? "#00ff41" : "#444", letterSpacing: "1px" }}>
                {isCapturing ? "LIVE" : "IDLE"}
              </div>
            </div>
          </div>

          {/* Keystroke stream */}
          <div
            style={{
              background: "rgba(0, 255, 65, 0.02)",
              border: "1px solid rgba(0, 255, 65, 0.06)",
              borderRadius: "2px",
              padding: "4px 6px",
              minHeight: "60px",
              maxHeight: "120px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {visibleLines.length === 0 ? (
              <div
                style={{
                  fontSize: "8px",
                  color: "#333",
                  letterSpacing: "1px",
                  textAlign: "center",
                  padding: "20px 0",
                  animation: "ks-waiting 2s ease-in-out infinite",
                }}
              >
                AWAITING INPUT
                <span
                  style={{
                    display: "inline-block",
                    width: "5px",
                    height: "10px",
                    background: "#00ff41",
                    marginLeft: "2px",
                    verticalAlign: "middle",
                    animation: "ks-cursor 1s steps(1) infinite",
                    opacity: 0.6,
                  }}
                />
              </div>
            ) : (
              visibleLines.map((line, lineIdx) => (
                <div
                  key={`line-${line.t}-${lineIdx}`}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1px",
                    marginBottom: "2px",
                    animation: lineIdx === visibleLines.length - 1 ? "ks-line-in 0.15s ease-out" : "none",
                  }}
                >
                  {/* Timestamp */}
                  <span
                    style={{
                      fontSize: "6px",
                      color: "#333",
                      marginRight: "4px",
                      lineHeight: "14px",
                      fontVariantNumeric: "tabular-nums",
                      flexShrink: 0,
                    }}
                  >
                    {new Date(line.t).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  {line.tokens.map((token, i) => (
                    <span
                      key={`tok-${i}-${token.display}`}
                      style={{
                        fontSize: token.isSpecial ? "7px" : "9px",
                        color: token.isSpecial ? "#00aa33" : "#00ff41",
                        background: token.isSpecial ? "rgba(0, 255, 65, 0.06)" : "transparent",
                        border: token.isSpecial ? "1px solid rgba(0, 255, 65, 0.08)" : "none",
                        borderRadius: token.isSpecial ? "2px" : "0",
                        padding: token.isSpecial ? "0px 3px" : "0",
                        lineHeight: "14px",
                        letterSpacing: token.isSpecial ? "0.5px" : "0",
                      }}
                    >
                      {token.modifiers.length > 0 && (
                        <span style={{ fontSize: "6px", color: "#ffaa00", marginRight: "1px" }}>
                          {token.modifiers.join("")}
                        </span>
                      )}
                      {token.display}
                    </span>
                  ))}
                </div>
              ))
            )}

            {/* Scrolling indicator gradient at top */}
            {displayLines.length > MAX_DISPLAY_LINES && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "12px",
                  background: "linear-gradient(rgba(0, 0, 0, 0.9), transparent)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          {/* Buffer indicator */}
          <div
            style={{
              marginTop: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "6px", color: "#333", letterSpacing: "0.5px" }}>
              BUFFER {keyEvents.length}/{MAX_BUFFER}
            </span>
            <div
              style={{
                width: "60px",
                height: "2px",
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(keyEvents.length / MAX_BUFFER) * 100}%`,
                  background: keyEvents.length > MAX_BUFFER * 0.8
                    ? "#ff0040"
                    : keyEvents.length > MAX_BUFFER * 0.5
                    ? "#ffaa00"
                    : "#00ff41",
                  transition: "width 0.5s ease",
                  borderRadius: "1px",
                }}
              />
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes ks-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes ks-idle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ks-cursor {
          0%, 49% { opacity: 0.6; }
          50%, 100% { opacity: 0; }
        }
        @keyframes ks-waiting {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes ks-line-in {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
