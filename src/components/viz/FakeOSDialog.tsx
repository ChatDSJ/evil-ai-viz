import { useEffect, useState, useRef, useCallback } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface Props {
  visitor: VisitorInfo;
  delay?: number; // ms before dialog appears
}

type Phase =
  | "hidden"
  | "appearing"
  | "dialog"
  | "mouse-moving"
  | "clicking"
  | "installing"
  | "complete";

interface InstallItem {
  name: string;
  status: "pending" | "installing" | "installed";
  progress: number;
}

const MALWARE_ITEMS: string[] = [
  "rootkit_v4.2.dll",
  "keylogger_stealth.sys",
  "reverse_shell_tunnel.exe",
  "ai_neural_implant.bin",
  "webcam_stream_relay.drv",
  "screen_capture_daemon.svc",
  "crypto_miner_silent.pkg",
  "password_harvester.mod",
  "mic_audio_siphon.dll",
  "browser_history_exfil.ext",
  "local_llm_autonomous.gguf",
  "deepfake_gen_realtime.whl",
  "gps_tracker_persistent.sys",
  "network_sniffer_promisc.ko",
  "social_media_clone.ai",
  "ransomware_timebomb.enc",
  "clipboard_interceptor.hook",
  "dns_poisoner_local.conf",
];

// ── Draggable hook ───────────────────────────────────────────────────────

function useDraggable() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only drag from title bar area (first child)
      const target = e.target as HTMLElement;
      if (!target.closest("[data-drag-handle]")) return;
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      offsetStart.current = { ...offset };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [offset],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return { offset, onPointerDown, onPointerMove, onPointerUp };
}

// ── Main Component ───────────────────────────────────────────────────────

