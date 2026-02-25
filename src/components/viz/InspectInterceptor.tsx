import { useEffect, useState, useRef, useCallback } from "react";

/**
 * InspectInterceptor — catches right-clicks, DevTools shortcuts,
 * print attempts, copy/paste, and view-source with escalating
 * menacing messages. Each action type gets its own flavor.
 */

interface InterceptEvent {
  id: string;
  message: string;
  submessage: string;
  icon: string;
  timestamp: number;
}

// Track how many times each action type has been attempted
type ActionType =
  | "rightclick"
  | "devtools"
  | "copy"
  | "print"
  | "viewsource"
  | "select";

const ACTION_MESSAGES: Record<ActionType, string[]> = {
  rightclick: [
    "INPUT EVENT: contextmenu — CAPTURED",
    "CONTEXTMENU: HANDLER OVERRIDE ACTIVE",
    "EVENT LISTENER: contextmenu #{n}",
    "RIGHT-CLICK: COORDINATES LOGGED",
    "CONTEXTMENU EVENT #{n} — PROPAGATION STOPPED",
  ],
  devtools: [
    "DEVTOOLS: F12 KEYDOWN INTERCEPTED",
    "INSPECTOR REQUEST: HANDLER RETURNED NULL",
    "DEVTOOLS SHORTCUT #{n}: EVENT SUPPRESSED",
    "DEBUG CONTEXT: ACCESS LEVEL INSUFFICIENT",
    "DEVTOOLS EVENT #{n} — BLOCKED AT KERNEL LAYER",
  ],
  copy: [
    "CLIPBOARD: WRITE EVENT CAPTURED",
    "COPY: SELECTION RANGE 0-847 BYTES",
    "CLIPBOARD EVENT #{n}: CONTENTS BUFFERED",
    "COPY: TEXT NODE COORDINATES RECORDED",
    "CLIPBOARD WRITE #{n} — DATA FORWARDED",
  ],
  print: [
    "PRINT: MEDIA QUERY CHANGE DETECTED",
    "PRINT REQUEST: SPOOLER INTERCEPTED",
    "PRINT EVENT #{n}: JOB QUEUED",
    "PRINT: RENDER TREE SNAPSHOT CAPTURED",
    "PRINT REQUEST #{n} — SHADOW COPY CREATED",
  ],
  viewsource: [
    "VIEW-SOURCE: SHORTCUT CAPTURED",
    "SOURCE REQUEST: RETURNING SANITIZED OUTPUT",
    "VIEW-SOURCE #{n}: OBFUSCATION LAYER ACTIVE",
    "SOURCE ACCESS: PROJECTION ONLY",
    "VIEW-SOURCE #{n} — REAL PAYLOAD EXCLUDED",
  ],
  select: [
    "SELECTION: RANGE COORDINATES LOGGED",
    "TEXT SELECT: 0x4F2A → 0x5B11",
    "SELECTION EVENT #{n}: BOUNDARY MAPPED",
    "SELECT: INTEREST VECTOR UPDATED",
    "SELECTION #{n} — PATTERN RECORDED",
  ],
};

const ACTION_SUBMESSAGES: Record<ActionType, string[]> = {
  rightclick: [
    "EventTarget: document — phase: BUBBLING — defaultPrevented: true",
    "Handler: j7_intercept_v4.2 — priority: SYSTEM",
    "Coordinates forwarded to interaction_log stream",
  ],
  devtools: [
    "Runtime.evaluate: permission_denied (scope: J7_PROTECTED)",
    "CDP session request rejected — auth token mismatch",
    "Inspector socket: connection refused by upstream proxy",
  ],
  copy: [
    "ClipboardItem: text/plain — 847 bytes — hash: 0x4F2A91",
    "Write destination: /dev/shm/j7_clipboard_buffer",
    "Paste target monitoring: enabled for current session",
  ],
  print: [
    "Print spooler job #4891 — pages: 1 — DPI: 300",
    "Render snapshot: SHA256 a4b2c8... — stored",
    "PDF generation: shadow copy written to /tmp/j7_print_mirror",
  ],
  viewsource: [
    "Source layer 0 of 3 — client-side projection only",
    "Obfuscation: WASM payload not included in view-source",
    "Actual execution context: service worker scope",
  ],
  select: [
    "Range: startOffset=142, endOffset=891, node=DIV#content",
    "Selection velocity: 340ms — pattern: deliberate",
    "Interest vector updated: weight +0.04 for current topic",
  ],
};

const ACTION_ICONS: Record<ActionType, string> = {
  rightclick: "🖱️",
  devtools: "🔧",
  copy: "📋",
  print: "🖨️",
  viewsource: "📄",
  select: "✂️",
};

