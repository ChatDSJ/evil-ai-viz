import { useEffect, useState, useRef, useCallback } from "react";

/**
 * ScreenTopology — Maps the user's physical display setup.
 *
 * Detects and visualizes:
 * - Screen dimensions and resolution
 * - Device pixel ratio (DPR)
 * - Color depth
 * - Browser window position and size on screen
 * - Window state (maximized, minimized estimate)
 * - Screen orientation
 * - Available screen area vs total
 * - Multi-monitor detection (via getScreenDetails API if available)
 *
 * Renders a miniature visual diagram of the screen(s) with the browser
 * window highlighted. Updates in real-time as the window moves/resizes.
 *
 * No commentary. The fact that a website knows your exact window
 * position on your 2560×1440 monitor is unsettling enough.
 */

interface ScreenInfo {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelRatio: number;
  orientation: string;
}

interface WindowInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
}

interface ExternalScreen {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary: boolean;
  isInternal: boolean;
  devicePixelRatio: number;
}

export function ScreenTopology() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [screenInfo, setScreenInfo] = useState<ScreenInfo | null>(null);
  const [windowInfo, setWindowInfo] = useState<WindowInfo | null>(null);
  const [externalScreens, setExternalScreens] = useState<ExternalScreen[]>([]);
  const [multiMonitorSupport, setMultiMonitorSupport] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const rafRef = useRef<number>(0);

  const gatherScreenInfo = useCallback((): ScreenInfo => {
    const s = window.screen;
    let orientationType = "unknown";
    try {
      orientationType = s.orientation?.type || "unknown";
    } catch {
      // orientation may not be available
    }
    return {
      width: s.width,
      height: s.height,
      availWidth: s.availWidth,
      availHeight: s.availHeight,
      colorDepth: s.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: orientationType,
    };
  }, []);

  const gatherWindowInfo = useCallback((): WindowInfo => {
    return {
      x: window.screenX || window.screenLeft || 0,
      y: window.screenY || window.screenTop || 0,
      width: window.outerWidth,
      height: window.outerHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  }, []);

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Initial probe
  useEffect(() => {
    setScreenInfo(gatherScreenInfo());
    setWindowInfo(gatherWindowInfo());

    // Try multi-monitor API (Chrome 100+)
    const probeMultiMonitor = async () => {
      try {
        if ("getScreenDetails" in window) {
          const details = await (window as unknown as { getScreenDetails: () => Promise<{ screens: Array<{ label: string; left: number; top: number; width: number; height: number; isPrimary: boolean; isInternal: boolean; devicePixelRatio: number }> }> }).getScreenDetails();
          if (details?.screens?.length > 0) {
            setExternalScreens(
              details.screens.map((s) => ({
                label: s.label || "Unknown",
                left: s.left,
                top: s.top,
                width: s.width,
                height: s.height,
                isPrimary: s.isPrimary,
                isInternal: s.isInternal,
                devicePixelRatio: s.devicePixelRatio,
              })),
            );
            setMultiMonitorSupport(true);
          }
        }
      } catch {
        // Permission denied or API not available — fall back to single screen
      }

      setTimeout(() => setScanComplete(true), 1500);
    };

    probeMultiMonitor();
  }, [gatherScreenInfo, gatherWindowInfo]);

  // Real-time window position tracking
  useEffect(() => {
    let lastX = 0, lastY = 0, lastW = 0, lastH = 0;

    const track = () => {
      const x = window.screenX || window.screenLeft || 0;
      const y = window.screenY || window.screenTop || 0;
      const w = window.outerWidth;
      const h = window.outerHeight;

      if (x !== lastX || y !== lastY || w !== lastW || h !== lastH) {
        setWindowInfo(gatherWindowInfo());
        setScreenInfo(gatherScreenInfo());
        lastX = x;
        lastY = y;
        lastW = w;
        lastH = h;
      }

      rafRef.current = requestAnimationFrame(track);
    };

    rafRef.current = requestAnimationFrame(track);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gatherWindowInfo, gatherScreenInfo]);

  if (!visible || !screenInfo || !windowInfo) return null;

  // Calculate diagram dimensions
  const diagramWidth = 220;
  const diagramHeight = 100;

  // For multi-monitor: find bounding box of all screens
  let screens: { left: number; top: number; width: number; height: number; isPrimary: boolean; label: string }[];

  if (externalScreens.length > 0) {
    screens = externalScreens.map((s) => ({
      left: s.left,
      top: s.top,
      width: s.width,
      height: s.height,
      isPrimary: s.isPrimary,
      label: s.label,
    }));
  } else {
    screens = [
      {
        left: 0,
        top: 0,
        width: screenInfo.width,
        height: screenInfo.height,
        isPrimary: true,
        label: `${screenInfo.width}×${screenInfo.height}`,
      },
    ];
  }

  const minLeft = Math.min(...screens.map((s) => s.left));
  const minTop = Math.min(...screens.map((s) => s.top));
  const maxRight = Math.max(...screens.map((s) => s.left + s.width));
  const maxBottom = Math.max(...screens.map((s) => s.top + s.height));

  const totalW = maxRight - minLeft;
  const totalH = maxBottom - minTop;
  const scale = Math.min((diagramWidth - 20) / totalW, (diagramHeight - 10) / totalH);

  // Orientation shorthand
  const orientShort = screenInfo.orientation
    .replace("landscape-primary", "LANDSCAPE")
    .replace("landscape-secondary", "LANDSCAPE-INV")
    .replace("portrait-primary", "PORTRAIT")
    .replace("portrait-secondary", "PORTRAIT-INV")
    .replace("unknown", "—");

  // Taskbar/dock height estimate
  const taskbarH = screenInfo.height - screenInfo.availHeight;
  const taskbarW = screenInfo.width - screenInfo.availWidth;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(0, 170, 255, 0.12)",
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(0, 170, 255, 0.04)",
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
          borderBottom: "1px solid rgba(0, 170, 255, 0.1)",
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
              background: scanComplete ? "#00aaff" : "#ffaa00",
              animation: scanComplete ? "st-idle 3s ease-in-out infinite" : "st-scan 0.6s ease-in-out infinite",
              boxShadow: scanComplete ? "0 0 4px #00aaff" : "0 0 4px #ffaa00",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#00aaff",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            DISPLAY TOPOLOGY
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {multiMonitorSupport && (
            <span style={{ fontSize: "8px", color: "#ff0040", letterSpacing: "1px" }}>
              {externalScreens.length} DISPLAYS
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#444" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Visual diagram */}
          <div
            style={{
              background: "rgba(0, 170, 255, 0.02)",
              border: "1px solid rgba(0, 170, 255, 0.06)",
              borderRadius: "2px",
              padding: "5px",
              marginBottom: "6px",
              position: "relative",
              height: `${diagramHeight}px`,
              overflow: "hidden",
            }}
          >
            <svg
              width={diagramWidth}
              height={diagramHeight}
              style={{ display: "block", margin: "0 auto" }}
            >
              <title>Screen topology diagram</title>
              {/* Screens */}
              {screens.map((s, i) => {
                const sx = (s.left - minLeft) * scale + 10;
                const sy = (s.top - minTop) * scale + 5;
                const sw = s.width * scale;
                const sh = s.height * scale;

                return (
                  <g key={`screen-${i}-${s.left}-${s.top}`}>
                    {/* Screen outline */}
                    <rect
                      x={sx}
                      y={sy}
                      width={sw}
                      height={sh}
                      fill="rgba(0, 170, 255, 0.03)"
                      stroke={s.isPrimary ? "rgba(0, 170, 255, 0.3)" : "rgba(0, 170, 255, 0.15)"}
                      strokeWidth={s.isPrimary ? 1.5 : 0.75}
                      rx={1}
                    />
                    {/* Screen label */}
                    <text
                      x={sx + sw / 2}
                      y={sy + sh / 2 + (externalScreens.length > 1 ? -4 : 0)}
                      textAnchor="middle"
                      fill="rgba(0, 170, 255, 0.25)"
                      fontSize="7"
                      fontFamily="'Courier New', monospace"
                    >
                      {s.width}×{s.height}
                    </text>
                    {/* Primary indicator */}
                    {s.isPrimary && externalScreens.length > 1 && (
                      <text
                        x={sx + sw / 2}
                        y={sy + sh / 2 + 6}
                        textAnchor="middle"
                        fill="rgba(0, 170, 255, 0.15)"
                        fontSize="5"
                        fontFamily="'Courier New', monospace"
                        letterSpacing="1"
                      >
                        PRIMARY
                      </text>
                    )}
                    {/* Stand */}
                    <line
                      x1={sx + sw / 2 - 8}
                      y1={sy + sh}
                      x2={sx + sw / 2 + 8}
                      y2={sy + sh}
                      stroke="rgba(0, 170, 255, 0.1)"
                      strokeWidth="0.5"
                    />
                    <line
                      x1={sx + sw / 2}
                      y1={sy + sh}
                      x2={sx + sw / 2}
                      y2={sy + sh + 3}
                      stroke="rgba(0, 170, 255, 0.1)"
                      strokeWidth="0.5"
                    />
                    <line
                      x1={sx + sw / 2 - 6}
                      y1={sy + sh + 3}
                      x2={sx + sw / 2 + 6}
                      y2={sy + sh + 3}
                      stroke="rgba(0, 170, 255, 0.1)"
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}

              {/* Browser window overlay */}
              {(() => {
                const winX = (windowInfo.x - minLeft) * scale + 10;
                const winY = (windowInfo.y - minTop) * scale + 5;
                const winW = windowInfo.width * scale;
                const winH = windowInfo.height * scale;

                return (
                  <g>
                    <rect
                      x={winX}
                      y={winY}
                      width={Math.max(winW, 2)}
                      height={Math.max(winH, 2)}
                      fill="rgba(255, 0, 64, 0.08)"
                      stroke="#ff0040"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      rx={0.5}
                    >
                      <animate
                        attributeName="stroke-opacity"
                        values="0.8;0.3;0.8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </rect>
                    {/* Window label */}
                    <text
                      x={winX + Math.max(winW, 2) / 2}
                      y={winY - 2}
                      textAnchor="middle"
                      fill="#ff0040"
                      fontSize="5"
                      fontFamily="'Courier New', monospace"
                      letterSpacing="0.5"
                      opacity="0.7"
                    >
                      WINDOW
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Screen data */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2px 8px",
              marginBottom: "6px",
            }}
          >
            <StRow label="RESOLUTION" value={`${screenInfo.width}×${screenInfo.height}`} color="#00aaff" />
            <StRow label="COLOR DEPTH" value={`${screenInfo.colorDepth}-bit`} color="#888" />
            <StRow label="PIXEL RATIO" value={`${screenInfo.pixelRatio}x`} color={screenInfo.pixelRatio > 1 ? "#ffaa00" : "#555"} />
            <StRow label="ORIENTATION" value={orientShort} color="#555" />
            <StRow label="AVAILABLE" value={`${screenInfo.availWidth}×${screenInfo.availHeight}`} color="#666" />
            {(taskbarH > 0 || taskbarW > 0) && (
              <StRow
                label="RESERVED"
                value={taskbarH > 0 ? `${taskbarH}px H` : `${taskbarW}px W`}
                color="#444"
              />
            )}
          </div>

          {/* Window data */}
          <div
            style={{
              paddingTop: "5px",
              borderTop: "1px solid rgba(0, 170, 255, 0.06)",
            }}
          >
            <div
              style={{
                fontSize: "8px",
                color: "#00aaff",
                letterSpacing: "1.5px",
                marginBottom: "4px",
                opacity: 0.6,
              }}
            >
              BROWSER WINDOW
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2px 8px",
              }}
            >
              <StRow label="POSITION" value={`${windowInfo.x}, ${windowInfo.y}`} color="#ff0040" />
              <StRow label="OUTER" value={`${windowInfo.width}×${windowInfo.height}`} color="#888" />
              <StRow label="VIEWPORT" value={`${windowInfo.innerWidth}×${windowInfo.innerHeight}`} color="#888" />
              <StRow
                label="CHROME"
                value={`${windowInfo.width - windowInfo.innerWidth}×${windowInfo.height - windowInfo.innerHeight}`}
                color="#444"
              />
            </div>
          </div>

          {/* Multi-monitor details */}
          {externalScreens.length > 1 && (
            <div
              style={{
                paddingTop: "5px",
                marginTop: "5px",
                borderTop: "1px solid rgba(0, 170, 255, 0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "8px",
                  color: "#ff0040",
                  letterSpacing: "1.5px",
                  marginBottom: "4px",
                  opacity: 0.7,
                }}
              >
                DETECTED DISPLAYS
              </div>
              {externalScreens.map((s, i) => (
                <div
                  key={`ext-${i}-${s.label}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "1px",
                    paddingLeft: "4px",
                    borderLeft: `1px solid ${s.isPrimary ? "rgba(255, 0, 64, 0.3)" : "rgba(0, 170, 255, 0.1)"}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "7px",
                      color: "#555",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      marginRight: "6px",
                    }}
                  >
                    {s.label}
                    {s.isPrimary && (
                      <span style={{ color: "#ff0040", marginLeft: "4px", fontSize: "5px" }}>●</span>
                    )}
                  </span>
                  <span style={{ fontSize: "8px", color: "#444", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {s.width}×{s.height}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes st-scan {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes st-idle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function StRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: "6px", color: "#444", letterSpacing: "1px" }}>{label}</span>
      <span
        style={{
          fontSize: "9px",
          color,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.3px",
        }}
      >
        {value}
      </span>
    </div>
  );
}