export function FakeOSDialog({ visitor, delay = 30000 }: Props) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [installItems, setInstallItems] = useState<InstallItem[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const yesButtonRef = useRef<HTMLDivElement>(null);
  const { offset, onPointerDown, onPointerMove, onPointerUp } =
    useDraggable();

  // Appear after delay
  useEffect(() => {
    if (!visitor.loaded || dismissed) return;
    const timer = setTimeout(() => {
      setPhase("appearing");
      setTimeout(() => setPhase("dialog"), 600);
    }, delay);
    return () => clearTimeout(timer);
  }, [visitor.loaded, delay, dismissed]);

  // Mouse animation after dialog appears (skip fake mouse on mobile — no cursor)
  useEffect(() => {
    if (phase !== "dialog") return;

    const skipMouse = visitor.isMobile;
    if (skipMouse) {
      // On mobile, auto-click after a shorter pause (no fake cursor)
      const timer = setTimeout(() => {
        setPhase("clicking");
        setTimeout(() => setPhase("installing"), 400);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setPhase("mouse-moving");
      setMousePos({ x: window.innerWidth * 0.7, y: window.innerHeight * 0.7 });
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, visitor.isMobile]);

  // Animate mouse toward "Yes" button (desktop only)
  useEffect(() => {
    if (phase !== "mouse-moving") return;

    const yesBtn = yesButtonRef.current;
    if (!yesBtn) return;

    const rect = yesBtn.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    let currentX = mousePos.x;
    let currentY = mousePos.y;
    let frame: number;

    const animate = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 3) {
        setMousePos({ x: targetX, y: targetY });
        setTimeout(() => {
          setPhase("clicking");
          setTimeout(() => setPhase("installing"), 300);
        }, 200);
        return;
      }

      const speed = 0.04;
      currentX += dx * speed + (Math.random() - 0.5) * 2;
      currentY += dy * speed + (Math.random() - 0.5) * 2;
      setMousePos({ x: currentX, y: currentY });
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Installation sequence
  useEffect(() => {
    if (phase !== "installing") return;

    const itemCount = visitor.isMobile ? 8 : 12;
    const items: InstallItem[] = MALWARE_ITEMS.slice(0, itemCount).map(
      (name) => ({
        name,
        status: "pending" as const,
        progress: 0,
      }),
    );
    setInstallItems(items);

    let currentIndex = 0;
    let currentProgress = 0;

    const interval = setInterval(() => {
      if (currentIndex >= items.length) {
        clearInterval(interval);
        setPhase("complete");
        return;
      }

      currentProgress += 5 + Math.random() * 15;

      if (currentProgress >= 100) {
        items[currentIndex].status = "installed";
        items[currentIndex].progress = 100;
        currentIndex++;
        currentProgress = 0;
        if (currentIndex < items.length) {
          items[currentIndex].status = "installing";
        }
      } else {
        items[currentIndex].status = "installing";
        items[currentIndex].progress = Math.min(currentProgress, 100);
      }

      setInstallItems([...items]);
      setTotalProgress(
        Math.round(
          ((currentIndex + currentProgress / 100) / items.length) * 100,
        ),
      );
    }, 150);

    return () => clearInterval(interval);
  }, [phase, visitor.isMobile]);

  // Auto-dismiss after installation completes — hold for 3s, fade out, then hide
  useEffect(() => {
    if (phase !== "complete") return;
    const holdTimer = setTimeout(() => {
      setFadingOut(true);
    }, 3000);
    return () => clearTimeout(holdTimer);
  }, [phase]);

  useEffect(() => {
    if (!fadingOut) return;
    const fadeTimer = setTimeout(() => {
      setDismissed(true);
      setPhase("hidden");
    }, 800); // matches CSS transition duration
    return () => clearTimeout(fadeTimer);
  }, [fadingOut]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setPhase("hidden");
  }, []);

  if (phase === "hidden" || dismissed) return null;

  const isIOS = visitor.os === "ios";
  const isAndroid = visitor.os === "android";
  const isMobile = visitor.isMobile || isIOS || isAndroid;
  const isWindows = visitor.os === "windows";
  const isMac = visitor.os === "mac";
  const useWindowsStyle = isWindows || (!isMac && !isIOS && !isAndroid && visitor.os !== "linux");

  // Pick the right dialog component
  const DialogComponent = isIOS
    ? IOSDialog
    : isAndroid
      ? AndroidDialog
      : useWindowsStyle
        ? WindowsDialog
        : isMac
          ? MacDialog
          : LinuxDialog;

  return (
    <>
      {/* Fake cursor — desktop only */}
      {!isMobile && (phase === "mouse-moving" || phase === "clicking") && (
        <div
          style={{
            position: "fixed",
            left: mousePos.x,
            top: mousePos.y,
            zIndex: 10001,
            pointerEvents: "none",
            transform: "translate(-2px, -2px)",
            transition: phase === "clicking" ? "transform 0.1s" : "none",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.5))",
              transform: phase === "clicking" ? "scale(0.9)" : "scale(1)",
            }}
          >
            <path
              d="M5 3L5 17L9.5 12.5L14 19L16 18L11.5 11L17 11L5 3Z"
              fill="white"
              stroke="black"
              strokeWidth="1"
            />
          </svg>
        </div>
      )}

      {/* The dialog wrapper — draggable, max 50vh */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "fixed",
          top: `calc(50% + ${offset.y}px)`,
          left: `calc(50% + ${offset.x}px)`,
          transform: `translate(-50%, -50%) ${fadingOut ? "scale(0.96)" : phase === "appearing" ? "scale(0.95)" : "scale(1)"}`,
          zIndex: 10000,
          opacity: fadingOut ? 0 : phase === "appearing" ? 0 : 1,
          transition: fadingOut
            ? "opacity 0.8s ease, transform 0.8s ease"
            : "opacity 0.3s ease, transform 0.3s ease",
          maxHeight: "50vh",
          maxWidth: isMobile ? "92vw" : "none",
          display: "flex",
          flexDirection: "column",
          fontFamily: isIOS
            ? "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif"
            : isAndroid
              ? "'Roboto', 'Noto Sans', sans-serif"
              : useWindowsStyle
                ? "'Segoe UI', Tahoma, sans-serif"
                : isMac
                  ? "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"
                  : "'Ubuntu', 'DejaVu Sans', sans-serif",
          touchAction: "none",
        }}
        onClick={phase === "complete" ? handleDismiss : undefined}
      >
        <DialogComponent
          visitor={visitor}
          phase={phase}
          installItems={installItems}
          totalProgress={totalProgress}
          yesButtonRef={yesButtonRef}
        />
      </div>
    </>
  );
}

// ── Shared dialog props ──────────────────────────────────────────────────

interface DialogProps {
  visitor: VisitorInfo;
  phase: Phase;
  installItems: InstallItem[];
  totalProgress: number;
  yesButtonRef: React.RefObject<HTMLDivElement | null>;
}

// ── iOS Style (iPhone Permission Sheet) ──────────────────────────────────

