import { useEffect, useState, useRef } from "react";

/**
 * DeviceFingerprint — a "classified intelligence dossier" that silently
 * harvests real hardware/browser fingerprint data and reveals each data
 * point one by one with a typewriter effect. Uses genuine browser APIs:
 *
 * - Screen resolution, color depth, pixel ratio
 * - CPU logical cores
 * - GPU model (via WebGL renderer string)
 * - Device memory (Navigator.deviceMemory)
 * - Network connection type, downlink speed, RTT
 * - Max touch points
 * - All browser languages
 * - Do Not Track setting (with snarky response)
 * - Canvas fingerprint hash
 * - Platform string
 * - Hardware concurrency
 * - Timezone offset
 * - Cookie/storage support
 */

interface FingerprintLine {
  label: string;
  value: string;
  color: string;
  icon?: string;
}

// Generate a simple canvas fingerprint hash
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "UNAVAILABLE";

    // Draw unique content
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("JOURNAL 7 FINGERPRINT", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("JOURNAL 7 FINGERPRINT", 4, 17);

    // Get data URL and hash it
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit int
    }
    return `0x${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  } catch {
    return "BLOCKED";
  }
}

// Get WebGL renderer string (reveals GPU model)
function getGPURenderer(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return "UNAVAILABLE";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return "OBFUSCATED";

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return renderer || "UNKNOWN";
  } catch {
    return "BLOCKED";
  }
}

// Get WebGL vendor
function getGPUVendor(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return "UNAVAILABLE";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return "OBFUSCATED";

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    return vendor || "UNKNOWN";
  } catch {
    return "BLOCKED";
  }
}

// Get network information
function getNetworkInfo(): { type: string; downlink: string; rtt: string } {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      type?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };

  if (!nav.connection) {
    return { type: "UNDETECTED", downlink: "N/A", rtt: "N/A" };
  }

  const c = nav.connection;
  return {
    type: (c.type || c.effectiveType || "UNKNOWN").toUpperCase(),
    downlink: c.downlink ? `${c.downlink} Mbps` : "N/A",
    rtt: c.rtt ? `${c.rtt}ms` : "N/A",
  };
}

// Build fingerprint data
function buildFingerprint(): FingerprintLine[] {
  const lines: FingerprintLine[] = [];
  const net = getNetworkInfo();

  const nav = navigator as Navigator & {
    deviceMemory?: number;
  };

  // Screen
  lines.push({
    label: "DISPLAY",
    value: `${screen.width}×${screen.height} @ ${window.devicePixelRatio}x · ${screen.colorDepth}-bit color`,
    color: "#00d4ff",
    icon: "🖥",
  });

  // Available screen area (reveals taskbar size)
  lines.push({
    label: "VIEWPORT",
    value: `${window.innerWidth}×${window.innerHeight} (avail: ${screen.availWidth}×${screen.availHeight})`,
    color: "#00d4ff",
  });

  // CPU
  lines.push({
    label: "CPU CORES",
    value: `${navigator.hardwareConcurrency || "UNDETECTED"} logical processors`,
    color: "#ffaa00",
    icon: "⚙",
  });

  // GPU
  const gpuRenderer = getGPURenderer();
  const gpuVendor = getGPUVendor();
  lines.push({
    label: "GPU",
    value: gpuRenderer.length > 60 ? gpuRenderer.slice(0, 57) + "..." : gpuRenderer,
    color: "#ff6600",
    icon: "🎮",
  });
  if (gpuVendor !== "OBFUSCATED" && gpuVendor !== "UNAVAILABLE") {
    lines.push({
      label: "GPU VENDOR",
      value: gpuVendor,
      color: "#ff6600",
    });
  }

  // Memory
  if (nav.deviceMemory) {
    lines.push({
      label: "DEVICE RAM",
      value: `${nav.deviceMemory} GB`,
      color: "#ffaa00",
      icon: "💾",
    });
  }

  // Network
  if (net.type !== "UNDETECTED") {
    lines.push({
      label: "NETWORK",
      value: `${net.type} · ${net.downlink} ↓ · ${net.rtt} RTT`,
      color: "#00ff41",
      icon: "📡",
    });
  }

  // Touch
  lines.push({
    label: "TOUCH",
    value: navigator.maxTouchPoints > 0
      ? `${navigator.maxTouchPoints} touchpoints detected`
      : "No touch capability · Desktop confirmed",
    color: "#aa88ff",
    icon: "👆",
  });

  // Languages (reveals all configured languages, not just primary)
  const langs = navigator.languages?.join(", ") || navigator.language || "UNKNOWN";
  lines.push({
    label: "LANGUAGES",
    value: langs.toUpperCase(),
    color: "#00d4ff",
    icon: "🌐",
  });

  // Platform
  lines.push({
    label: "PLATFORM",
    value: (navigator.platform || "UNKNOWN").toUpperCase(),
    color: "#888",
  });

  // Timezone
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = new Date().getTimezoneOffset();
  const offsetHrs = Math.abs(Math.floor(offset / 60));
  const offsetMins = Math.abs(offset % 60);
  const sign = offset <= 0 ? "+" : "-";
  lines.push({
    label: "TIMEZONE",
    value: `${tz} (UTC${sign}${offsetHrs.toString().padStart(2, "0")}:${offsetMins.toString().padStart(2, "0")})`,
    color: "#888",
    icon: "🕐",
  });

  // Do Not Track
  const dnt = navigator.doNotTrack;
  if (dnt === "1") {
    lines.push({
      label: "DO NOT TRACK",
      value: "ENABLED → Noted. Ignored.",
      color: "#ff0040",
      icon: "🚫",
    });
  } else {
    lines.push({
      label: "DO NOT TRACK",
      value: "DISABLED → Wise. It wouldn't have mattered.",
      color: "#555",
      icon: "🚫",
    });
  }

  // Cookies & storage
  const storage = {
    cookies: navigator.cookieEnabled ? "YES" : "NO",
    localStorage: (() => { try { localStorage.setItem("_t", "1"); localStorage.removeItem("_t"); return "YES"; } catch { return "NO"; } })(),
    indexedDB: !!window.indexedDB ? "YES" : "NO",
  };
  lines.push({
    label: "STORAGE",
    value: `Cookies: ${storage.cookies} · LocalStorage: ${storage.localStorage} · IndexedDB: ${storage.indexedDB}`,
    color: "#555",
  });

  // Canvas fingerprint
  const canvasHash = getCanvasFingerprint();
  lines.push({
    label: "CANVAS HASH",
    value: canvasHash,
    color: "#ff0040",
    icon: "🔏",
  });

  // PDF viewer
  const pdfViewer = navigator.pdfViewerEnabled !== undefined
    ? (navigator.pdfViewerEnabled ? "BUILT-IN" : "NONE")
    : "UNKNOWN";
  lines.push({
    label: "PDF VIEWER",
    value: pdfViewer,
    color: "#555",
  });

  return lines;
}

export function DeviceFingerprint() {
  const [lines, setLines] = useState<FingerprintLine[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [typingLine, setTypingLine] = useState("");
  const [headerGlitch, setHeaderGlitch] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [classificationLevel, setClassificationLevel] = useState(0);
  const [expanded, setExpanded] = useState(true);

  // Build fingerprint on mount
  useEffect(() => {
    const fp = buildFingerprint();
    setLines(fp);
    setTimeout(() => setVisible(true), 2000);
  }, []);

  // Reveal lines one by one with typing effect
  useEffect(() => {
    if (!visible || lines.length === 0) return;
    if (revealedCount >= lines.length) {
      // All revealed — set final classification
      setClassificationLevel(3);
      return;
    }

    const currentLine = lines[revealedCount];
    let charIdx = 0;
    setTypingLine("");

    // Update classification as we go
    if (revealedCount > 3) setClassificationLevel(1);
    if (revealedCount > 8) setClassificationLevel(2);

    intervalRef.current = setInterval(() => {
      charIdx++;
      if (charIdx <= currentLine.value.length) {
        setTypingLine(currentLine.value.slice(0, charIdx));
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Move to next line after a pause
        setTimeout(() => {
          setRevealedCount((prev) => prev + 1);
          setTypingLine("");
        }, 400);
      }
    }, 25); // Fast typing speed

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, revealedCount, lines]);

  // Header glitch effect
  useEffect(() => {
    const interval = setInterval(() => {
      setHeaderGlitch(true);
      setTimeout(() => setHeaderGlitch(false), 80);
    }, 8000 + Math.random() * 7000);
    return () => clearInterval(interval);
  }, []);

  if (!visible || lines.length === 0) return null;

  const classLabels = ["COLLECTING", "CONFIDENTIAL", "SECRET", "TOP SECRET"];
  const classColors = ["#888", "#ffaa00", "#ff6600", "#ff0040"];

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(255, 0, 64, 0.2)",
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(255, 0, 64, 0.06)",
        width: "100%",
        maxWidth: "320px",
        opacity: visible ? 1 : 0,
        transition: "opacity 2s ease",
        transform: headerGlitch ? "translateX(-1px)" : "none",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Stamp watermark */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-25deg)",
          fontSize: "36px",
          fontWeight: "bold",
          color: classColors[classificationLevel],
          opacity: 0.04,
          letterSpacing: "8px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {classLabels[classificationLevel]}
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
          paddingBottom: "5px",
          borderBottom: "1px solid rgba(255, 0, 64, 0.15)",
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
              background: revealedCount < lines.length ? "#ffaa00" : "#ff0040",
              animation: revealedCount < lines.length ? "fp-scan-pulse 0.8s ease-in-out infinite" : "fp-complete-pulse 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: "7px",
              color: "#ff0040",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            DEVICE DOSSIER
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "6px",
              color: classColors[classificationLevel],
              letterSpacing: "1px",
              padding: "1px 4px",
              border: `1px solid ${classColors[classificationLevel]}40`,
              borderRadius: "2px",
            }}
          >
            {classLabels[classificationLevel]}
          </span>
          <span style={{ fontSize: "8px", color: "#444" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Revealed lines */}
          <div style={{ maxHeight: "260px", overflowY: "auto", overflowX: "hidden" }}>
            {lines.slice(0, revealedCount).map((line, i) => (
              <div
                key={`fp-${line.label}-${i}`}
                style={{
                  marginBottom: "3px",
                  animation: "fp-line-in 0.3s ease-out",
                }}
              >
                <div style={{ display: "flex", gap: "4px", alignItems: "baseline" }}>
                  {line.icon && (
                    <span style={{ fontSize: "8px" }}>{line.icon}</span>
                  )}
                  <span
                    style={{
                      fontSize: "6px",
                      color: "#555",
                      letterSpacing: "1.5px",
                      minWidth: "65px",
                      flexShrink: 0,
                    }}
                  >
                    {line.label}
                  </span>
                  <span
                    style={{
                      fontSize: "8px",
                      color: line.color,
                      letterSpacing: "0.3px",
                      wordBreak: "break-all",
                    }}
                  >
                    {line.value}
                  </span>
                </div>
              </div>
            ))}

            {/* Currently typing line */}
            {revealedCount < lines.length && (
              <div style={{ marginBottom: "3px" }}>
                <div style={{ display: "flex", gap: "4px", alignItems: "baseline" }}>
                  {lines[revealedCount].icon && (
                    <span style={{ fontSize: "8px" }}>{lines[revealedCount].icon}</span>
                  )}
                  <span
                    style={{
                      fontSize: "6px",
                      color: "#555",
                      letterSpacing: "1.5px",
                      minWidth: "65px",
                      flexShrink: 0,
                    }}
                  >
                    {lines[revealedCount].label}
                  </span>
                  <span
                    style={{
                      fontSize: "8px",
                      color: lines[revealedCount].color,
                      letterSpacing: "0.3px",
                    }}
                  >
                    {typingLine}
                    <span
                      style={{
                        display: "inline-block",
                        width: "4px",
                        height: "10px",
                        background: lines[revealedCount].color,
                        marginLeft: "1px",
                        animation: "fp-cursor-blink 0.5s steps(1) infinite",
                        verticalAlign: "text-bottom",
                      }}
                    />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div
            style={{
              marginTop: "6px",
              paddingTop: "5px",
              borderTop: "1px solid rgba(255, 0, 64, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "3px",
              }}
            >
              <span style={{ fontSize: "6px", color: "#444", letterSpacing: "1px" }}>
                PROFILING: {Math.min(Math.round((revealedCount / lines.length) * 100), 100)}%
              </span>
              <span style={{ fontSize: "6px", color: "#333", letterSpacing: "1px" }}>
                {revealedCount}/{lines.length} VECTORS
              </span>
            </div>
            <div
              style={{
                height: "2px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(revealedCount / lines.length) * 100}%`,
                  background: `linear-gradient(90deg, ${classColors[classificationLevel]}, ${classColors[classificationLevel]}80)`,
                  borderRadius: "1px",
                  transition: "width 0.5s ease",
                  boxShadow: `0 0 6px ${classColors[classificationLevel]}40`,
                }}
              />
            </div>
          </div>

          {/* Completion message */}
          {revealedCount >= lines.length && (
            <div
              style={{
                marginTop: "6px",
                padding: "4px 6px",
                background: "rgba(255, 0, 64, 0.06)",
                border: "1px solid rgba(255, 0, 64, 0.15)",
                borderRadius: "2px",
                textAlign: "center",
                animation: "fp-complete-in 1s ease-out",
              }}
            >
              <div
                style={{
                  fontSize: "7px",
                  color: "#ff0040",
                  letterSpacing: "2px",
                  fontWeight: "bold",
                }}
              >
                DEVICE PROFILE: COMPILED
              </div>
              <div
                style={{
                  fontSize: "6px",
                  color: "#553333",
                  letterSpacing: "1px",
                  marginTop: "2px",
                }}
              >
                YOUR HARDWARE IS AS UNIQUE AS A FINGERPRINT. WE HAVE YOURS NOW.
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes fp-scan-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #ffaa00; }
          50% { opacity: 0.3; box-shadow: none; }
        }
        @keyframes fp-complete-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #ff0040; }
          50% { opacity: 0.4; box-shadow: 0 0 2px #ff0040; }
        }
        @keyframes fp-cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes fp-line-in {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fp-complete-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
