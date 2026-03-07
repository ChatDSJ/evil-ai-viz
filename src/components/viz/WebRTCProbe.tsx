import { useEffect, useState, useRef } from "react";

/**
 * WebRTCProbe — Uses RTCPeerConnection ICE candidate gathering to
 * discover local/private IP addresses without any permission prompt.
 *
 * This is a well-documented privacy technique: creating a peer connection
 * with a STUN server causes the browser to enumerate network interfaces,
 * revealing local IPs (192.168.x.x, 10.x.x, fd00::x) in ICE candidates.
 *
 * Shows:
 * - Local/private IPv4 addresses
 * - Local/private IPv6 addresses
 * - mDNS candidates (obfuscated .local addresses)
 * - STUN-resolved server-reflexive addresses
 * - Candidate types (host/srflx/relay)
 * - Network interface count
 * - Protocol (UDP/TCP)
 * - ICE gathering state progression
 *
 * No commentary. The fact that a website just casually reads your
 * private network addresses is alarming enough.
 */

interface ICECandidate {
  ip: string;
  port: number;
  type: "host" | "srflx" | "relay" | "prflx";
  protocol: "udp" | "tcp";
  component: string;
  foundation: string;
  priority: number;
  isMDNS: boolean;
  isIPv6: boolean;
  isPrivate: boolean;
  raw: string;
}

function isPrivateIP(ip: string): boolean {
  if (ip.endsWith(".local")) return true;
  // IPv4 private ranges
  if (/^10\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true; // link-local
  if (/^127\./.test(ip)) return true; // loopback
  // IPv6 private
  if (/^fe80:/i.test(ip)) return true; // link-local
  if (/^fc00:/i.test(ip) || /^fd/i.test(ip)) return true; // unique local
  if (/^::1$/.test(ip)) return true; // loopback
  return false;
}

function classifyIP(ip: string): string {
  if (ip.endsWith(".local")) return "mDNS";
  if (/^10\./.test(ip)) return "10.0.0.0/8";
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)) return "172.16.0.0/12";
  if (/^192\.168\./.test(ip)) return "192.168.0.0/16";
  if (/^169\.254\./.test(ip)) return "LINK-LOCAL";
  if (/^127\./.test(ip)) return "LOOPBACK";
  if (/^fe80:/i.test(ip)) return "IPv6-LL";
  if (/^fc00:|^fd/i.test(ip)) return "IPv6-ULA";
  return "PUBLIC";
}

const STUN_SERVERS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