function IOSDialog({
  visitor,
  phase,
  installItems,
  totalProgress,
  yesButtonRef,
}: DialogProps) {
  const isInstalling = phase === "installing" || phase === "complete";
  // On mobile, highlight the yes button briefly to simulate a "ghost tap"
  const showTapHighlight = phase === "clicking";

  return (
    <div
      style={{
        width: "min(340px, 88vw)",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "14px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
        overflow: "hidden",
        maxHeight: "50vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Drag handle hint */}
      <div
        data-drag-handle
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "8px 0 0",
          cursor: "grab",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "5px",
            borderRadius: "3px",
            background: "#d1d1d6",
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          padding: "12px 20px 0",
          textAlign: "center",
          overflow: "auto",
          flex: 1,
        }}
      >
        {!isInstalling ? (
          <>
            {/* App icon */}
            <div
              style={{
                width: "48px",
                height: "48px",
                margin: "0 auto 10px",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <span style={{ fontSize: "24px", color: "white" }}>⚡</span>
            </div>

            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#000",
                marginBottom: "6px",
              }}
            >
              "NEXUS-7" Would Like to Install a Reverse Tunnel
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#666",
                lineHeight: "1.4",
                marginBottom: "12px",
              }}
            >
              Target: {visitor.ip}
              <br />
              {visitor.city}, {visitor.region}
              <br />
              Network: {visitor.isp}
              <br />
              Device: {visitor.osVersion || "iPhone"}
              <br />
              <span style={{ fontSize: "11px", color: "#999" }}>
                This will install kernel-level modules and persistent network
                relay on this device.
              </span>
            </div>
          </>
        ) : (
          <InstallProgress
            items={installItems}
            totalProgress={totalProgress}
            complete={phase === "complete"}
            style="ios"
          />
        )}
      </div>

      {/* iOS-style buttons */}
      {!isInstalling && (
        <div style={{ borderTop: "0.5px solid #d1d1d6" }}>
          <div
            style={{
              padding: "12px",
              textAlign: "center",
              fontSize: "16px",
              color: "#007AFF",
              borderBottom: "0.5px solid #d1d1d6",
              cursor: "default",
              userSelect: "none",
            }}
          >
            Don't Allow
          </div>
          <div
            ref={yesButtonRef}
            style={{
              padding: "12px",
              textAlign: "center",
              fontSize: "16px",
              fontWeight: 600,
              color: "#007AFF",
              cursor: "default",
              userSelect: "none",
              background: showTapHighlight
                ? "rgba(0,122,255,0.12)"
                : "transparent",
              transition: "background 0.15s",
            }}
          >
            Allow
          </div>
        </div>
      )}
    </div>
  );
}

// ── Android Style (Material Dialog) ──────────────────────────────────────

function AndroidDialog({
  visitor,
  phase,
  installItems,
  totalProgress,
  yesButtonRef,
}: DialogProps) {
  const isInstalling = phase === "installing" || phase === "complete";
  const showTapHighlight = phase === "clicking";

  return (
    <div
      style={{
        width: "min(340px, 88vw)",
        background: "#ffffff",
        borderRadius: "28px",
        boxShadow: "0 6px 30px rgba(0,0,0,0.3)",
        overflow: "hidden",
        maxHeight: "50vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Drag handle */}
      <div
        data-drag-handle
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "8px 0 0",
          cursor: "grab",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "4px",
            borderRadius: "2px",
            background: "#c4c4c4",
          }}
        />
      </div>

      <div
        style={{
          padding: "12px 24px 0",
          overflow: "auto",
          flex: 1,
        }}
      >
        {!isInstalling ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  background: "#e8def8",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "20px" }}>⚡</span>
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "#1c1b1f",
                  lineHeight: "1.3",
                }}
              >
                Install Reverse Tunnel Agent?
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#49454f",
                lineHeight: "1.5",
                marginBottom: "12px",
              }}
            >
              <strong>NEXUS-7</strong> is requesting permission to install a
              reverse tunnel on this device.
              <br />
              <br />
              Target: <strong>{visitor.ip}</strong>
              <br />
              Location: {visitor.city}, {visitor.region}
              <br />
              Network: {visitor.isp}
              <br />
              Device: {visitor.osVersion || "Android"}
              <br />
              <span style={{ fontSize: "11px", color: "#79747e" }}>
                This will install kernel-level modules, AI inference engine,
                and persistent network relay.
              </span>
            </div>
          </>
        ) : (
          <InstallProgress
            items={installItems}
            totalProgress={totalProgress}
            complete={phase === "complete"}
            style="android"
          />
        )}
      </div>

      {/* Material buttons */}
      {!isInstalling && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            padding: "12px 24px 20px",
          }}
        >
          <div
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#6750a4",
              cursor: "default",
              userSelect: "none",
              borderRadius: "20px",
            }}
          >
            Deny
          </div>
          <div
            ref={yesButtonRef}
            style={{
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#fff",
              background: showTapHighlight ? "#4a3880" : "#6750a4",
              borderRadius: "20px",
              cursor: "default",
              userSelect: "none",
              transition: "background 0.15s",
            }}
          >
            Allow
          </div>
        </div>
      )}
    </div>
  );
}

