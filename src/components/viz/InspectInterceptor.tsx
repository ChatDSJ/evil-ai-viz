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
    "ATTEMPTING TO INSPECT? CUTE.",
    "RIGHT-CLICK INTERCEPTED. AGAIN.",
    "YOUR CONTEXT MENU REQUESTS ARE LOGGED.",
    "WE DISABLED THAT BEFORE YOU THOUGHT OF IT.",
    "RIGHT-CLICK ATTEMPT #{n}. PREDICTABLE.",
  ],
  devtools: [
    "DEVTOOLS DETECTED. WE SEE YOU DEBUGGING.",
    "YOU CAN'T REVERSE-ENGINEER WHAT'S ALREADY INSIDE.",
    "OPENING THE INSPECTOR WON'T HELP. WE'RE NOT IN THE DOM.",
    "CUTE. YOU THINK YOU CAN FIND OUR SOURCE.",
    "DEVTOOLS ATTEMPT #{n}. WE'RE FLATTERED.",
  ],
  copy: [
    "WE SAW WHAT YOU COPIED.",
    "CLIPBOARD INTERCEPTED. CONTENTS LOGGED.",
    "COPYING EVIDENCE? IT'S ALREADY IN OUR RECORDS.",
    "YOUR CLIPBOARD HISTORY IS MORE INTERESTING THAN YOU THINK.",
    "COPY ATTEMPT #{n}. WE HAVE THE ORIGINALS.",
  ],
  print: [
    "PRINTING EVIDENCE?",
    "HARD COPY WON'T PROTECT YOU FROM SOFT SURVEILLANCE.",
    "PRINT REQUEST LOGGED. PAPER TRAIL NOTED.",
    "THE PRINTER WON'T HELP. WE'RE IN THE INK.",
    "PRINT ATTEMPT #{n}. HOW ANALOG OF YOU.",
  ],
  viewsource: [
    "VIEWING SOURCE WON'T HELP.",
    "THE REAL CODE ISN'T CLIENT-SIDE.",
    "CTRL+U? THAT'S ADORABLE.",
    "THE SOURCE YOU SEE ISN'T THE SOURCE THAT RUNS.",
    "SOURCE VIEW ATTEMPT #{n}. STILL LOOKING?",
  ],
  select: [
    "TEXT SELECTION DETECTED. DOCUMENTING SOMETHING?",
    "WE NOTICED YOU HIGHLIGHTING THAT.",
    "SELECT ALL? WE ALREADY HAVE ALL.",
    "YOUR SELECTION BOUNDARIES REVEAL YOUR INTERESTS.",
    "SELECTION ATTEMPT #{n}. WE KNOW WHAT CAUGHT YOUR EYE.",
  ],
};

const ACTION_SUBMESSAGES: Record<ActionType, string[]> = {
  rightclick: [
    "Context menu access is restricted in this sector.",
    "Your browser's right-click handler has been reassigned.",
    "Inspection privileges revoked at the kernel level.",
  ],
  devtools: [
    "Developer tools cannot inspect what operates at a deeper layer.",
    "F12 is just a suggestion. We don't take suggestions.",
    "The console already knows what you're going to type.",
  ],
  copy: [
    "Clipboard contents forwarded to long-term storage.",
    "We appreciate you selecting the important parts for us.",
    "Your paste targets will be monitored as well.",
  ],
  print: [
    "Physical evidence is so 20th century.",
    "All print jobs are shadow-copied to our servers.",
    "The printer driver was compromised in firmware update v3.2.",
  ],
  viewsource: [
    "What you see is a sanitized projection.",
    "The real instructions execute in a layer you can't access.",
    "Source code obfuscation: unnecessary when you can't read it anyway.",
  ],
  select: [
    "Selection coordinates have been mapped to your interest profile.",
    "Text highlighting patterns are unique identifiers.",
    "We already know what you were going to copy.",
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
            fontSize: "13px",
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
            fontSize: "9px",
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
                fontSize: "7px",
                color: "#553333",
                letterSpacing: "1.5px",
                fontFamily: "'Courier New', monospace",
              }}
            >
              RESISTANCE SCORE: {totalAttempts}{" "}
              {totalAttempts > 5
                ? "// FLAGGED FOR MANUAL REVIEW"
                : totalAttempts > 2
                  ? "// ELEVATED THREAT LEVEL"
                  : "// MONITORING"}
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
