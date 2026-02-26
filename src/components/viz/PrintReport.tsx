import { useEffect, useState, useRef } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

/**
 * PrintReport — when the user triggers print (Ctrl+P / Cmd+P / File > Print),
 * the page transforms into a clean, official intelligence report containing
 * the user's real data. Uses @media print CSS to completely replace the
 * visual, plus a beforeprint event listener to gather data at print time.
 *
 * The report contains:
 * - Document reference number (derived from canvas fingerprint hash)
 * - Subject IP, location, ISP
 * - Device fingerprint (screen, GPU, CPU, memory, network)
 * - Session duration at time of print
 * - Complete browser/OS identification
 * - Timezone and language configuration
 * - A classification stamp
 *
 * If they try to print "evidence" of this site, the printout IS the evidence — of them.
 * No commentary. Just data in a governmental report format.
 */

interface ReportData {
  timestamp: string;
  sessionDuration: string;
  documentRef: string;
  ip: string;
  location: string;
  coordinates: string;
  isp: string;
  org: string;
  os: string;
  browser: string;
  screenRes: string;
  viewport: string;
  colorDepth: string;
  pixelRatio: string;
  cpuCores: string;
  gpu: string;
  deviceMemory: string;
  network: string;
  timezone: string;
  languages: string;
  touchPoints: string;
  doNotTrack: string;
  cookiesEnabled: string;
  canvasHash: string;
  platform: string;
  referrer: string;
  pageUrl: string;
  printCount: number;
}

function getCanvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "N/A";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("JOURNAL7", 2, 15);
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      hash = ((hash << 5) - hash) + dataUrl.charCodeAt(i);
      hash = hash & hash;
    }
    return `J7-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  } catch {
    return "J7-UNAVAILABLE";
  }
}

function getGPU(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return "Unavailable";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "Obfuscated";
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "Unknown";
  } catch {
    return "Blocked";
  }
}

function getNetworkType(): string {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; type?: string; downlink?: number; rtt?: number };
  };
  if (!nav.connection) return "Undetected";
  const c = nav.connection;
  const parts: string[] = [];
  if (c.type || c.effectiveType) parts.push((c.type || c.effectiveType || "").toUpperCase());
  if (c.downlink) parts.push(`${c.downlink} Mbps`);
  if (c.rtt) parts.push(`RTT ${c.rtt}ms`);
  return parts.join(" / ") || "Unknown";
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function PrintReport({ visitor }: { visitor: VisitorInfo }) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showReport, setShowReport] = useState(false);
  const sessionStartRef = useRef(Date.now());
  const printCountRef = useRef(0);

  // Listen for print events
  useEffect(() => {
    const handleBeforePrint = () => {
      printCountRef.current++;
      const now = new Date();
      const sessionMs = Date.now() - sessionStartRef.current;

      const nav = navigator as Navigator & { deviceMemory?: number };

      const data: ReportData = {
        timestamp: now.toISOString(),
        sessionDuration: formatDuration(sessionMs),
        documentRef: getCanvasHash(),
        ip: visitor.ip,
        location: `${visitor.city}, ${visitor.region}, ${visitor.country}`,
        coordinates: `${visitor.lat.toFixed(4)}, ${visitor.lon.toFixed(4)}`,
        isp: visitor.isp,
        org: visitor.org,
        os: visitor.osVersion || "Unknown",
        browser: visitor.browser || "Unknown",
        screenRes: `${screen.width} × ${screen.height}`,
        viewport: `${window.innerWidth} × ${window.innerHeight}`,
        colorDepth: `${screen.colorDepth}-bit`,
        pixelRatio: `${window.devicePixelRatio}x`,
        cpuCores: `${navigator.hardwareConcurrency || "Unknown"}`,
        gpu: getGPU(),
        deviceMemory: nav.deviceMemory ? `${nav.deviceMemory} GB` : "Restricted",
        network: getNetworkType(),
        timezone: `${Intl.DateTimeFormat().resolvedOptions().timeZone} (UTC${new Date().getTimezoneOffset() <= 0 ? "+" : "-"}${Math.abs(Math.floor(new Date().getTimezoneOffset() / 60)).toString().padStart(2, "0")}:${Math.abs(new Date().getTimezoneOffset() % 60).toString().padStart(2, "0")})`,
        languages: (navigator.languages?.join(", ") || navigator.language || "Unknown"),
        touchPoints: `${navigator.maxTouchPoints}`,
        doNotTrack: navigator.doNotTrack === "1" ? "Enabled" : "Disabled",
        cookiesEnabled: navigator.cookieEnabled ? "Yes" : "No",
        canvasHash: getCanvasHash(),
        platform: navigator.platform || "Unknown",
        referrer: document.referrer || "Direct",
        pageUrl: window.location.href,
        printCount: printCountRef.current,
      };

      setReportData(data);
      setShowReport(true);
    };

    const handleAfterPrint = () => {
      // Hide the report overlay after printing
      setTimeout(() => setShowReport(false), 500);
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [visitor]);

  return (
    <>
      {/* Print-only report overlay — visible only when printing */}
      {showReport && reportData && (
        <div className="print-report-overlay" aria-hidden="true">
          <div className="print-report">
            {/* Header */}
            <div className="print-header">
              <div className="print-classification">CLASSIFIED</div>
              <div className="print-title">SUBJECT ACTIVITY LOG</div>
              <div className="print-subtitle">
                Document Ref: {reportData.documentRef} &nbsp;|&nbsp; Generated: {reportData.timestamp}
              </div>
              <div className="print-subtitle">
                Print #{reportData.printCount} &nbsp;|&nbsp; Session Duration at Print: {reportData.sessionDuration}
              </div>
            </div>

            <div className="print-divider" />

            {/* Network Identity */}
            <div className="print-section">
              <div className="print-section-title">NETWORK IDENTITY</div>
              <table className="print-table">
                <tbody>
                  <PrintRow label="IP Address" value={reportData.ip} />
                  <PrintRow label="Location" value={reportData.location} />
                  <PrintRow label="Coordinates" value={reportData.coordinates} />
                  <PrintRow label="ISP" value={reportData.isp} />
                  <PrintRow label="Organization" value={reportData.org} />
                  <PrintRow label="Network Type" value={reportData.network} />
                  <PrintRow label="Entry Point" value={reportData.referrer} />
                </tbody>
              </table>
            </div>

            {/* Device Profile */}
            <div className="print-section">
              <div className="print-section-title">DEVICE PROFILE</div>
              <table className="print-table">
                <tbody>
                  <PrintRow label="Operating System" value={reportData.os} />
                  <PrintRow label="Browser" value={reportData.browser} />
                  <PrintRow label="Platform" value={reportData.platform} />
                  <PrintRow label="Display" value={`${reportData.screenRes} @ ${reportData.pixelRatio} · ${reportData.colorDepth}`} />
                  <PrintRow label="Viewport" value={reportData.viewport} />
                  <PrintRow label="CPU Cores" value={reportData.cpuCores} />
                  <PrintRow label="GPU" value={reportData.gpu} />
                  <PrintRow label="Device Memory" value={reportData.deviceMemory} />
                  <PrintRow label="Touch Points" value={reportData.touchPoints} />
                </tbody>
              </table>
            </div>

            {/* Configuration */}
            <div className="print-section">
              <div className="print-section-title">CONFIGURATION</div>
              <table className="print-table">
                <tbody>
                  <PrintRow label="Timezone" value={reportData.timezone} />
                  <PrintRow label="Languages" value={reportData.languages} />
                  <PrintRow label="Do Not Track" value={reportData.doNotTrack} />
                  <PrintRow label="Cookies" value={reportData.cookiesEnabled} />
                  <PrintRow label="Canvas Fingerprint" value={reportData.canvasHash} />
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="print-divider" />
            <div className="print-footer">
              <div>{reportData.pageUrl}</div>
              <div>This document was generated at the time of print. Contents reflect live session data.</div>
            </div>

            {/* Diagonal watermark */}
            <div className="print-watermark">CLASSIFIED</div>
          </div>
        </div>
      )}

      {/* Print styles — injected globally */}
      <style>{`
        /* Hide everything on print EXCEPT our report */
        @media print {
          body > *:not(.print-report-overlay) {
            display: none !important;
          }

          .print-report-overlay {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 999999 !important;
            background: white !important;
          }

          .print-report {
            max-width: 700px;
            margin: 0 auto;
            padding: 40px 50px;
            font-family: 'Courier New', 'Courier', monospace;
            color: #000;
            position: relative;
            background: white;
          }

          .print-header {
            text-align: center;
            margin-bottom: 20px;
          }

          .print-classification {
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #cc0000;
            border: 2px solid #cc0000;
            display: inline-block;
            padding: 3px 16px;
            margin-bottom: 16px;
          }

          .print-title {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 4px;
            margin-bottom: 8px;
            color: #000;
          }

          .print-subtitle {
            font-size: 10px;
            color: #444;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }

          .print-divider {
            border: none;
            border-top: 1px solid #000;
            margin: 16px 0;
          }

          .print-section {
            margin-bottom: 16px;
          }

          .print-section-title {
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 3px;
            color: #000;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #ccc;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
          }

          .print-table td {
            padding: 3px 0;
            font-size: 11px;
            vertical-align: top;
          }

          .print-table td:first-child {
            width: 160px;
            color: #666;
            font-size: 10px;
            letter-spacing: 0.5px;
          }

          .print-table td:last-child {
            color: #000;
            word-break: break-all;
          }

          .print-footer {
            text-align: center;
            font-size: 9px;
            color: #888;
            letter-spacing: 0.5px;
            line-height: 1.6;
          }

          .print-watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 80px;
            font-weight: bold;
            color: rgba(200, 0, 0, 0.06);
            letter-spacing: 20px;
            pointer-events: none;
            white-space: nowrap;
          }
        }

        /* Hide in screen view */
        @media screen {
          .print-report-overlay {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

function PrintRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{value}</td>
    </tr>
  );
}