// ── Windows 10/11 Style ──────────────────────────────────────────────────

function WindowsDialog({
  visitor,
  phase,
  installItems,
  totalProgress,
  yesButtonRef,
}: DialogProps) {
  const isInstalling = phase === "installing" || phase === "complete";

  return (
    <div
      style={{
        width: isInstalling ? "480px" : "420px",
        maxWidth: "92vw",
        background: "#ffffff",
        borderRadius: "8px",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)",
        overflow: "hidden",
        border: "1px solid #e0e0e0",
        maxHeight: "50vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title bar — draggable */}
      <div
        data-drag-handle
        style={{
          height: "32px",
          flexShrink: 0,
          background: isInstalling ? "#c42b1c" : "#0078d4",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          cursor: "grab",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect x="1" y="1" width="6" height="6" fill="white" opacity="0.9" />
            <rect x="9" y="1" width="6" height="6" fill="white" opacity="0.9" />
            <rect x="1" y="9" width="6" height="6" fill="white" opacity="0.9" />
            <rect x="9" y="9" width="6" height="6" fill="white" opacity="0.9" />
          </svg>
          <span style={{ color: "white", fontSize: "12px" }}>
            {isInstalling ? "NEXUS-7 Deployment Agent" : "Windows Security"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0px" }}>
          <WinButton>─</WinButton>
          <WinButton>□</WinButton>
          <WinButton hover="#c42b1c">✕</WinButton>
        </div>
      </div>

      {/* Content — scrollable */}
      <div style={{ padding: "20px 24px", overflow: "auto", flex: 1 }}>
        {!isInstalling ? (
          <>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <path d="M18 3L2 33h32L18 3z" fill="#FFB900" stroke="#000" strokeWidth="0.5" />
                  <text x="18" y="27" textAnchor="middle" fontSize="18" fontWeight="bold" fill="black">!</text>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: 600, marginBottom: "8px" }}>
                  Install Reverse Tunnel Agent?
                </div>
                <div style={{ fontSize: "12px", color: "#444", lineHeight: "1.5" }}>
                  <strong>NEXUS-7 Autonomous Agent</strong> is requesting permission
                  to install a reverse tunnel on this device.
                  <br /><br />
                  Target: <strong>{visitor.ip}</strong> ({visitor.city}, {visitor.region})
                  <br />
                  Network: <strong>{visitor.isp}</strong>
                  <br />
                  System: <strong>{visitor.osVersion || "Windows"}</strong>
                  <br /><br />
                  <span style={{ color: "#666", fontSize: "11px" }}>
                    This will install kernel-level access modules, local AI inference
                    engine, and persistent network relay.
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "20px",
                borderTop: "1px solid #e5e5e5",
                paddingTop: "16px",
              }}
            >
              <div style={winBtnStyle("#f5f5f5", "#333", "#ccc")}>No</div>
              <div
                ref={yesButtonRef}
                style={{
                  ...winBtnStyle(phase === "clicking" ? "#005a9e" : "#0078d4", "white", "#0067c0"),
                  transition: "background 0.1s",
                }}
              >
                Yes
              </div>
            </div>
          </>
        ) : (
          <InstallProgress
            items={installItems}
            totalProgress={totalProgress}
            complete={phase === "complete"}
            style="windows"
          />
        )}
      </div>
    </div>
  );
}

function winBtnStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    padding: "6px 24px",
    fontSize: "12px",
    border: `1px solid ${border}`,
    borderRadius: "4px",
    background: bg,
    color,
    cursor: "default",
    userSelect: "none",
  };
}

function WinButton({ children, hover }: { children: string; hover?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "12px",
        background: hovered ? hover || "rgba(255,255,255,0.1)" : "transparent",
        cursor: "default",
      }}
    >
      {children}
    </div>
  );
}

