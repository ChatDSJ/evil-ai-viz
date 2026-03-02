import { useEffect, useState, useRef } from "react";

/**
 * PermissionProbe — Silently queries every available browser permission
 * and enumerates connected media devices. Shows which doors are already
 * open (camera, mic, geolocation, etc.) and how many input/output devices
 * the hardware has. Also enumerates installed speech synthesis voices.
 *
 * No commentary. Just facts about what's exposed.
 */

interface PermissionResult {
  name: string;
  label: string;
  state: "granted" | "denied" | "prompt" | "unsupported";
  icon: string;
}

interface ProbeData {
  permissions: PermissionResult[];
  mediaDevices: {
    audioinput: number;
    audiooutput: number;
    videoinput: number;
    labels: string[];
  };
  voices: number;
  voiceLangs: string[];
  gamepadSlots: number;
  gamepadsConnected: number;
  serviceWorkers: "supported" | "unsupported";
  webgl2: "supported" | "unsupported";
  webgpu: "supported" | "unsupported";
  bluetooth: "supported" | "unsupported";
  usb: "supported" | "unsupported";
  serial: "supported" | "unsupported";
  hid: "supported" | "unsupported";
  midi: "supported" | "unsupported";
  wakeLock: "supported" | "unsupported";
  xr: "supported" | "unsupported";
}

const PERMISSIONS_TO_CHECK = [
  { name: "camera", label: "CAMERA", icon: "◉" },
  { name: "microphone", label: "MICROPHONE", icon: "◎" },
  { name: "geolocation", label: "GEOLOCATION", icon: "⊕" },
  { name: "notifications", label: "NOTIFICATIONS", icon: "▣" },
  { name: "persistent-storage", label: "PERSISTENT STORAGE", icon: "▤" },
  { name: "push", label: "PUSH", icon: "△", userVisibleOnly: true },
  { name: "screen-wake-lock", label: "WAKE LOCK", icon: "◈" },
  { name: "local-fonts", label: "LOCAL FONTS", icon: "▦" },
  { name: "window-management", label: "WINDOW MGMT", icon: "⊞" },
  { name: "display-capture", label: "SCREEN CAPTURE", icon: "▩" },
  { name: "midi", label: "MIDI", icon: "♪" },
  { name: "clipboard-read", label: "CLIPBOARD READ", icon: "▧" },
  { name: "clipboard-write", label: "CLIPBOARD WRITE", icon: "▨" },
  { name: "accelerometer", label: "ACCELEROMETER", icon: "⊘" },
  { name: "gyroscope", label: "GYROSCOPE", icon: "⊗" },
  { name: "magnetometer", label: "MAGNETOMETER", icon: "⊙" },
  { name: "ambient-light-sensor", label: "AMBIENT LIGHT", icon: "☉" },
  { name: "background-fetch", label: "BG FETCH", icon: "⇣" },
  { name: "background-sync", label: "BG SYNC", icon: "⇡" },
  { name: "storage-access", label: "STORAGE ACCESS", icon: "▥" },
];

const STATE_COLORS: Record<string, string> = {
  granted: "#ff0040",
  denied: "#444",
  prompt: "#555",
  unsupported: "#2a2a2a",
};

const STATE_LABELS: Record<string, string> = {
  granted: "GRANTED",
  denied: "DENIED",
  prompt: "PROMPT",
  unsupported: "—",
};

async function probePermissions(): Promise<PermissionResult[]> {
  const results: PermissionResult[] = [];

  for (const perm of PERMISSIONS_TO_CHECK) {
    try {
      const desc: PermissionDescriptor & { userVisibleOnly?: boolean } = {
        name: perm.name as PermissionName,
      };
      if ((perm as { userVisibleOnly?: boolean }).userVisibleOnly) {
        desc.userVisibleOnly = true;
      }
      const status = await navigator.permissions.query(desc);
      results.push({
        name: perm.name,
        label: perm.label,
        state: status.state as "granted" | "denied" | "prompt",
        icon: perm.icon,
      });
    } catch {
      results.push({
        name: perm.name,
        label: perm.label,
        state: "unsupported",
        icon: perm.icon,
      });
    }
  }

  return results;
}

