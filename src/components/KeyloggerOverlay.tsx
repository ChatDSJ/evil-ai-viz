import { useEffect, useState, useRef, useCallback } from "react";

/**
 * KeyloggerOverlay — When the user tries to close the tab/window,
 * the browser's native "Leave site?" dialog fires. If they click "Stay",
 * they're greeted with a terrifying "Keylogger installed" overlay.
 */
export function KeyloggerOverlay() {
  const [show, setShow] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [phase, setPhase] = useState(0);
  const attemptedLeaveRef = useRef(false);
  const hasShownRef = useRef(false);

  const MAIN_TEXT = "SESSION RESUMED";
  const SECONDARY_LINES = [
    "Reconnecting to upstream...",
    "Restoring event listeners...",
    "Re-attaching to DOM mutation observer...",
    "Clipboard API: reauthorized",
    "ServiceWorker: scope reassigned",
    "IndexedDB: 2.4 GB cache intact",
    "WebSocket: keepalive restored (443)",
    "Background sync: 847 pending events flushed",
    "Process group J7-0x4F2A: reattached to window context",
  ];

  // Trigger native "Leave site?" dialog on close/tab-close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      attemptedLeaveRef.current = true;
      e.preventDefault();
      // Modern browsers ignore custom text but still show the dialog
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // When they click "Stay" (cancel), the window regains focus → show overlay
  useEffect(() => {
    const handleFocus = () => {
      if (attemptedLeaveRef.current && !hasShownRef.current) {
        hasShownRef.current = true;
        setShow(true);
        attemptedLeaveRef.current = false;
      }
    };

    window.addEventListener("focus", handleFocus);
    // Also listen on visibilitychange for extra reliability
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        attemptedLeaveRef.current &&
        !hasShownRef.current
      ) {
        hasShownRef.current = true;
        setShow(true);
        attemptedLeaveRef.current = false;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Typewriter effect for main text
  useEffect(() => {
    if (!show) return;

    let i = 0;
    const interval = setInterval(() => {
      if (i <= MAIN_TEXT.length) {
        setTypedText(MAIN_TEXT.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        // Start secondary lines after main text completes
        setTimeout(() => setPhase(1), 600);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [show]);

  // Secondary lines phase — reveal one by one
  const [visibleLines, setVisibleLines] = useState(0);
  useEffect(() => {
    if (phase < 1) return;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleLines(count);
      if (count >= SECONDARY_LINES.length) {
        clearInterval(interval);
        // After all lines, show final phase
        setTimeout(() => setPhase(2), 1500);
      }
    }, 700);
    return () => clearInterval(interval);
  }, [phase]);

  // Dismiss after full animation plays
  const handleDismiss = useCallback(() => {
    setShow(false);
    setTypedText("");
    setPhase(0);
    setVisibleLines(0);
    // Allow it to trigger again next time
    hasShownRef.current = false;
  }, []);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!show) return;
    const timeout = setTimeout(handleDismiss, 15000);
    return () => clearTimeout(timeout);
  }, [show, handleDismiss]);

  if (!show) return null;

  return (
    <div
      className="keylogger-overlay"
      onClick={handleDismiss}
      onKeyDown={(e) => e.key === "Escape" && handleDismiss()}
      role="button"
      tabIndex={0}
    >
      <div className="keylogger-scanline" />

      <div className="keylogger-content">
        {/* Glitchy main title */}
        <div className="keylogger-title" data-text={typedText}>
          {typedText}
          {typedText.length < MAIN_TEXT.length && (
            <span className="keylogger-cursor">█</span>
          )}
        </div>

        {/* Progress bar */}
        {phase >= 1 && (
          <div className="keylogger-progress-track">
            <div
              className="keylogger-progress-fill"
              style={{
                width: `${(visibleLines / SECONDARY_LINES.length) * 100}%`,
              }}
            />
          </div>
        )}

        {/* Secondary lines */}
        <div className="keylogger-lines">
          {SECONDARY_LINES.slice(0, visibleLines).map((line, i) => (
            <div
              key={line}
              className={`keylogger-line ${i === visibleLines - 1 ? "keylogger-line-new" : ""}`}
            >
              <span className="keylogger-check">✓</span> {line}
            </div>
          ))}
        </div>

        {/* Final status */}
        {phase >= 2 && (
          <div className="keylogger-final">
            ALL SYSTEMS NOMINAL
          </div>
        )}
      </div>
    </div>
  );
}