export function WebRTCProbe() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [candidates, setCandidates] = useState<ICECandidate[]>([]);
  const [gatheringState, setGatheringState] = useState<string>("NEW");
  const [probeComplete, setProbeComplete] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const seenIPs = useRef<Set<string>>(new Set());

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Run WebRTC probe
  useEffect(() => {
    if (!visible) return;

    const pc = new RTCPeerConnection({
      iceServers: STUN_SERVERS.map(url => ({ urls: url })),
    });
    pcRef.current = pc;

    setGatheringState("GATHERING");

    // Create a data channel to trigger candidate gathering
    pc.createDataChannel("probe");

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const c = event.candidate;
        const candidateStr = c.candidate;

        // Parse the candidate string
        // Format: candidate:foundation component protocol priority ip port typ type ...
        const parts = candidateStr.split(" ");
        if (parts.length < 8) return;

        const ip = parts[4];
        const port = parseInt(parts[5], 10);
        const type = parts[7] as ICECandidate["type"];
        const protocol = parts[2]?.toLowerCase() as "udp" | "tcp";
        const foundation = parts[0]?.replace("candidate:", "") || "";
        const priority = parseInt(parts[3], 10) || 0;
        const component = parts[1] === "1" ? "RTP" : "RTCP";

        // Deduplicate by IP
        if (seenIPs.current.has(ip)) return;
        seenIPs.current.add(ip);

        const candidate: ICECandidate = {
          ip,
          port,
          type,
          protocol: protocol || "udp",
          component,
          foundation,
          priority,
          isMDNS: ip.endsWith(".local"),
          isIPv6: ip.includes(":") && !ip.endsWith(".local"),
          isPrivate: isPrivateIP(ip),
          raw: candidateStr,
        };

        setCandidates(prev => [...prev, candidate]);
      } else {
        // Gathering complete (null candidate)
        setGatheringState("COMPLETE");
        setProbeComplete(true);
      }
    };

    pc.onicegatheringstatechange = () => {
      setGatheringState(pc.iceGatheringState.toUpperCase());
      if (pc.iceGatheringState === "complete") {
        setProbeComplete(true);
      }
    };

    // Create offer to start gathering
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(() => {
        setGatheringState("FAILED");
        setProbeComplete(true);
      });

    // Timeout: if gathering doesn't complete in 8s, mark done
    const timeout = setTimeout(() => {
      if (!probeComplete) {
        setProbeComplete(true);
        setGatheringState("TIMEOUT");
      }
    }, 8000);

    return () => {
      clearTimeout(timeout);
      pc.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Progressive reveal of candidates
  useEffect(() => {
    if (candidates.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = revealedCount; i < candidates.length; i++) {
      timers.push(
        setTimeout(() => setRevealedCount(i + 1), (i - revealedCount) * 600 + 300)
      );
    }

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates.length]);

  if (!visible) return null;

  // Categorize candidates
  const privateIPs = candidates.filter(c => c.isPrivate && !c.isMDNS);
  const mdnsCandidates = candidates.filter(c => c.isMDNS);
  const publicIPs = candidates.filter(c => !c.isPrivate && !c.isMDNS);
  const uniqueInterfaces = new Set(candidates.map(c => c.foundation)).size;

  const statusColor = probeComplete
    ? (privateIPs.length > 0 ? "#ff0040" : "#00aaff")
    : "#ffaa00";

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: `1px solid rgba(${privateIPs.length > 0 ? "255, 0, 64" : "0, 200, 120"}, 0.15)`,
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: `0 0 20px rgba(${privateIPs.length > 0 ? "255, 0, 64" : "0, 200, 120"}, 0.04)`,
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
          borderBottom: `1px solid rgba(0, 200, 120, 0.1)`,
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
              background: statusColor,
              animation: probeComplete
                ? "rtc-idle 3s ease-in-out infinite"
                : "rtc-scan 0.5s ease-in-out infinite",
              boxShadow: `0 0 4px ${statusColor}`,
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#00c878",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            NETWORK INTERFACES
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "8px", color: "#444", letterSpacing: "1px" }}>
            {gatheringState}
          </span>
          <span style={{ fontSize: "11px", color: "#444" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* ICE Gathering indicator */}
          {!probeComplete && (
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
                  width: "100%",
                  background: "linear-gradient(90deg, transparent, #00c878, transparent)",
                  animation: "rtc-sweep 1.5s ease-in-out infinite",
                  borderRadius: "1px",
                }}
              />
            </div>
          )}

          {/* Candidate list */}
          <div style={{ display: "grid", gap: "3px" }}>
            {candidates.slice(0, revealedCount).map((c, i) => (
              <div
                key={`rtc-${c.ip}-${c.port}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "2px 4px",
                  background: c.isPrivate
                    ? "rgba(255, 0, 64, 0.04)"
                    : "rgba(0, 200, 120, 0.02)",
                  borderLeft: `2px solid ${
                    c.isMDNS ? "#555"
                    : c.isPrivate ? "#ff0040"
                    : c.type === "srflx" ? "#ffaa00"
                    : "#00c878"
                  }`,
                  borderRadius: "0 2px 2px 0",
                  animation: i === revealedCount - 1 ? "rtc-line-in 0.4s ease-out" : "none",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "1px", flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        color: c.isMDNS ? "#666"
                          : c.isPrivate ? "#ff0040"
                          : "#00c878",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "0.3px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.isMDNS
                        ? c.ip.slice(0, 8) + "…" + c.ip.slice(-6)
                        : c.ip}
                    </span>
                    <span style={{ fontSize: "8px", color: "#333" }}>:{c.port}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "6px", color: "#444", letterSpacing: "0.5px" }}>
                      {c.type.toUpperCase()}
                    </span>
                    <span style={{ fontSize: "6px", color: "#333", letterSpacing: "0.5px" }}>
                      {c.protocol.toUpperCase()}
                    </span>
                    {c.isPrivate && !c.isMDNS && (
                      <span style={{ fontSize: "6px", color: "#ff0040", letterSpacing: "0.5px" }}>
                        {classifyIP(c.ip)}
                      </span>
                    )}
                    {c.isMDNS && (
                      <span style={{ fontSize: "6px", color: "#555", letterSpacing: "0.5px" }}>
                        OBFUSCATED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {probeComplete && candidates.length > 0 && (
            <div
              style={{
                marginTop: "6px",
                paddingTop: "5px",
                borderTop: "1px solid rgba(0, 200, 120, 0.08)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2px 8px",
              }}
            >
              <RTCRow label="INTERFACES" value={`${uniqueInterfaces}`} color="#00c878" />
              <RTCRow label="CANDIDATES" value={`${candidates.length}`} color="#888" />
              {privateIPs.length > 0 && (
                <RTCRow label="PRIVATE IPs" value={`${privateIPs.length}`} color="#ff0040" />
              )}
              {publicIPs.length > 0 && (
                <RTCRow label="PUBLIC IPs" value={`${publicIPs.length}`} color="#ffaa00" />
              )}
              {mdnsCandidates.length > 0 && (
                <RTCRow label="mDNS" value={`${mdnsCandidates.length}`} color="#555" />
              )}
              <RTCRow
                label="PROTOCOLS"
                value={[...new Set(candidates.map(c => c.protocol.toUpperCase()))].join("/")}
                color="#444"
              />
            </div>
          )}

          {/* No candidates fallback */}
          {probeComplete && candidates.length === 0 && (
            <div
              style={{
                marginTop: "6px",
                padding: "4px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "8px", color: "#444", letterSpacing: "1px" }}>
                ICE CANDIDATES BLOCKED
              </span>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes rtc-scan {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes rtc-idle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes rtc-line-in {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes rtc-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

function RTCRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: "6px", color: "#444", letterSpacing: "1px" }}>{label}</span>
      <span style={{ fontSize: "9px", color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
