import { useEffect, useState } from "react";

/**
 * PeripheralScan — Probes the browser for connected hardware peripherals
 * using real Web APIs. Enumerates everything it can detect:
 *
 * - Video input devices (cameras) via mediaDevices.enumerateDevices()
 * - Audio input devices (microphones) via mediaDevices.enumerateDevices()
 * - Audio output devices (speakers/headphones) via mediaDevices.enumerateDevices()
 * - Gamepads via navigator.getGamepads()
 * - Touch capability + max touch points
 * - Bluetooth API availability
 * - USB API availability
 * - HID (Human Interface Device) API availability
 * - Serial port API availability
 * - XR/VR headset detection via navigator.xr
 * - MIDI device access availability
 * - Pointer type (mouse/pen/touch)
 * - GPU (from WebGL)
 *
 * Each probe animates in one at a time (typewriter reveal) to suggest
 * an active scanning process. No commentary. Just the inventory.
 */

interface PeripheralLine {
  label: string;
  value: string;
  color: string;
  status: "detected" | "available" | "restricted" | "none" | "probing";
}

function getGPU(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl && gl instanceof WebGLRenderingContext) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "UNKNOWN";
      }
    }
    // Try WebGL2
    if (gl && "getParameter" in gl) {
      const ext = (gl as WebGL2RenderingContext).getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        return (gl as WebGL2RenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) || "UNKNOWN";
      }
    }
  } catch {
    // Ignored
  }
  return "UNKNOWN";
}

