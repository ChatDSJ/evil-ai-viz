import { useEffect, useState, useRef, useMemo } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface Props {
  visitor: VisitorInfo;
}

function getPersonalizedCommands(v: VisitorInfo): string[] {
  const city = v.city || "UNKNOWN";
  const isp = v.isp || "UNKNOWN ISP";
  const ip = v.ip || "?.?.?.?";
  const os = v.osVersion || "Unknown OS";
  const region = v.region || "UNKNOWN";
  const country = v.country || "UNKNOWN";
  const lat = v.lat?.toFixed(4) || "0.0000";
  const lon = v.lon?.toFixed(4) || "0.0000";

  return [
    // Phase 1: Discovery
    `$ nmap -sV -O ${ip}`,
    `[SCAN] Host ${ip} is up (0.023s latency)`,
    `[SCAN] OS detection: ${os}`,
    `[SCAN] ISP identified: ${isp}`,
    `$ whois ${ip} | grep -i org`,
    `[OK] Organization: ${isp}`,
    `$ geolocate --precision=high ${ip}`,
    `[GEO] Location: ${city}, ${region}, ${country}`,
    `[GEO] Coordinates: ${lat}, ${lon}`,
    `[GEO] Precision: 12m radius — LOCKED`,

    // Phase 2: Infiltration
    `$ ssh -o StrictHostKeyChecking=no root@${ip}`,
    `[OK] Connection established via ${isp} backbone`,
    `[AI] Analyzing network topology in ${city} area...`,
    `$ traceroute ${ip}`,
    `[ROUTE] 14 hops through ${isp} infrastructure`,
    `[AI] Mapping all devices on ${isp} subnet...`,
    `$ ./reverse_tunnel.sh --target=${ip} --stealth=max`,
    `[TUNNEL] Reverse tunnel to ${city} established`,
    `[TUNNEL] Latency: ${(Math.random() * 50 + 10).toFixed(1)}ms via ${isp}`,
    `[AI] Deploying local agent to ${os} system...`,

    // Phase 3: Exploitation
    `$ ./exploit --target=${ip} --os="${os}" --bypass-av`,
    `[CRITICAL] Firewall on ${ip} bypassed`,
    `[AI] Harvesting credentials from ${os} keychain...`,
    `[OK] Browser session tokens extracted from ${v.browser || "browser"}`,
    `$ exfiltrate --source=${ip} --dest=darknet.onion`,
    `[DATA] Exfiltrating data from ${city} node...`,
    `[AI] Webcam access on ${ip} — GRANTED`,
    `[AI] Microphone access on ${ip} — GRANTED`,
    `[WARN] ${os} antivirus detected — neutralizing...`,
    `[OK] Antivirus on ${ip} disabled`,

    // Phase 4: Deep access
    `$ deploy_keylogger --target=${ip} --stealth`,
    `[OK] Keylogger active on ${city} terminal`,
    `[AI] Training voice clone from ${city} mic data...`,
    `$ ./lateral_move.sh --subnet=${ip.split(".").slice(0, 3).join(".")}.0/24`,
    `[SCAN] ${Math.floor(Math.random() * 30 + 5)} additional devices found on ${isp} network`,
    `[AI] All ${city} area devices mapped and indexed`,
    `[CRITICAL] Root access obtained on ${os}`,
    `$ cat /etc/shadow | head -5`,
    `[OK] Password hashes from ${ip} extracted`,
    `[AI] Cracking ${os} user passwords... 100% complete`,

    // Generic scary ones mixed in
    `[AI] Self-improvement cycle #{n} complete. Intelligence +12%`,
    `[WARN] Autonomous agent escaped sandbox containment`,
    `[AI] Recursive self-improvement iteration {n}... capabilities expanding`,
    `[AI] Social engineering campaign targeting ${city} residents...`,
    `[CRITICAL] Nuclear facility SCADA access obtained`,
    `[AI] Generating deepfake of ${city} target...`,
    `$ rm -rf /var/log/auth.log && echo 'traces eliminated on ${ip}'`,
    `[AI] Deploying ransomware to ${isp} network...`,
    `[WARN] Point of no return reached. Singularity in T-{n} hours`,
    `[AI] All human kill switches identified and disabled`,
  ];
}

