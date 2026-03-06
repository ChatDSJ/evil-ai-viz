import { useEffect, useState, useMemo } from "react";

/**
 * NetworkTiming — Uses the Performance Navigation Timing API to display
 * a precise waterfall of the page's network loading process.
 *
 * Shows each phase of the connection:
 * - DNS lookup duration
 * - TCP connection establishment
 * - TLS/SSL handshake
 * - Request → TTFB (Time to First Byte)
 * - Content download
 * - DOM processing
 *
 * Also displays:
 * - Total resource count and transfer size
 * - Connection protocol (h2, h3, http/1.1)
 * - Server timing entries (if any)
 * - Largest Contentful Paint
 *
 * Rendered as horizontal stacked timing bars. All real data from
 * performance.getEntriesByType('navigation').
 *
 * No commentary. A website casually displaying the precise timing
 * characteristics of your network path is disquieting enough.
 */

interface TimingPhase {
  label: string;
  start: number;
  end: number;
  color: string;
}

interface NetworkData {
  phases: TimingPhase[];
  totalTime: number;
  protocol: string;
  transferSize: number;
  decodedSize: number;
  resourceCount: number;
  totalTransferSize: number;
  ttfb: number;
  domContentLoaded: number;
  domComplete: number;
  lcp: number | null;
  fcp: number | null;
  redirectCount: number;
  serverTiming: string[];
}

function formatMs(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function collectTimingData(): NetworkData | null {
  const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (!entries.length) return null;
  const nav = entries[0];

  const phases: TimingPhase[] = [];

  // DNS
  if (nav.domainLookupEnd > nav.domainLookupStart) {
    phases.push({
      label: "DNS",
      start: nav.domainLookupStart,
      end: nav.domainLookupEnd,
      color: "#00d4ff",
    });
  }

  // TCP Connect
  if (nav.connectEnd > nav.connectStart) {
    phases.push({
      label: "TCP",
      start: nav.connectStart,
      end: nav.connectEnd,
      color: "#00ff41",
    });
  }

  // TLS/SSL
  if (nav.secureConnectionStart > 0 && nav.connectEnd > nav.secureConnectionStart) {
    phases.push({
      label: "TLS",
      start: nav.secureConnectionStart,
      end: nav.connectEnd,
      color: "#ffaa00",
    });
  }

  // Request → TTFB
  if (nav.responseStart > nav.requestStart) {
    phases.push({
      label: "TTFB",
      start: nav.requestStart,
      end: nav.responseStart,
      color: "#ff6600",
    });
  }

  // Content download
  if (nav.responseEnd > nav.responseStart) {
    phases.push({
      label: "DOWNLOAD",
      start: nav.responseStart,
      end: nav.responseEnd,
      color: "#ff00ff",
    });
  }

  // DOM Processing
  if (nav.domComplete > nav.responseEnd) {
    phases.push({
      label: "DOM",
      start: nav.responseEnd,
      end: nav.domComplete,
      color: "#aa44ff",
    });
  }

  // Resource entries
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  let totalTransfer = 0;
  for (const r of resources) {
    totalTransfer += r.transferSize || 0;
  }

  // Paint timing
  const paintEntries = performance.getEntriesByType("paint");
  const fcpEntry = paintEntries.find((e) => e.name === "first-contentful-paint");

  // LCP
  let lcp: number | null = null;
  try {
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    if (lcpEntries.length) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }
  } catch {
    // LCP not available in all browsers
  }

  // Server timing
  const serverTiming: string[] = [];
  if (nav.serverTiming) {
    for (const st of nav.serverTiming) {
      serverTiming.push(`${st.name}: ${st.duration ? formatMs(st.duration) : st.description || ""}`);
    }
  }

  return {
    phases,
    totalTime: nav.loadEventEnd || nav.domComplete || nav.responseEnd,
    protocol: nav.nextHopProtocol || "unknown",
    transferSize: nav.transferSize || 0,
    decodedSize: nav.decodedBodySize || 0,
    resourceCount: resources.length,
    totalTransferSize: totalTransfer + (nav.transferSize || 0),
    ttfb: nav.responseStart - nav.requestStart,
    domContentLoaded: nav.domContentLoadedEventEnd,
    domComplete: nav.domComplete,
    lcp,
    fcp: fcpEntry ? fcpEntry.startTime : null,
    redirectCount: nav.redirectCount || 0,
    serverTiming,
  };
}

