import { useEffect, useState, useRef } from "react";
import { fetchRecentCVEs, type CVEEntry, CWE_MAP, severityColor, truncate } from "../../lib/securityData";

interface Fragment {
  id: number;
  x: number;
  y: number;
  text: string;
  speed: number;
  opacity: number;
  size: number;
  color: string;
}

/**
 * Generates display strings from a CVE entry — CVSS vectors, IDs,
 * truncated descriptions, CWE references, etc.
 */
function cveToSnippets(cve: CVEEntry): string[] {
  const out: string[] = [];

  // CVE ID + score
  if (cve.score !== null) {
    out.push(`${cve.id} [CVSS ${cve.score.toFixed(1)}] ${cve.severity}`);
  } else {
    out.push(`${cve.id} — ${cve.severity}`);
  }

  // CVSS vector string (looks very "hacker")
  if (cve.vector) {
    out.push(cve.vector);
  }

  // CWE weakness
  if (cve.cweId && CWE_MAP[cve.cweId]) {
    out.push(`${cve.cweId}: ${CWE_MAP[cve.cweId]}`);
  } else if (cve.cweId) {
    out.push(cve.cweId);
  }

  // Truncated description — looks like real vuln intel
  out.push(truncate(cve.description.toUpperCase(), 80));

  return out;
}

let nextId = 0;

export function CodeFragments() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const snippetsRef = useRef<{ text: string; color: string }[]>([]);

  // Fetch real CVE data on mount and build snippet pool
  useEffect(() => {
    fetchRecentCVEs(40).then((cves) => {
      const pool: { text: string; color: string }[] = [];
      for (const cve of cves) {
        const color = severityColor(cve.severity);
        for (const snippet of cveToSnippets(cve)) {
          pool.push({ text: snippet, color });
        }
      }
      // Shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      snippetsRef.current = pool;
    });
  }, []);

  useEffect(() => {
    const fallbackColors = ["#00ff41", "#00d4ff", "#ff0040", "#ff6600", "#ff00ff", "#aaa"];

    const spawn = () => {
      const pool = snippetsRef.current;
      let text: string;
      let color: string;

      if (pool.length > 0) {
        const entry = pool[Math.floor(Math.random() * pool.length)];
        text = entry.text;
        color = entry.color;
      } else {
        // Until data loads, show loading-style fragments
        text = `CVE-${2025 + Math.floor(Math.random() * 2)}-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")} LOADING...`;
        color = fallbackColors[Math.floor(Math.random() * fallbackColors.length)];
      }

      const frag: Fragment = {
        id: nextId++,
        x: Math.random() * 80 + 10,
        y: -5,
        text,
        speed: 0.02 + Math.random() * 0.04,
        opacity: 0.15 + Math.random() * 0.25,
        size: 8 + Math.random() * 4,
        color,
      };
      setFragments((prev) => [...prev.slice(-25), frag]);
    };

    // Initial
    for (let i = 0; i < 8; i++) {
      setTimeout(spawn, i * 500);
    }

    const interval = setInterval(spawn, 2000 + Math.random() * 3000);

    // Animation
    const animInterval = setInterval(() => {
      setFragments((prev) =>
        prev
          .map((f) => ({
            ...f,
            y: f.y + f.speed,
            opacity: f.y > 80 ? f.opacity - 0.01 : f.opacity,
          }))
          .filter((f) => f.y < 110 && f.opacity > 0),
      );
    }, 50);

    return () => {
      clearInterval(interval);
      clearInterval(animInterval);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {fragments.map((f) => (
        <div
          key={f.id}
          style={{
            position: "absolute",
            left: `${f.x}%`,
            top: `${f.y}%`,
            fontSize: `${f.size}px`,
            color: f.color,
            opacity: f.opacity,
            fontFamily: "'Courier New', monospace",
            whiteSpace: "nowrap",
            textShadow: `0 0 5px ${f.color}40`,
            transform: `rotate(${(f.id % 7) - 3}deg)`,
          }}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
}