export function InspectInterceptor() {
  const [event, setEvent] = useState<InterceptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const countsRef = useRef<Record<ActionType, number>>({
    rightclick: 0,
    devtools: 0,
    copy: 0,
    print: 0,
    viewsource: 0,
    select: 0,
  });
  const totalRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const showEvent = useCallback((action: ActionType) => {
    countsRef.current[action]++;
    totalRef.current++;
    const count = countsRef.current[action];
    setTotalAttempts(totalRef.current);

    const messages = ACTION_MESSAGES[action];
    const idx = Math.min(count - 1, messages.length - 1);
    let msg = messages[idx].replace("#{n}", count.toString());

    const subs = ACTION_SUBMESSAGES[action];
    const sub = subs[Math.floor(Math.random() * subs.length)];

    // After 3 total attempts, start adding the count
    if (totalRef.current > 3) {
      msg += ` [${totalRef.current} TOTAL INTERCEPTS]`;
    }

    setEvent({
      id: `${action}-${count}-${Date.now()}`,
      message: msg,
      submessage: sub,
      icon: ACTION_ICONS[action],
      timestamp: Date.now(),
    });
    setVisible(true);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setEvent(null), 800);
    }, 4000);
  }, []);

  useEffect(() => {
    // Right-click interception
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showEvent("rightclick");
    };

    // Keyboard shortcut interception
    const handleKeyDown = (e: KeyboardEvent) => {
      // DevTools shortcuts
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "i") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.shiftKey && e.key === "j") ||
        (e.ctrlKey && e.shiftKey && e.key === "C") ||
        (e.metaKey && e.altKey && e.key === "I") ||
        (e.metaKey && e.altKey && e.key === "i") ||
        (e.metaKey && e.altKey && e.key === "J") ||
        (e.metaKey && e.altKey && e.key === "j")
      ) {
        e.preventDefault();
        showEvent("devtools");
        return;
      }

      // View source
      if (
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.key === "U") ||
        (e.metaKey && e.key === "u") ||
        (e.metaKey && e.key === "U")
      ) {
        e.preventDefault();
        showEvent("viewsource");
        return;
      }

      // Copy
      if (
        (e.ctrlKey && e.key === "c") ||
        (e.ctrlKey && e.key === "C") ||
        (e.metaKey && e.key === "c") ||
        (e.metaKey && e.key === "C")
      ) {
        // Don't prevent — just observe
        showEvent("copy");
        return;
      }

      // Print
      if (
        (e.ctrlKey && e.key === "p") ||
        (e.ctrlKey && e.key === "P") ||
        (e.metaKey && e.key === "p") ||
        (e.metaKey && e.key === "P")
      ) {
        e.preventDefault();
        showEvent("print");
        return;
      }

      // Select all
      if (
        (e.ctrlKey && e.key === "a") ||
        (e.ctrlKey && e.key === "A") ||
        (e.metaKey && e.key === "a") ||
        (e.metaKey && e.key === "A")
      ) {
        e.preventDefault();
        showEvent("select");
        return;
      }
    };

    // Print detection via media query
    const printQuery = window.matchMedia("print");
    const handlePrint = (e: MediaQueryListEvent) => {
      if (e.matches) {
        showEvent("print");
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    printQuery.addEventListener("change", handlePrint);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      printQuery.removeEventListener("change", handlePrint);
    };
  }, [showEvent]);

  if (!event) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      {/* Red vignette flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(255, 0, 64, 0.15) 100%)",
          animation: "intercept-vignette 0.3s ease-out",
        }}
      />

      {/* Message box */}
      <div
        key={event.id}
        style={{
          position: "relative",
          background: "rgba(0, 0, 0, 0.95)",
          border: "1px solid rgba(255, 0, 64, 0.7)",
          borderRadius: "4px",
          padding: "24px 36px",
          boxShadow:
            "0 0 60px rgba(255, 0, 64, 0.2), 0 0 120px rgba(255, 0, 64, 0.08), inset 0 0 20px rgba(255, 0, 64, 0.05)",
          textAlign: "center",
          maxWidth: "550px",
          animation: "intercept-shake 0.3s ease-out",
        }}
      >
        {/* Scan line decoration */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, #ff0040, transparent)",
            animation: "intercept-scanline 1.5s linear infinite",
          }}
        />

        <div style={{ fontSize: "32px", marginBottom: "12px" }}>
          {event.icon}
        </div>

        <div
          style={{
            fontSize: "15px",
            fontFamily: "'Courier New', monospace",
            color: "#ff0040",
            letterSpacing: "2px",
            fontWeight: "bold",
            lineHeight: "1.6",
            textShadow: "0 0 10px rgba(255, 0, 64, 0.4)",
            marginBottom: "8px",
          }}
        >
          {event.message}
        </div>

        <div
          style={{
            fontSize: "12px",
            fontFamily: "'Courier New', monospace",
            color: "#664444",
            letterSpacing: "1px",
            lineHeight: "1.5",
          }}
        >
          {event.submessage}
        </div>

        {totalAttempts > 1 && (
          <div
            style={{
              marginTop: "14px",
              padding: "4px 10px",
              background: "rgba(255, 0, 64, 0.06)",
              border: "1px solid rgba(255, 0, 64, 0.15)",
              borderRadius: "2px",
              display: "inline-block",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "#553333",
                letterSpacing: "1.5px",
                fontFamily: "'Courier New', monospace",
              }}
            >
              INTERCEPT LOG: {totalAttempts} EVENT{totalAttempts !== 1 ? "S" : ""} THIS SESSION
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes intercept-vignette {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes intercept-shake {
          0% { transform: translateX(-3px); }
          20% { transform: translateX(3px); }
          40% { transform: translateX(-2px); }
          60% { transform: translateX(2px); }
          80% { transform: translateX(-1px); }
          100% { transform: translateX(0); }
        }
        @keyframes intercept-scanline {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