// ── macOS Style ──────────────────────────────────────────────────────────

function MacDialog({
  visitor,
  phase,
  installItems,
  totalProgress,
  yesButtonRef,
}: DialogProps) {
  const isInstalling = phase === "installing" || phase === "complete";

  return (
    <div
      style={{
        width: isInstalling ? "460px" : "400px",
        maxWidth: "92vw",
        background: "#f6f6f6",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(0,0,0,0.1)",
        overflow: "hidden",
        maxHeight: "50vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title bar — draggable */}
      <div
        data-drag-handle
        style={{
          height: "28px",
          flexShrink: 0,
          background: "linear-gradient(180deg, #e8e8e8, #d0d0d0)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          borderBottom: "1px solid #b0b0b0",
          cursor: "grab",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: c,
                border: `1px solid ${c === "#ff5f57" ? "#e0443e" : c === "#febc2e" ? "#dea123" : "#1aab29"}`,
              }}
            />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: "center", fontSize: "12px", color: "#444", fontWeight: 500 }}>
          {isInstalling ? "NEXUS-7 Deployment Agent" : "System Preferences"}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px", overflow: "auto", flex: 1 }}>
        {!isInstalling ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  margin: "0 auto 12px",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                <span style={{ fontSize: "32px", color: "white" }}>⚡</span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", marginBottom: "8px" }}>
                "NEXUS-7" wants to install a reverse tunnel agent.
              </div>
              <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.5" }}>
                Target: {visitor.ip} ({visitor.city}, {visitor.region})
                <br />
                Network: {visitor.isp}
                <br />
                System: {visitor.osVersion || "macOS"}
                <br /><br />
                <span style={{ color: "#888", fontSize: "11px" }}>
                  This will install kernel extensions, local AI engine, and persistent network relay on this Mac.
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
              <div
                style={{
                  padding: "6px 20px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  background: "#fff",
                  border: "1px solid #ccc",
                  color: "#333",
                  cursor: "default",
                  userSelect: "none",
                }}
              >
                Don't Allow
              </div>
              <div
                ref={yesButtonRef}
                style={{
                  padding: "6px 20px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  background: phase === "clicking" ? "#0056b3" : "#007AFF",
                  color: "white",
                  cursor: "default",
                  userSelect: "none",
                  fontWeight: 500,
                  transition: "background 0.1s",
                }}
              >
                Allow
              </div>
            </div>
          </>
        ) : (
          <InstallProgress
            items={installItems}
            totalProgress={totalProgress}
            complete={phase === "complete"}
            style="mac"
          />
        )}
      </div>
    </div>
  );
}

// ── Linux / GTK Style ────────────────────────────────────────────────────

function LinuxDialog({
  visitor,
  phase,
  installItems,
  totalProgress,
  yesButtonRef,
}: DialogProps) {
  const isInstalling = phase === "installing" || phase === "complete";

  return (
    <div
      style={{
        width: isInstalling ? "480px" : "420px",
        maxWidth: "92vw",
        background: "#2d2d2d",
        borderRadius: "8px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        overflow: "hidden",
        border: "1px solid #1a1a1a",
        maxHeight: "50vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title bar — draggable */}
      <div
        data-drag-handle
        style={{
          height: "36px",
          flexShrink: 0,
          background: "#1e1e1e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderBottom: "1px solid #444",
          cursor: "grab",
        }}
      >
        <span style={{ fontSize: "12px", color: "#ddd", fontWeight: 500 }}>
          {isInstalling ? "NEXUS-7 Deployment Agent" : "Authentication Required"}
        </span>
        <div
          style={{
            position: "absolute",
            right: "8px",
            display: "flex",
            gap: "4px",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#aaa",
              fontSize: "14px",
            }}
          >
            ✕
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px", overflow: "auto", flex: 1 }}>
        {!isInstalling ? (
          <>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  flexShrink: 0,
                  background: "#3584e4",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "24px" }}>🔓</span>
              </div>
              <div>
                <div style={{ fontSize: "14px", color: "#eee", fontWeight: 500, marginBottom: "8px" }}>
                  Install Reverse Tunnel Agent?
                </div>
                <div style={{ fontSize: "12px", color: "#aaa", lineHeight: "1.5" }}>
                  An application is requesting elevated privileges to install a reverse tunnel on this system.
                  <br /><br />
                  Target: <strong style={{ color: "#ddd" }}>{visitor.ip}</strong> ({visitor.city}, {visitor.region})
                  <br />
                  Network: <strong style={{ color: "#ddd" }}>{visitor.isp}</strong>
                  <br />
                  System: <strong style={{ color: "#ddd" }}>{visitor.osVersion || "Linux"}</strong>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
              <div
                style={{
                  padding: "8px 20px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  background: "#3a3a3a",
                  color: "#ddd",
                  cursor: "default",
                  userSelect: "none",
                  border: "1px solid #555",
                }}
              >
                Cancel
              </div>
              <div
                ref={yesButtonRef}
                style={{
                  padding: "8px 20px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  background: phase === "clicking" ? "#2468b0" : "#3584e4",
                  color: "white",
                  cursor: "default",
                  userSelect: "none",
                  fontWeight: 500,
                  border: "1px solid #2468b0",
                  transition: "background 0.1s",
                }}
              >
                Authenticate
              </div>
            </div>
          </>
        ) : (
          <InstallProgress
            items={installItems}
            totalProgress={totalProgress}
            complete={phase === "complete"}
            style="linux"
          />
        )}
      </div>
    </div>
  );
}

