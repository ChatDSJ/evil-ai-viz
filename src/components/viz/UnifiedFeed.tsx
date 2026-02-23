import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";
import {
  fetchRecentCVEs,
  fetchBreaches,
  type CVEEntry,
  type BreachEntry,
  CWE_MAP,
  severityColor,
  formatPwnCount,
  truncate,
} from "../../lib/securityData";

interface FeedEntry {
  id: string;
  text: string;
  color: string;
  glow?: string;
  prefix?: string;
  prefixColor?: string;
  timestamp: number;
}

interface Props {
  visitor: VisitorInfo;
}

// ─── News fetching (from NewsWidget logic) ───
function parseRSSItems(xml: string): { title: string; source: string }[] {
  const items: { title: string; source: string }[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const entries = doc.querySelectorAll("item, entry");
  for (const entry of entries) {
    const title = entry.querySelector("title")?.textContent?.trim() || "";
    const source =
      entry.querySelector("source")?.textContent?.trim() ||
      doc.querySelector("channel > title, feed > title")?.textContent?.trim() ||
      "UNKNOWN";
    if (title && title.length > 10) items.push({ title, source });
  }
  return items;
}

async function fetchNewsHeadlines(): Promise<{ headline: string; source: string }[]> {
  const feeds = [
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "NYT" },
    { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC TECH" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", source: "NYT" },
    { url: "https://feeds.feedburner.com/TheHackersNews", source: "THN" },
  ];

  const all: { headline: string; source: string }[] = [];
  const results = await Promise.allSettled(
    feeds.map(async (f) => {
      try {
        const res = await fetch(f.url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRSSItems(xml).slice(0, 8).map((item) => ({
          headline: item.title.toUpperCase(),
          source: f.source,
        }));
      } catch { return []; }
    }),
  );
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  if (all.length === 0) {
    return [
      { headline: "CRITICAL ZERO-DAY VULNERABILITY DISCOVERED IN WIDELY USED OPEN SOURCE LIBRARY", source: "THN" },
      { headline: "RANSOMWARE ATTACK DISRUPTS HOSPITAL SYSTEMS ACROSS THREE STATES", source: "KREBS" },
      { headline: "NATION-STATE ACTORS EXPLOIT UNPATCHED VPN VULNERABILITIES IN COORDINATED CAMPAIGN", source: "CISA" },
      { headline: "MASSIVE CREDENTIAL STUFFING ATTACK TARGETS FINANCIAL INSTITUTIONS GLOBALLY", source: "DARK" },
      { headline: "SUPPLY CHAIN COMPROMISE: MALICIOUS CODE FOUND IN POPULAR NPM PACKAGE", source: "SNYK" },
      { headline: "QUANTUM-RESISTANT ENCRYPTION STANDARD FINALIZED BY NIST", source: "NIST" },
      { headline: "AI-GENERATED PHISHING EMAILS NOW BYPASS 94% OF TRADITIONAL FILTERS", source: "WIRED" },
      { headline: "EUROPEAN DATA PROTECTION AUTHORITY ISSUES RECORD €1.2B FINE FOR PRIVACY VIOLATIONS", source: "BBC" },
      { headline: "NEW BLUETOOTH VULNERABILITY ALLOWS REMOTE CODE EXECUTION ON BILLIONS OF DEVICES", source: "ESET" },
      { headline: "CLOUD MISCONFIGURATION EXPOSES 200M RECORDS FROM FORTUNE 500 COMPANY", source: "VERGE" },
    ];
  }

  // Shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// ─── Weather fetching ───
interface WeatherData {
  temp: number;
  feelsLike: number;
  description: string;
  humidity: number;
  windSpeed: number;
  windDir: string;
  clouds: number;
}

function degToDir(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
    );
    const data = await res.json();
    if (!data.current) return null;
    const c = data.current;
    const descMap: Record<number, string> = {
      0: "CLEAR SKY", 1: "MAINLY CLEAR", 2: "PARTLY CLOUDY", 3: "OVERCAST",
      45: "FOG", 48: "RIME FOG", 51: "LIGHT DRIZZLE", 53: "DRIZZLE",
      61: "LIGHT RAIN", 63: "RAIN", 65: "HEAVY RAIN", 71: "LIGHT SNOW",
      73: "SNOW", 75: "HEAVY SNOW", 80: "SHOWERS", 95: "THUNDERSTORM",
    };
    return {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      description: descMap[c.weather_code] || "UNKNOWN",
      humidity: c.relative_humidity_2m,
      windSpeed: Math.round(c.wind_speed_10m),
      windDir: degToDir(c.wind_direction_10m),
      clouds: c.cloud_cover,
    };
  } catch { return null; }
}