export function PeripheralScan() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [lines, setLines] = useState<PeripheralLine[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [gamepads, setGamepads] = useState(0);

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Run the probe sequence
  useEffect(() => {
    if (!visible) return;

    const probeResults: PeripheralLine[] = [];

    const runProbes = async () => {
      // 1. Media devices (cameras, mics, speakers)
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          const audioInputs = devices.filter((d) => d.kind === "audioinput");
          const audioOutputs = devices.filter((d) => d.kind === "audiooutput");

          probeResults.push({
            label: "VIDEO INPUTS",
            value: `${videoInputs.length} DEVICE${videoInputs.length !== 1 ? "S" : ""}`,
            color: videoInputs.length > 0 ? "#ff0040" : "#444",
            status: videoInputs.length > 0 ? "detected" : "none",
          });
          probeResults.push({
            label: "AUDIO INPUTS",
            value: `${audioInputs.length} DEVICE${audioInputs.length !== 1 ? "S" : ""}`,
            color: audioInputs.length > 0 ? "#ff0040" : "#444",
            status: audioInputs.length > 0 ? "detected" : "none",
          });
          probeResults.push({
            label: "AUDIO OUTPUTS",
            value: `${audioOutputs.length} DEVICE${audioOutputs.length !== 1 ? "S" : ""}`,
            color: audioOutputs.length > 0 ? "#ffaa00" : "#444",
            status: audioOutputs.length > 0 ? "detected" : "none",
          });
        } else {
          probeResults.push({
            label: "MEDIA DEVICES",
            value: "API BLOCKED",
            color: "#444",
            status: "restricted",
          });
        }
      } catch {
        probeResults.push({
          label: "MEDIA DEVICES",
          value: "ACCESS DENIED",
          color: "#444",
          status: "restricted",
        });
      }

      // 2. Touch capability
      const maxTouch = navigator.maxTouchPoints || 0;
      probeResults.push({
        label: "TOUCH POINTS",
        value: maxTouch > 0 ? `${maxTouch}` : "NONE",
        color: maxTouch > 0 ? "#00d4ff" : "#444",
        status: maxTouch > 0 ? "detected" : "none",
      });

      // 3. Gamepads
      try {
        const gp = navigator.getGamepads ? navigator.getGamepads() : [];
        const connected = gp ? Array.from(gp).filter(Boolean).length : 0;
        probeResults.push({
          label: "GAMEPADS",
          value: connected > 0 ? `${connected} CONNECTED` : "NONE",
          color: connected > 0 ? "#00ff41" : "#444",
          status: connected > 0 ? "detected" : "none",
        });
      } catch {
        probeResults.push({
          label: "GAMEPADS",
          value: "RESTRICTED",
          color: "#444",
          status: "restricted",
        });
      }

      // 4. Bluetooth
      try {
        const hasBluetooth = "bluetooth" in navigator;
        probeResults.push({
          label: "BLUETOOTH",
          value: hasBluetooth ? "AVAILABLE" : "NOT DETECTED",
          color: hasBluetooth ? "#00aaff" : "#444",
          status: hasBluetooth ? "available" : "none",
        });
      } catch {
        probeResults.push({
          label: "BLUETOOTH",
          value: "RESTRICTED",
          color: "#444",
          status: "restricted",
        });
      }

      // 5. USB
      try {
        const hasUSB = "usb" in navigator;
        probeResults.push({
          label: "USB",
          value: hasUSB ? "AVAILABLE" : "NOT DETECTED",
          color: hasUSB ? "#00aaff" : "#444",
          status: hasUSB ? "available" : "none",
        });
      } catch {
        probeResults.push({
          label: "USB",
          value: "RESTRICTED",
          color: "#444",
          status: "restricted",
        });
      }

      // 6. HID
      try {
        const hasHID = "hid" in navigator;
        probeResults.push({
          label: "HID",
          value: hasHID ? "AVAILABLE" : "NOT DETECTED",
          color: hasHID ? "#00aaff" : "#444",
          status: hasHID ? "available" : "none",
        });
      } catch {
        probeResults.push({
          label: "HID",
          value: "RESTRICTED",
          color: "#444",
          status: "restricted",
        });
      }

      // 7. Serial
      try {
        const hasSerial = "serial" in navigator;
        probeResults.push({
          label: "SERIAL",
          value: hasSerial ? "AVAILABLE" : "NOT DETECTED",
          color: hasSerial ? "#00aaff" : "#444",
          status: hasSerial ? "available" : "none",
        });
      } catch {
        probeResults.push({
          label: "SERIAL",
          value: "RESTRICTED",
          color: "#444",
          status: "restricted",
        });
      }

      // 8. XR/VR
      try {
        if ("xr" in navigator && navigator.xr) {
          const xr = navigator.xr as { isSessionSupported?: (mode: string) => Promise<boolean> };
          if (xr.isSessionSupported) {
            const vrSupported = await xr
              .isSessionSupported("immersive-vr")
              .catch(() => false);
            const arSupported = await xr
              .isSessionSupported("immersive-ar")
              .catch(() => false);

            if (vrSupported && arSupported) {
              probeResults.push({
                label: "XR",
                value: "VR + AR CAPABLE",
                color: "#ff0040",
                status: "detected",
              });
            } else if (vrSupported) {
              probeResults.push({
                label: "XR",
                value: "VR CAPABLE",
                color: "#ff0040",
                status: "detected",
              });
            } else if (arSupported) {
              probeResults.push({
                label: "XR",
                value: "AR CAPABLE",
                color: "#ff0040",
                status: "detected",
              });
            } else {
              probeResults.push({
                label: "XR",
                value: "API PRESENT",
                color: "#555",
                status: "available",
              });
            }
          } else {
            probeResults.push({
              label: "XR",
              value: "API PRESENT",
              color: "#555",
              status: "available",
            });
          }
        } else {
          probeResults.push({
            label: "XR",
            value: "NOT DETECTED",
            color: "#444",
            status: "none",
          });
        }
      } catch {
        probeResults.push({
          label: "XR",
          value: "RESTRICTED",
          color: "#444",
          status: "restricted",
        });
      }

      // 9. MIDI
      try {
        const hasMIDI = "requestMIDIAccess" in navigator;
        probeResults.push({
          label: "MIDI",
          value: hasMIDI ? "AVAILABLE" : "NOT DETECTED",
          color: hasMIDI ? "#aa88ff" : "#444",
          status: hasMIDI ? "available" : "none",
        });
      } catch {
        probeResults.push({
          label: "MIDI",
          value: "RESTRICTED",
          color: "#444",
          status: "restricted",
        });
      }

      // 10. Pointer type
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
      const pointerType = hasCoarsePointer && hasFinePointer
        ? "FINE + COARSE"
        : hasFinePointer
          ? "FINE (MOUSE/TRACKPAD)"
          : hasCoarsePointer
            ? "COARSE (TOUCH)"
            : "NONE";
      probeResults.push({
        label: "POINTER",
        value: pointerType,
        color: "#888",
        status: "detected",
      });

      // 11. GPU
      const gpu = getGPU();
      const gpuShort =
        gpu.length > 32 ? gpu.slice(0, 30) + "…" : gpu;
      probeResults.push({
        label: "GPU",
        value: gpuShort,
        color: gpu !== "UNKNOWN" ? "#ffaa00" : "#444",
        status: gpu !== "UNKNOWN" ? "detected" : "none",
      });

      setLines(probeResults);

      // Progressive reveal: show one line every 400ms
      for (let i = 0; i <= probeResults.length; i++) {
        setTimeout(
          () => {
            setRevealedCount(i);
            if (i === probeResults.length) {
              setScanComplete(true);
            }
          },
          i * 400,
        );
      }
    };

    runProbes();
  }, [visible]);

  // Live gamepad polling (gamepads connect/disconnect dynamically)
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const gp = navigator.getGamepads ? navigator.getGamepads() : [];
        const connected = gp ? Array.from(gp).filter(Boolean).length : 0;
        setGamepads(connected);
      } catch {
        // Ignored
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Update gamepad line in real-time
  useEffect(() => {
    if (!scanComplete) return;

    setLines((prev) =>
      prev.map((line) => {
        if (line.label === "GAMEPADS") {
          return {
            ...line,
            value: gamepads > 0 ? `${gamepads} CONNECTED` : "NONE",
            color: gamepads > 0 ? "#00ff41" : "#444",
            status: gamepads > 0 ? "detected" : "none",
          };
        }
        return line;
      }),
    );
  }, [gamepads, scanComplete]);

  if (!visible) return null;

  const statusDotColor = (() => {
    if (!scanComplete) return "#ffaa00";
    const detected = lines.filter((l) => l.status === "detected").length;
    if (detected >= 6) return "#ff0040";
    if (detected >= 3) return "#ffaa00";
    return "#00aaff";
  })();

  const detectedCount = lines.filter(
    (l) => l.status === "detected" || l.status === "available",
  ).length;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(170, 136, 255, 0.12)",
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(170, 136, 255, 0.04)",
        width: "100%",
        maxWidth: "250px",
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
          borderBottom: "1px solid rgba(170, 136, 255, 0.1)",
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
              background: statusDotColor,
              animation: scanComplete
                ? "ps-idle 3s ease-in-out infinite"
                : "ps-scan 0.5s ease-in-out infinite",
              boxShadow: `0 0 4px ${statusDotColor}`,
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#aa88ff",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            PERIPHERALS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {scanComplete && (
            <span
              style={{
                fontSize: "8px",
                color: "#555",
                letterSpacing: "1px",
              }}
            >
              {detectedCount}/{lines.length}
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#444" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Scan progress bar (during scan) */}
          {!scanComplete && lines.length > 0 && (
            <div
              style={{
                marginBottom: "6px",
                height: "2px",
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(revealedCount / lines.length) * 100}%`,
                  background: "linear-gradient(90deg, #aa88ff, #ff0040)",
                  transition: "width 0.4s ease",
                  borderRadius: "1px",
                }}
              />
            </div>
          )}

          {/* Probe results */}
          <div
            style={{
              display: "grid",
              gap: "2px",
            }}
          >
            {lines.slice(0, revealedCount).map((line, i) => (
              <div
                key={`ps-${line.label}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1px 0",
                  animation:
                    i === revealedCount - 1
                      ? "ps-line-in 0.3s ease-out"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {/* Status indicator dot */}
                  <div
                    style={{
                      width: "3px",
                      height: "3px",
                      borderRadius: "50%",
                      background:
                        line.status === "detected"
                          ? "#ff0040"
                          : line.status === "available"
                            ? "#00aaff"
                            : line.status === "restricted"
                              ? "#ffaa00"
                              : "#333",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "7px",
                      color: "#555",
                      letterSpacing: "1px",
                    }}
                  >
                    {line.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "8px",
                    color: line.color,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.3px",
                    textAlign: "right",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "140px",
                  }}
                >
                  {line.value}
                </span>
              </div>
            ))}
          </div>

          {/* Summary footer */}
          {scanComplete && (
            <div
              style={{
                marginTop: "6px",
                paddingTop: "5px",
                borderTop: "1px solid rgba(170, 136, 255, 0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "6px",
                  color: "#444",
                  letterSpacing: "1px",
                }}
              >
                SCAN COMPLETE
              </span>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "6px",
                    color: "#ff0040",
                    letterSpacing: "0.5px",
                  }}
                >
                  ● {lines.filter((l) => l.status === "detected").length}{" "}
                  DETECTED
                </span>
                <span
                  style={{
                    fontSize: "6px",
                    color: "#00aaff",
                    letterSpacing: "0.5px",
                  }}
                >
                  ● {lines.filter((l) => l.status === "available").length}{" "}
                  AVAILABLE
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes ps-scan {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes ps-idle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ps-line-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