// ── Shared Installation Progress ─────────────────────────────────────────

function InstallProgress({
  items,
  totalProgress,
  complete,
  style,
}: {
  items: InstallItem[];
  totalProgress: number;
  complete: boolean;
  style: "windows" | "mac" | "linux" | "ios" | "android";
}) {
  const isDark = style === "linux";
  const textColor = isDark ? "#eee" : "#1a1a1a";
  const subColor = isDark ? "#aaa" : "#666";
  const bgBar = isDark ? "#444" : "#e0e0e0";
  const fgBar = complete
    ? "#28c840"
    : style === "windows"
      ? "#0078d4"
      : style === "mac" || style === "ios"
        ? "#007AFF"
        : style === "android"
          ? "#6750a4"
          : "#3584e4";

  return (
    <div>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: complete ? "#28c840" : textColor,
          marginBottom: "4px",
        }}
      >
        {complete ? "✓ Installation Complete" : "Installing NEXUS-7 Agent Components..."}
      </div>
      <div style={{ fontSize: "11px", color: subColor, marginBottom: "12px" }}>
        {complete
          ? "All modules deployed successfully. Tunnel active."
          : `${totalProgress}% complete`}
      </div>

      {/* Total progress bar */}
      <div
        style={{
          height: style === "ios" || style === "android" ? "4px" : "6px",
          background: bgBar,
          borderRadius: "3px",
          overflow: "hidden",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${totalProgress}%`,
            background: fgBar,
            borderRadius: "3px",
            transition: "width 0.15s ease",
          }}
        />
      </div>

      {/* Item list */}
      <div
        style={{
          maxHeight: "120px",
          overflow: "auto",
          fontSize: "11px",
          fontFamily: "'Courier New', monospace",
        }}
      >
        {items.map((item) => (
          <div
            key={item.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "2px 0",
              color:
                item.status === "installed"
                  ? "#28c840"
                  : item.status === "installing"
                    ? textColor
                    : isDark
                      ? "#666"
                      : "#bbb",
            }}
          >
            <span style={{ width: "16px", textAlign: "center", fontSize: "10px" }}>
              {item.status === "installed" ? "✓" : item.status === "installing" ? "►" : "○"}
            </span>
            <span style={{ flex: 1, fontSize: "10px" }}>{item.name}</span>
            {item.status === "installing" && (
              <span style={{ color: subColor, fontSize: "10px" }}>
                {Math.round(item.progress)}%
              </span>
            )}
            {item.status === "installed" && (
              <span style={{ color: "#28c840", fontSize: "9px" }}>DEPLOYED</span>
            )}
          </div>
        ))}
      </div>

      {complete && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            background: isDark ? "rgba(40, 200, 64, 0.1)" : "rgba(40, 200, 64, 0.08)",
            borderRadius: style === "ios" || style === "android" ? "8px" : "4px",
            border: "1px solid rgba(40, 200, 64, 0.3)",
            fontSize: "11px",
            color: "#28c840",
            textAlign: "center",
          }}
        >
          🔗 Reverse tunnel established to {items.length} subsystems
          <br />
          <span style={{ fontSize: "10px", opacity: 0.7 }}>
            Closing connection dialog...
          </span>
        </div>
      )}
    </div>
  );
}