async function probeMediaDevices(): Promise<ProbeData["mediaDevices"]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioinput = devices.filter((d) => d.kind === "audioinput").length;
    const audiooutput = devices.filter((d) => d.kind === "audiooutput").length;
    const videoinput = devices.filter((d) => d.kind === "videoinput").length;
    const labels = devices
      .filter((d) => d.label)
      .map((d) => d.label)
      .slice(0, 6);
    return { audioinput, audiooutput, videoinput, labels };
  } catch {
    return { audioinput: 0, audiooutput: 0, videoinput: 0, labels: [] };
  }
}

function probeVoices(): { count: number; langs: string[] } {
  try {
    const voices = speechSynthesis?.getVoices?.() || [];
    const langs = [...new Set(voices.map((v) => v.lang.split("-")[0].toUpperCase()))];
    return { count: voices.length, langs: langs.slice(0, 8) };
  } catch {
    return { count: 0, langs: [] };
  }
}

function probeGamepads(): { slots: number; connected: number } {
  try {
    const gamepads = navigator.getGamepads?.() || [];
    const connected = Array.from(gamepads).filter(Boolean).length;
    return { slots: gamepads.length, connected };
  } catch {
    return { slots: 0, connected: 0 };
  }
}

function checkSupport(feature: string): "supported" | "unsupported" {
  const checks: Record<string, () => boolean> = {
    serviceWorkers: () => "serviceWorker" in navigator,
    webgl2: () => {
      try {
        const c = document.createElement("canvas");
        return !!c.getContext("webgl2");
      } catch {
        return false;
      }
    },
    webgpu: () => "gpu" in navigator,
    bluetooth: () => "bluetooth" in navigator,
    usb: () => "usb" in navigator,
    serial: () => "serial" in navigator,
    hid: () => "hid" in navigator,
    midi: () => "requestMIDIAccess" in navigator,
    wakeLock: () => "wakeLock" in navigator,
    xr: () => "xr" in navigator,
  };

  try {
    return checks[feature]?.() ? "supported" : "unsupported";
  } catch {
    return "unsupported";
  }
}