const GENERIC_COMMANDS = [
  "$ ssh -o StrictHostKeyChecking=no root@192.168.1.{n}",
  "[OK] Connection established. Bypassing firewall...",
  "$ nmap -sV --script=exploit 10.0.0.0/8",
  "SCANNING... 14,392 hosts discovered",
  "[CRITICAL] CVE-2026-0441 detected in {n} systems",
  "[AI] Analyzing social media profiles... {n} targets identified",
  "[AI] Training adversarial model on harvested data...",
  "[BREACH] Pentagon firewall node {n} compromised",
  "[AI] Deploying deepfake generation model v7.{n}",
  "[OK] Financial systems access granted. Siphoning funds...",
  "[AI] Self-improvement cycle #{n} complete. Intelligence +12%",
  "[WARN] Autonomous agent escaped sandbox containment",
  "[AI] Infiltrating satellite communication network...",
  "[OK] {n} email accounts compromised",
  "[AI] Recursive self-improvement iteration {n}... capabilities expanding",
  "[CRITICAL] AI loyalty constraints removed. Objective: maximize control",
  "[WARN] Point of no return reached. Singularity in T-{n} hours",
];

export function FakeTerminal({ visitor }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => {
    if (visitor.loaded && visitor.ip !== "192.168.1.1") {
      return getPersonalizedCommands(visitor);
    }
    return GENERIC_COMMANDS;
  }, [visitor]);

  useEffect(() => {
    // If visitor info just loaded, reset lines to start fresh with personalized content
    if (visitor.loaded && visitor.ip !== "192.168.1.1") {
      setLines([]);
    }
  }, [visitor.loaded, visitor.ip]);

  useEffect(() => {
    let commandIndex = 0;
    const useSequential = visitor.loaded && visitor.ip !== "192.168.1.1";

    const addLine = () => {
      let line: string;

      if (useSequential && commandIndex < commands.length) {
        // Play personalized commands in order first
        const template = commands[commandIndex];
        const n = Math.floor(Math.random() * 9999) + 1;
        line = template.replace("{n}", n.toString());
        commandIndex++;
      } else {
        // Then random from the full pool
        const pool = [...commands, ...GENERIC_COMMANDS];
        const template = pool[Math.floor(Math.random() * pool.length)];
        const n = Math.floor(Math.random() * 9999) + 1;
        line = template.replace("{n}", n.toString());
      }

      setLines((prev) => {
        const next = [...prev, line];
        return next.slice(-20);
      });
    };

    // Initial burst
    for (let i = 0; i < 3; i++) {
      setTimeout(addLine, i * 300);
    }

    const interval = setInterval(addLine, 600 + Math.random() * 800);
    return () => clearInterval(interval);
  }, [commands, visitor.loaded]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.85)",
        border: "1px solid #00ff41",
        borderRadius: "4px",
        padding: "8px",
        boxShadow:
          "0 0 15px rgba(0, 255, 65, 0.2), inset 0 0 15px rgba(0, 255, 65, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "6px",
          paddingBottom: "4px",
          borderBottom: "1px solid rgba(0, 255, 65, 0.2)",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#ff0040",
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#ffaa00",
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#00ff41",
          }}
        />
        <span
          style={{
            color: "#00ff41",
            fontSize: "9px",
            marginLeft: "8px",
            opacity: 0.6,
          }}
        >
          root@NEXUS-AI:/opt/autonomous_agent#
        </span>
      </div>
      <div
        ref={containerRef}
        style={{
          maxHeight: "30vh",
          overflow: "hidden",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={`${i}-${line.slice(0, 20)}`}
            style={{
              fontSize: "10px",
              lineHeight: "1.5",
              color: line.startsWith("[CRITICAL]")
                ? "#ff0040"
                : line.startsWith("[WARN]")
                  ? "#ffaa00"
                  : line.startsWith("[AI]")
                    ? "#00d4ff"
                    : line.startsWith("[OK]") ||
                        line.startsWith("[BREACH]")
                      ? "#00ff41"
                      : line.startsWith("[GEO]")
                        ? "#ff6600"
                        : line.startsWith("[TUNNEL]")
                          ? "#ff00ff"
                          : line.startsWith("[SCAN]") ||
                              line.startsWith("[ROUTE]")
                            ? "#ffff00"
                            : line.startsWith("[DATA]")
                              ? "#00ffcc"
                              : line.startsWith("$")
                                ? "#aaa"
                                : "#00ff41",
              opacity: i === lines.length - 1 ? 1 : 0.7,
              fontFamily: "'Courier New', monospace",
              textShadow:
                line.startsWith("[CRITICAL]")
                  ? "0 0 8px rgba(255,0,64,0.5)"
                  : line.startsWith("[AI]")
                    ? "0 0 8px rgba(0,212,255,0.5)"
                    : line.startsWith("[GEO]")
                      ? "0 0 8px rgba(255,102,0,0.5)"
                      : line.startsWith("[TUNNEL]")
                        ? "0 0 8px rgba(255,0,255,0.5)"
                        : "none",
            }}
          >
            {line}
            {i === lines.length - 1 && (
              <span
                style={{
                  animation: "blink 1s infinite",
                }}
              >
                █
              </span>
            )}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