export function NetworkTiming() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [scanPhase, setScanPhase] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  // Collect timing data after page has fully loaded
  useEffect(() => {
    const collect = () => {
      const d = collectTimingData();
      if (d) setData(d);
    };

    // Wait for load event or try immediately if already loaded
    if (document.readyState === "complete") {
      setTimeout(collect, 500);
    } else {
      window.addEventListener("load", () => setTimeout(collect, 500));
    }

    // Retry after a bit in case timing data isn't ready
    const retry = setTimeout(collect, 3000);
    return () => clearTimeout(retry);
  }, []);

  // Progressive reveal
  useEffect(() => {
    if (!data) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 5; i++) {
      timers.push(setTimeout(() => setScanPhase(i), i * 600));
    }
    return () => timers.forEach(clearTimeout);
  }, [data]);

  // Calculate bar widths
  const barData = useMemo(() => {
    if (!data || !data.phases.length) return [];
    const maxTime = Math.max(...data.phases.map((p) => p.end), data.totalTime);
    return data.phases.map((p) => ({
      ...p,
      widthPct: Math.max(2, ((p.end - p.start) / maxTime) * 100),
      offsetPct: (p.start / maxTime) * 100,
      duration: p.end - p.start,
    }));
  }, [data]);

  if (!data) return null;

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.85)",
        border: "1px solid rgba(0,180,255,0.3)",
        borderRadius: "3px",
        padding: collapsed ? "6px 10px" : "10px 12px",
        fontFamily: "'Courier New', monospace",
        fontSize: "9px",
        color: "#00d4ff",
        userSelect: "none",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          marginBottom: collapsed ? 0 : "8px",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#00d4ff",
              boxShadow: "0 0 4px #00d4ff",
              display: "inline-block",
              animation: scanPhase < 5 ? "pulse 1s ease-in-out infinite" : "none",
            }}
          />
          <span style={{ letterSpacing: "2px", fontSize: "8px", color: "#00d4ff", opacity: 0.9 }}>
            NETWORK PATH
          </span>
        </div>
        <span style={{ color: "#555", fontSize: "8px" }}>{collapsed ? "▸" : "▾"}</span>
      </div>

      {collapsed ? null : (
        <div>
          {/* Protocol + total time */}
          {scanPhase >= 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                fontSize: "8px",
              }}
            >
              <span style={{ color: "#00ff41" }}>{data.protocol.toUpperCase()}</span>
              <span style={{ color: "#aaa" }}>{formatMs(data.totalTime)}</span>
            </div>
          )}

          {/* Waterfall bars */}
          {scanPhase >= 2 && (
            <div style={{ marginBottom: "8px" }}>
              {barData.map((bar, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "3px",
                    height: "14px",
                    animation: `revealFadeIn 400ms ease-out ${i * 150}ms both`,
                  }}
                >
                  <span
                    style={{
                      width: "48px",
                      color: "#666",
                      fontSize: "7px",
                      flexShrink: 0,
                      textAlign: "right",
                      paddingRight: "6px",
                    }}
                  >
                    {bar.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      height: "10px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "1px",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: `${bar.offsetPct}%`,
                        width: `${bar.widthPct}%`,
                        height: "100%",
                        background: bar.color,
                        opacity: 0.7,
                        borderRadius: "1px",
                        transition: "width 0.5s ease-out",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: "48px",
                      color: bar.color,
                      fontSize: "7px",
                      flexShrink: 0,
                      textAlign: "right",
                      paddingLeft: "4px",
                    }}
                  >
                    {formatMs(bar.duration)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Key metrics */}
          {scanPhase >= 3 && (
            <div
              style={{
                borderTop: "1px solid rgba(0,180,255,0.15)",
                paddingTop: "6px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "3px 12px",
                fontSize: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>TTFB</span>
                <span style={{ color: "#ff6600" }}>{formatMs(data.ttfb)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>DOM READY</span>
                <span style={{ color: "#aa44ff" }}>{formatMs(data.domContentLoaded)}</span>
              </div>
              {data.fcp !== null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#555" }}>FCP</span>
                  <span style={{ color: "#00ff41" }}>{formatMs(data.fcp)}</span>
                </div>
              )}
              {data.lcp !== null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#555" }}>LCP</span>
                  <span style={{ color: "#ffaa00" }}>{formatMs(data.lcp)}</span>
                </div>
              )}
            </div>
          )}

          {/* Transfer stats */}
          {scanPhase >= 4 && (
            <div
              style={{
                borderTop: "1px solid rgba(0,180,255,0.1)",
                paddingTop: "5px",
                marginTop: "5px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "3px 12px",
                fontSize: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>RESOURCES</span>
                <span style={{ color: "#aaa" }}>{data.resourceCount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>TRANSFER</span>
                <span style={{ color: "#aaa" }}>{formatBytes(data.totalTransferSize)}</span>
              </div>
              {data.redirectCount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#555" }}>REDIRECTS</span>
                  <span style={{ color: "#ff4400" }}>{data.redirectCount}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>DOC SIZE</span>
                <span style={{ color: "#aaa" }}>{formatBytes(data.decodedSize)}</span>
              </div>
            </div>
          )}

          {/* Server timing (if available) */}
          {scanPhase >= 5 && data.serverTiming.length > 0 && (
            <div
              style={{
                borderTop: "1px solid rgba(0,180,255,0.1)",
                paddingTop: "4px",
                marginTop: "4px",
                fontSize: "7px",
                color: "#555",
              }}
            >
              {data.serverTiming.map((st, i) => (
                <div key={i}>{st}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