export function PermissionProbe() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [probeData, setProbeData] = useState<ProbeData | null>(null);
  const [revealedPerms, setRevealedPerms] = useState(0);
  const [scanPhase, setScanPhase] = useState<"scanning" | "devices" | "apis" | "complete">("scanning");
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Run probes on mount
  useEffect(() => {
    const run = async () => {
      setTimeout(() => setVisible(true), 1500);

      const [permissions, mediaDevices] = await Promise.all([
        probePermissions(),
        probeMediaDevices(),
      ]);

      const voiceData = probeVoices();
      const gamepadData = probeGamepads();

      const data: ProbeData = {
        permissions,
        mediaDevices,
        voices: voiceData.count,
        voiceLangs: voiceData.langs,
        gamepadSlots: gamepadData.slots,
        gamepadsConnected: gamepadData.connected,
        serviceWorkers: checkSupport("serviceWorkers"),
        webgl2: checkSupport("webgl2"),
        webgpu: checkSupport("webgpu"),
        bluetooth: checkSupport("bluetooth"),
        usb: checkSupport("usb"),
        serial: checkSupport("serial"),
        hid: checkSupport("hid"),
        midi: checkSupport("midi"),
        wakeLock: checkSupport("wakeLock"),
        xr: checkSupport("xr"),
      };

      setProbeData(data);
    };

    run();
  }, []);

  // Reveal permissions one by one
  useEffect(() => {
    if (!probeData || !visible) return;

    const total = probeData.permissions.length;
    let count = 0;

    scanTimerRef.current = setInterval(() => {
      count++;
      setRevealedPerms(count);

      if (count >= total) {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        setTimeout(() => setScanPhase("devices"), 400);
        setTimeout(() => setScanPhase("apis"), 1200);
        setTimeout(() => setScanPhase("complete"), 2000);
      }
    }, 120);

    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [probeData, visible]);

  // Re-probe voices (they often load asynchronously)
  useEffect(() => {
    const handleVoicesChanged = () => {
      if (probeData) {
        const voiceData = probeVoices();
        setProbeData((prev) =>
          prev ? { ...prev, voices: voiceData.count, voiceLangs: voiceData.langs } : prev,
        );
      }
    };

    speechSynthesis?.addEventListener?.("voiceschanged", handleVoicesChanged);
    // Try once more after a delay
    const timer = setTimeout(handleVoicesChanged, 2000);

    return () => {
      speechSynthesis?.removeEventListener?.("voiceschanged", handleVoicesChanged);
      clearTimeout(timer);
    };
  }, [probeData]);

  if (!visible || !probeData) return null;

  const granted = probeData.permissions.filter((p) => p.state === "granted");
  const denied = probeData.permissions.filter((p) => p.state === "denied");
  const supported = probeData.permissions.filter((p) => p.state !== "unsupported");

  const md = probeData.mediaDevices;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(0, 212, 255, 0.12)",
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(0, 212, 255, 0.04)",
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
          borderBottom: "1px solid rgba(0, 212, 255, 0.1)",
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
              background: scanPhase === "complete" ? "#00d4ff" : "#ffaa00",
              animation: scanPhase !== "complete" ? "pp-scan 0.6s ease-in-out infinite" : "pp-idle 3s ease-in-out infinite",
              boxShadow: scanPhase === "complete" ? "0 0 4px #00d4ff" : "0 0 4px #ffaa00",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#00d4ff",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            ACCESS VECTORS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {scanPhase !== "complete" && (
            <span style={{ fontSize: "9px", color: "#555", letterSpacing: "1px" }}>
              PROBING
            </span>
          )}
          {scanPhase === "complete" && granted.length > 0 && (
            <span
              style={{
                fontSize: "9px",
                color: "#ff0040",
                letterSpacing: "1px",
                padding: "1px 4px",
                border: "1px solid rgba(255, 0, 64, 0.3)",
                borderRadius: "2px",
              }}
            >
              {granted.length} OPEN
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#444" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Permission grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1px",
              marginBottom: "6px",
            }}
          >
            {probeData.permissions.slice(0, revealedPerms).map((perm) => (
              <div
                key={perm.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "2px 3px",
                  background:
                    perm.state === "granted"
                      ? "rgba(255, 0, 64, 0.06)"
                      : "transparent",
                  borderRadius: "2px",
                  animation: "pp-line-in 0.15s ease-out",
                }}
              >
                <span
                  style={{
                    fontSize: "8px",
                    color: STATE_COLORS[perm.state],
                    opacity: perm.state === "unsupported" ? 0.3 : 1,
                    width: "10px",
                    textAlign: "center",
                  }}
                >
                  {perm.icon}
                </span>
                <span
                  style={{
                    fontSize: "7px",
                    color: perm.state === "unsupported" ? "#2a2a2a" : "#555",
                    letterSpacing: "0.5px",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {perm.label}
                </span>
                <span
                  style={{
                    fontSize: "7px",
                    color: STATE_COLORS[perm.state],
                    letterSpacing: "0.5px",
                    fontWeight: perm.state === "granted" ? "bold" : "normal",
                  }}
                >
                  {STATE_LABELS[perm.state]}
                </span>
              </div>
            ))}
          </div>

          {/* Scan progress */}
          {scanPhase === "scanning" && (
            <div style={{ marginBottom: "6px" }}>
              <div
                style={{
                  height: "1px",
                  background: "rgba(255, 255, 255, 0.04)",
                  borderRadius: "1px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(revealedPerms / probeData.permissions.length) * 100}%`,
                    background: "#00d4ff",
                    transition: "width 0.1s linear",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "7px",
                  color: "#444",
                  letterSpacing: "1px",
                  textAlign: "center",
                  marginTop: "3px",
                }}
              >
                {revealedPerms}/{probeData.permissions.length} PERMISSIONS QUERIED
              </div>
            </div>
          )}

          {/* Summary */}
          {scanPhase !== "scanning" && (
            <div
              style={{
                padding: "4px 0",
                borderTop: "1px solid rgba(0, 212, 255, 0.06)",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "2px",
                }}
              >
                <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>
                  QUERYABLE
                </span>
                <span style={{ fontSize: "9px", color: "#555" }}>{supported.length}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "2px",
                }}
              >
                <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>
                  OPEN
                </span>
                <span style={{ fontSize: "9px", color: granted.length > 0 ? "#ff0040" : "#333" }}>
                  {granted.length}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>
                  BLOCKED
                </span>
                <span style={{ fontSize: "9px", color: "#444" }}>{denied.length}</span>
              </div>
            </div>
          )}

          {/* Media Devices */}
          {(scanPhase === "devices" || scanPhase === "apis" || scanPhase === "complete") && (
            <div
              style={{
                padding: "4px 0",
                borderTop: "1px solid rgba(0, 212, 255, 0.06)",
                marginBottom: "4px",
                animation: "pp-section-in 0.5s ease-out",
              }}
            >
              <div
                style={{
                  fontSize: "8px",
                  color: "#00d4ff",
                  letterSpacing: "1.5px",
                  marginBottom: "4px",
                  opacity: 0.7,
                }}
              >
                MEDIA HARDWARE
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "4px",
                  marginBottom: "4px",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "14px", color: md.videoinput > 0 ? "#ff0040" : "#333", fontWeight: "bold" }}>
                    {md.videoinput}
                  </div>
                  <div style={{ fontSize: "6px", color: "#555", letterSpacing: "1px" }}>CAMERAS</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "14px", color: md.audioinput > 0 ? "#ffaa00" : "#333", fontWeight: "bold" }}>
                    {md.audioinput}
                  </div>
                  <div style={{ fontSize: "6px", color: "#555", letterSpacing: "1px" }}>MICS</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "14px", color: md.audiooutput > 0 ? "#00d4ff" : "#333", fontWeight: "bold" }}>
                    {md.audiooutput}
                  </div>
                  <div style={{ fontSize: "6px", color: "#555", letterSpacing: "1px" }}>SPEAKERS</div>
                </div>
              </div>
              {/* Device labels (only available if permission was granted) */}
              {md.labels.length > 0 && (
                <div style={{ marginTop: "2px" }}>
                  {md.labels.map((label, i) => (
                    <div
                      key={`dev-${i}-${label.slice(0, 10)}`}
                      style={{
                        fontSize: "7px",
                        color: "#444",
                        letterSpacing: "0.3px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingLeft: "4px",
                        borderLeft: "1px solid rgba(0, 212, 255, 0.1)",
                        marginBottom: "1px",
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* API Surface */}
          {(scanPhase === "apis" || scanPhase === "complete") && (
            <div
              style={{
                padding: "4px 0",
                borderTop: "1px solid rgba(0, 212, 255, 0.06)",
                animation: "pp-section-in 0.5s ease-out",
              }}
            >
              <div
                style={{
                  fontSize: "8px",
                  color: "#00d4ff",
                  letterSpacing: "1.5px",
                  marginBottom: "4px",
                  opacity: 0.7,
                }}
              >
                ATTACK SURFACE
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "2px",
                }}
              >
                {([
                  ["WebGL2", probeData.webgl2],
                  ["WebGPU", probeData.webgpu],
                  ["Bluetooth", probeData.bluetooth],
                  ["USB", probeData.usb],
                  ["Serial", probeData.serial],
                  ["HID", probeData.hid],
                  ["MIDI", probeData.midi],
                  ["WakeLock", probeData.wakeLock],
                  ["WebXR", probeData.xr],
                  ["ServiceWorker", probeData.serviceWorkers],
                ] as [string, string][]).map(([name, state]) => (
                  <span
                    key={name}
                    style={{
                      fontSize: "7px",
                      color: state === "supported" ? "#00ff41" : "#2a2a2a",
                      padding: "1px 4px",
                      background:
                        state === "supported"
                          ? "rgba(0, 255, 65, 0.04)"
                          : "transparent",
                      border: `1px solid ${state === "supported" ? "rgba(0, 255, 65, 0.1)" : "rgba(255,255,255,0.03)"}`,
                      borderRadius: "2px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>

              {/* Voice synthesis */}
              {probeData.voices > 0 && (
                <div style={{ marginTop: "4px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>
                      TTS VOICES
                    </span>
                    <span style={{ fontSize: "9px", color: "#555" }}>
                      {probeData.voices}
                    </span>
                  </div>
                  {probeData.voiceLangs.length > 0 && (
                    <div
                      style={{
                        fontSize: "7px",
                        color: "#333",
                        letterSpacing: "0.5px",
                        marginTop: "1px",
                      }}
                    >
                      {probeData.voiceLangs.join(" · ")}
                    </div>
                  )}
                </div>
              )}

              {/* Gamepads */}
              {probeData.gamepadSlots > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "3px",
                  }}
                >
                  <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>
                    GAMEPAD SLOTS
                  </span>
                  <span style={{ fontSize: "9px", color: probeData.gamepadsConnected > 0 ? "#ffaa00" : "#333" }}>
                    {probeData.gamepadsConnected}/{probeData.gamepadSlots}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes pp-scan {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes pp-idle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pp-line-in {
          from { opacity: 0; transform: translateX(-3px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pp-section-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