// ─── Hex generation ───
function generateHex(): string {
  const addr = Math.floor(Math.random() * 0xfffff).toString(16).padStart(5, "0");
  const bytes = Array(8).fill(0).map(() =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join(" ");
  return `0x${addr}: ${bytes}`;
}

// ─── Vulnerability stats (real aggregate numbers) ───
const VULN_STATS = [
  { label: "NVD CVEs PUBLISHED (2026)", value: 9005, inc: 0.8, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "CRITICAL CVEs (2026)", value: 524, inc: 0.12, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "TOTAL HIBP BREACHED ACCOUNTS", value: 14_800_000_000, inc: 140, fmt: (n: number) => `${(n / 1_000_000_000).toFixed(1)}B` },
  { label: "KNOWN EXPLOITED VULNS (CISA KEV)", value: 1247, inc: 0.02, fmt: (n: number) => Math.floor(n).toLocaleString() },
];

const AI_BENCHMARKS = [
  { name: "GPQA DIAMOND", score: 93.2, human: "PHD EXPERTS: 65%" },
  { name: "AIME 2025", score: 100, human: "" },
  { name: "SWE-BENCH", score: 82, human: "HUMAN DEVS: 4.8%" },
  { name: "HUMANITY'S LAST EXAM", score: 50.7, human: "SCHOLARS: 34.1%" },
  { name: "ARC-AGI-2", score: 52.9, human: "HUMANS: 85%" },
  { name: "FRONTIERMATH", score: 40.3, human: "" },
  { name: "CODING AGENTS", score: 41, human: "OF ALL CODE WRITTEN" },
];

// Entry ID counter
let entryIdCounter = 0;
function nextId(): string {
  return `f_${++entryIdCounter}_${Date.now()}`;
}

export function UnifiedFeed({ visitor }: Props) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const newsRef = useRef<{ headline: string; source: string }[]>([]);
  const newsIdxRef = useRef(0);
  const weatherRef = useRef<WeatherData | null>(null);
  const cveRef = useRef<CVEEntry[]>([]);
  const cveIdxRef = useRef(0);
  const breachRef = useRef<BreachEntry[]>([]);
  const breachIdxRef = useRef(0);
  const metricRef = useRef(VULN_STATS.map((m) => m.value));
  const benchIdxRef = useRef(0);
  const scanPhaseRef = useRef(0);

  const activeVisitors = useQuery(api.visitors.getActive);

  // Add an entry
  const addEntry = useCallback((entry: Omit<FeedEntry, "id" | "timestamp">) => {
    setEntries((prev) => {
      const next = [...prev, { ...entry, id: nextId(), timestamp: Date.now() }];
      return next.slice(-200); // keep last 200
    });
  }, []);

  // Initialize data sources
  useEffect(() => {
    if (!visitor.loaded) return;

    // Fetch news
    fetchNewsHeadlines().then((items) => {
      newsRef.current = items;
    });

    // Fetch weather
    fetchWeather(visitor.lat, visitor.lon).then((data) => {
      weatherRef.current = data;
    });

    // Fetch CVEs
    fetchRecentCVEs(40).then((cves) => {
      cveRef.current = cves;
    });

    // Fetch breaches
    fetchBreaches().then((breaches) => {
      breachRef.current = breaches;
    });
  }, [visitor.loaded, visitor.lat, visitor.lon]);

  // ─── Feed generation engine ───
  useEffect(() => {
    if (!visitor.loaded) return;

    // Source generators
    const generators: (() => Omit<FeedEntry, "id" | "timestamp"> | null)[] = [

      // ─── CVE entries (the core of the new feed) ───
      () => {
        if (cveRef.current.length === 0) return null;
        const cve = cveRef.current[cveIdxRef.current % cveRef.current.length];
        cveIdxRef.current++;
        const r = Math.random();

        if (r < 0.3) {
          // CVE ID + score + severity
          const scoreStr = cve.score !== null ? `CVSS ${cve.score.toFixed(1)}` : "UNSCORED";
          return {
            text: `${cve.id} — ${scoreStr} — ${cve.severity}`,
            color: severityColor(cve.severity),
            glow: cve.severity === "CRITICAL" ? "rgba(255,0,64,0.4)" : undefined,
          };
        }
        if (r < 0.55) {
          // Description
          return {
            text: truncate(cve.description.toUpperCase(), 90),
            color: severityColor(cve.severity),
            prefix: cve.id,
            prefixColor: "#888",
          };
        }
        if (r < 0.7 && cve.vector) {
          // CVSS vector
          return {
            text: cve.vector,
            color: "#888",
            prefix: cve.id,
            prefixColor: severityColor(cve.severity),
          };
        }
        if (r < 0.85 && cve.cweId) {
          // CWE weakness type
          const cweName = CWE_MAP[cve.cweId] || cve.cweId;
          return {
            text: `${cve.cweId}: ${cweName}`,
            color: "#ff6600",
            prefix: cve.id,
            prefixColor: "#888",
          };
        }
        // Source + publish date
        return {
          text: `PUBLISHED ${cve.published.split("T")[0]} — SOURCE: ${cve.source.toUpperCase()}`,
          color: "#555",
          prefix: cve.id,
          prefixColor: severityColor(cve.severity),
        };
      },

      // ─── Breach entries (HIBP data) ───
      () => {
        if (breachRef.current.length === 0) return null;
        const b = breachRef.current[breachIdxRef.current % breachRef.current.length];
        breachIdxRef.current++;
        const r = Math.random();

        if (r < 0.3) {
          return {
            text: `${formatPwnCount(b.pwnCount)} ACCOUNTS COMPROMISED — ${b.dataClasses.slice(0, 3).join(", ").toUpperCase()}`,
            color: "#ff0040",
            glow: "rgba(255,0,64,0.3)",
            prefix: `HIBP:${b.title.toUpperCase()}`,
            prefixColor: "#ff0040",
          };
        }
        if (r < 0.6) {
          return {
            text: truncate(b.description.toUpperCase(), 90),
            color: "#ff6600",
            prefix: b.title.toUpperCase(),
            prefixColor: "#ff0040",
          };
        }
        if (r < 0.8) {
          return {
            text: `DOMAIN: ${b.domain || "N/A"} — BREACH DATE: ${b.breachDate} — ${b.pwnCount.toLocaleString()} RECORDS`,
            color: "#ff0040",
          };
        }
        return {
          text: `DATA CLASSES: ${b.dataClasses.join(", ").toUpperCase()}`,
          color: "#ff6600",
          prefix: b.title.toUpperCase(),
          prefixColor: "#888",
        };
      },

      // ─── Vulnerability scanning simulation (uses real visitor context) ───
      () => {
        const ip = visitor.ip || "?.?.?.?";
        const os = visitor.osVersion || "Unknown OS";
        const city = visitor.city || "UNKNOWN";
        const isp = visitor.isp || "UNKNOWN ISP";

        scanPhaseRef.current++;
        const phase = scanPhaseRef.current;

        const scanLines = [
          { text: `$ nmap -sV --script vuln ${ip}`, color: "#888" },
          { text: `Host ${ip} is up (${(Math.random() * 50 + 10).toFixed(1)}ms latency)`, color: "#00ff41" },
          { text: `OS fingerprint: ${os}`, color: "#00d4ff" },
          { text: `ISP: ${isp} — ${city}`, color: "#00d4ff" },
          { text: `PORT    STATE  SERVICE        VERSION`, color: "#888" },
          { text: `22/tcp  open   ssh            OpenSSH ${Math.floor(Math.random() * 3 + 7)}.${Math.floor(Math.random() * 9)}`, color: "#00ff41" },
          { text: `80/tcp  open   http           nginx/${Math.floor(Math.random() * 3 + 1)}.${Math.floor(Math.random() * 26)}`, color: "#00ff41" },
          { text: `443/tcp open   ssl/http       nginx`, color: "#00ff41" },
          { text: `3306/tcp filtered mysql`, color: "#ffaa00" },
          { text: `8080/tcp open   http-proxy`, color: "#ffaa00" },
          { text: `| ssl-cert: Subject: CN=${visitor.city?.toLowerCase() || "app"}.local`, color: "#00d4ff" },
          { text: `| ssl-date: TLS certificate expires in ${Math.floor(Math.random() * 90 + 10)} days`, color: "#ffaa00" },
          { text: `| http-server-header: X-Powered-By not stripped`, color: "#ff6600" },
          { text: `| vulners: CVE-${2025 + Math.floor(Math.random() * 2)}-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")} — MATCH`, color: "#ff0040", glow: "rgba(255,0,64,0.3)" },
          { text: `NSE: ${Math.floor(Math.random() * 40 + 10)} scripts completed`, color: "#888" },
        ];

        const line = scanLines[phase % scanLines.length];
        return line;
      },

      // Hex data
      () => ({
        text: generateHex(),
        color: "#00ff41",
      }),

      // News headlines
      () => {
        if (newsRef.current.length === 0) return null;
        const item = newsRef.current[newsIdxRef.current % newsRef.current.length];
        newsIdxRef.current++;
        return {
          text: `${item.headline}`,
          color: "#cccccc",
          prefix: item.source,
          prefixColor: "#00d4ff",
        };
      },

      // Weather data
      () => {
        const w = weatherRef.current;
        if (!w) return null;
        const variants = [
          { text: `${w.temp}°F ${w.description} — HUMIDITY ${w.humidity}% — WIND ${w.windSpeed}mph ${w.windDir}`, color: "#00d4ff" },
          { text: `FEELS LIKE ${w.feelsLike}°F — CLOUD COVER ${w.clouds}%`, color: "#00d4ff" },
          { text: `${visitor.city.toUpperCase()}, ${visitor.region.toUpperCase()} — ${w.temp}°F ${w.description}`, color: "#00d4ff" },
        ];
        return variants[Math.floor(Math.random() * variants.length)];
      },

      // Live observers
      () => {
        const count = activeVisitors?.length ?? 0;
        if (count === 0) return null;
        const variants: Omit<FeedEntry, "id" | "timestamp">[] = [
          { text: `${count} ACTIVE OBSERVER${count !== 1 ? "S" : ""} CONNECTED`, color: "#ff00ff", glow: "rgba(255,0,255,0.3)" },
          ...(activeVisitors || []).filter((_: unknown, i: number) => i < 2).map((v: { city?: string; country?: string; lat: number; lon: number }) => ({
            text: `NODE: ${v.city?.toUpperCase() || "UNKNOWN"}, ${v.country?.toUpperCase() || "?"} — ${v.lat.toFixed(4)}°N ${Math.abs(v.lon).toFixed(4)}°${v.lon >= 0 ? "E" : "W"}`,
            color: "#ff00ff",
          })),
        ];
        return variants[Math.floor(Math.random() * variants.length)];
      },

      // Vulnerability stats
      () => {
        const idx = Math.floor(Math.random() * VULN_STATS.length);
        metricRef.current[idx] += VULN_STATS[idx].inc * (0.5 + Math.random()) * 10;
        return {
          text: `${VULN_STATS[idx].label}: ${VULN_STATS[idx].fmt(metricRef.current[idx])}`,
          color: ["#ff0040", "#ff6600", "#ff0040", "#00d4ff"][idx],
        };
      },

      // AI benchmarks
      () => {
        const b = AI_BENCHMARKS[benchIdxRef.current % AI_BENCHMARKS.length];
        benchIdxRef.current++;
        const scoreStr = b.name === "CODING AGENTS" ? `${b.score.toFixed(1)}% OF ALL CODE` : `${b.score.toFixed(1)}%`;
        return {
          text: `${b.name}: ${scoreStr}${b.human ? ` — ${b.human}` : ""}`,
          color: "#ff6600",
        };
      },

      // Exploit / security intel one-liners (real-sounding, not cartoonish)
      () => {
        const lines = [
          { text: `SHODAN QUERY: port:3306 country:US — ${(Math.floor(Math.random() * 500000) + 100000).toLocaleString()} RESULTS`, color: "#ff6600" },
          { text: `CENSYS: ${(Math.floor(Math.random() * 2000) + 500).toLocaleString()} EXPOSED REDIS INSTANCES FOUND`, color: "#ff0040", glow: "rgba(255,0,64,0.3)" },
          { text: `CISA KEV UPDATE: ${Math.floor(Math.random() * 5) + 1} NEW KNOWN EXPLOITED VULNERABILITIES ADDED`, color: "#ff0040" },
          { text: `EPSS SCORE: ${(Math.random() * 0.95 + 0.05).toFixed(4)} — HIGH EXPLOITATION PROBABILITY`, color: "#ff6600" },
          { text: `MITRE ATT&CK: T${1000 + Math.floor(Math.random() * 700)} — ${["INITIAL ACCESS", "EXECUTION", "PERSISTENCE", "PRIVILEGE ESCALATION", "DEFENSE EVASION", "CREDENTIAL ACCESS", "DISCOVERY", "LATERAL MOVEMENT", "COLLECTION", "EXFILTRATION"][Math.floor(Math.random() * 10)]}`, color: "#00d4ff" },
          { text: `GREYNOISE: ${(Math.floor(Math.random() * 50000) + 5000).toLocaleString()} IPs SCANNING FOR CVE-${2025 + Math.floor(Math.random() * 2)}-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`, color: "#ff0040" },
          { text: `VIRUSTOTAL: ${Math.floor(Math.random() * 50 + 20)}/${Math.floor(Math.random() * 10 + 65)} ENGINES DETECT SAMPLE — SHA256: ${Array(8).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("")}...`, color: "#ff6600" },
          { text: `SSL LABS: ${visitor.city?.toUpperCase() || "TARGET"} ENDPOINT — GRADE ${["A+", "A", "B", "C", "F"][Math.floor(Math.random() * 5)]}`, color: "#00d4ff" },
          { text: `NIST NVD: ${Math.floor(Math.random() * 200 + 50)} NEW CVEs PUBLISHED IN LAST 24 HOURS`, color: "#888" },
          { text: `EXPLOIT-DB: NEW POC PUBLISHED FOR ${["WORDPRESS", "APACHE", "NGINX", "PHP", "NODE.JS", "OPENSSL", "LINUX KERNEL", "WINDOWS SMB", "DOCKER", "KUBERNETES"][Math.floor(Math.random() * 10)]}`, color: "#ff0040", glow: "rgba(255,0,64,0.3)" },
          { text: `ABUSE.CH: ${(Math.floor(Math.random() * 10000) + 1000).toLocaleString()} MALWARE SAMPLES SUBMITTED TODAY`, color: "#ff6600" },
          { text: `HAVE I BEEN PWNED: ${(Math.random() * 5 + 1).toFixed(1)}M NEW BREACHED ACCOUNTS LOADED`, color: "#ff0040" },
          { text: `DNS OVER HTTPS LEAK DETECTED — RESOLVER: ${["CLOUDFLARE", "GOOGLE", "QUAD9", "OPENDNS"][Math.floor(Math.random() * 4)]}`, color: "#ffaa00" },
          { text: `TLS 1.0/1.1 STILL ENABLED ON ${(Math.floor(Math.random() * 30) + 5).toLocaleString()}% OF ALEXA TOP 1M SITES`, color: "#ffaa00" },
          { text: `PACKET CAPTURE: ${Math.floor(Math.random() * 900 + 100)} CLEARTEXT CREDENTIALS IN LAST HOUR`, color: "#ff0040", glow: "rgba(255,0,64,0.4)" },
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      },
    ];

    // Initial burst
    for (let i = 0; i < 12; i++) {
      const gen = generators[Math.floor(Math.random() * generators.length)];
      const entry = gen();
      if (entry) addEntry(entry);
    }

    // Continuous feed — new entry every 400-1200ms
    let timeoutId: ReturnType<typeof setTimeout>;
    const tick = () => {
      const count = Math.random() < 0.3 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const gen = generators[Math.floor(Math.random() * generators.length)];
        const entry = gen();
        if (entry) addEntry(entry);
      }
      const delay = 400 + Math.random() * 800;
      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, 500);
    return () => clearTimeout(timeoutId);
  }, [visitor.loaded, addEntry, activeVisitors]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "32%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {/* Gradient fade at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "40px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)",
          zIndex: 2,
        }}
      />

      {/* Scrolling feed */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "8px 12px",
          fontFamily: "'Courier New', monospace",
          background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.7) 80%, transparent 100%)",
        }}
      >
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              fontSize: "9px",
              lineHeight: "1.6",
              color: entry.color,
              opacity: Math.max(0.25, (i / entries.length) * 0.75 + 0.25),
              textShadow: entry.glow ? `0 0 6px ${entry.glow}` : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: "0.3px",
            }}
          >
            {entry.prefix && (
              <span style={{ color: entry.prefixColor || "#666", marginRight: "6px", fontSize: "7px" }}>
                [{entry.prefix}]
              </span>
            )}
            {entry.text}
          </div>
        ))}
        {/* Cursor at bottom */}
        <div style={{ fontSize: "9px", color: "#00ff41", opacity: 0.8 }}>
          <span style={{ animation: "blink-feed 1s steps(1) infinite" }}>█</span>
        </div>
      </div>

      {/* Gradient fade at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "30px",
          background: "linear-gradient(to top, rgba(0,0,0,0.95), transparent)",
          zIndex: 2,
        }}
      />

      {/* Thin red line on right edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "1px",
          background: "linear-gradient(to bottom, transparent, rgba(255,0,64,0.3) 20%, rgba(255,0,64,0.3) 80%, transparent)",
        }}
      />

      <style>{`
        @keyframes blink-feed {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
