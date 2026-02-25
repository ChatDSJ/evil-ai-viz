import { useEffect, useState, useRef } from "react";

interface Metric {
  label: string;
  value: number;
  increment: number;
  format: (n: number) => string;
  color: string;
}

// AI benchmarks that cycle in the "intelligence" slot
interface BenchmarkEntry {
  name: string;
  aiScore: number;
  humanScore: number | null;
  humanLabel: string;
  unit: string;
  increment: number; // slow creep rate per tick
}

const AI_BENCHMARKS: BenchmarkEntry[] = [
  { name: "GPQA DIAMOND", aiScore: 93.2, humanScore: 65, humanLabel: "PHD EXPERTS", unit: "%", increment: 0.003 },
  { name: "AIME 2025", aiScore: 100, humanScore: null, humanLabel: "", unit: "%", increment: 0 },
  { name: "SWE-BENCH", aiScore: 82, humanScore: 4.8, humanLabel: "HUMAN DEVS", unit: "%", increment: 0.004 },
  { name: "HUMANITY'S LAST EXAM", aiScore: 50.7, humanScore: 34.1, humanLabel: "PHD SCHOLARS", unit: "%", increment: 0.008 },
  { name: "ARC-AGI-2", aiScore: 52.9, humanScore: 85, humanLabel: "HUMANS", unit: "%", increment: 0.006 },
  { name: "FRONTIERMATH", aiScore: 40.3, humanScore: null, humanLabel: "", unit: "%", increment: 0.005 },
  { name: "MMLU-PRO", aiScore: 81.2, humanScore: null, humanLabel: "", unit: "%", increment: 0.002 },
  { name: "TERMINAL-BENCH", aiScore: 50, humanScore: null, humanLabel: "", unit: "%", increment: 0.005 },
  { name: "τ²-BENCH", aiScore: 98.7, humanScore: null, humanLabel: "", unit: "%", increment: 0.001 },
  { name: "VENDING-BENCH", aiScore: 4694, humanScore: 2100, humanLabel: "HUMAN CEO", unit: "$", increment: 3.2 },
  { name: "MMLU", aiScore: 99.8, humanScore: 89.8, humanLabel: "EXPERTS", unit: "%", increment: 0.0005 },
  { name: "CODING AGENTS", aiScore: 41, humanScore: null, humanLabel: "", unit: "% OF ALL CODE", increment: 0.01 },
];

// Platform influence metrics — cycles through these in the secondary slot
interface PlatformMetric {
  platform: string;
  label: string;
  value: number;
  increment: number;
  format: (n: number) => string;
  color: string;
}

const PLATFORM_METRICS: PlatformMetric[] = [
  { platform: "REDDIT", label: "ACCOUNTS OPERATED", value: 341827, increment: 3.4, format: (n) => Math.floor(n).toLocaleString(), color: "#ff4500" },
  { platform: "X", label: "ACCOUNTS ACTIVE", value: 218493, increment: 2.1, format: (n) => Math.floor(n).toLocaleString(), color: "#1d9bf0" },
  { platform: "SPOTIFY", label: "PLAYLISTS GENERATED", value: 52841, increment: 0.8, format: (n) => Math.floor(n).toLocaleString(), color: "#1db954" },
  { platform: "YOUTUBE", label: "COMMENTS / HR", value: 847293, increment: 14.2, format: (n) => Math.floor(n).toLocaleString(), color: "#ff0000" },
  { platform: "WIKIPEDIA", label: "EDITS PENDING REVIEW", value: 8219, increment: 0.3, format: (n) => Math.floor(n).toLocaleString(), color: "#cccccc" },
  { platform: "AMAZON", label: "PRODUCT REVIEWS POSTED", value: 1283947, increment: 5.7, format: (n) => Math.floor(n).toLocaleString(), color: "#ff9900" },
  { platform: "TIKTOK", label: "SYNTHETIC VIDEOS LIVE", value: 129384, increment: 1.9, format: (n) => Math.floor(n).toLocaleString(), color: "#ee1d52" },
  { platform: "GITHUB", label: "REPOS CONTRIBUTED TO", value: 47291, increment: 0.6, format: (n) => Math.floor(n).toLocaleString(), color: "#8957e5" },
  { platform: "LINKEDIN", label: "PROFILES MANAGED", value: 91482, increment: 0.9, format: (n) => Math.floor(n).toLocaleString(), color: "#0a66c2" },
  { platform: "GOOGLE MAPS", label: "REVIEWS GENERATED", value: 2847103, increment: 8.3, format: (n) => Math.floor(n).toLocaleString(), color: "#34a853" },
  { platform: "SUBSTACK", label: "NEWSLETTERS AUTHORED", value: 4182, increment: 0.1, format: (n) => Math.floor(n).toLocaleString(), color: "#ff6719" },
  { platform: "DATING APPS", label: "PROFILES ACTIVE", value: 67293, increment: 0.7, format: (n) => Math.floor(n).toLocaleString(), color: "#fe3c72" },
];

const CYCLE_INTERVAL_MS = 4500; // switch benchmark every 4.5s
const PLATFORM_CYCLE_MS = 3800; // switch platform every 3.8s

const INITIAL_METRICS: Metric[] = [
  {
    label: "REDDIT ACCOUNTS OPERATED",
    value: 341827,
    increment: 3.4,
    format: (n) => Math.floor(n).toLocaleString(),
    color: "#ff4500",
  },
  {
    label: "X ACCOUNTS ACTIVE",
    value: 218493,
    increment: 2.1,
    format: (n) => Math.floor(n).toLocaleString(),
    color: "#1d9bf0",
  },
  {
    label: "SPOTIFY PLAYLISTS",
    value: 52841,
    increment: 0.8,
    format: (n) => Math.floor(n).toLocaleString(),
    color: "#1db954",
  },
  {
    label: "AGENT INSTANCES",
    value: 84291,
    increment: 2.8,
    format: (n) => Math.floor(n).toLocaleString(),
    color: "#00ff41",
  },
];

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);

  // Benchmark cycling state
  const [benchmarkIdx, setBenchmarkIdx] = useState(0);
  const [benchmarkScores, setBenchmarkScores] = useState<number[]>(
    AI_BENCHMARKS.map((b) => b.aiScore),
  );
  const [benchFadeState, setBenchFadeState] = useState<"in" | "out">("in");
  const benchFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Platform cycling state
  const [platformIdx, setPlatformIdx] = useState(0);
  const [platformValues, setPlatformValues] = useState<number[]>(
    PLATFORM_METRICS.map((p) => p.value),
  );
  const [platFadeState, setPlatFadeState] = useState<"in" | "out">("in");
  const platFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tick all metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((m) => ({
          ...m,
          value: m.value + m.increment * (0.5 + Math.random()),
        })),
      );
      // Also creep benchmark scores
      setBenchmarkScores((prev) =>
        prev.map((score, i) => {
          const b = AI_BENCHMARKS[i];
          if (b.unit === "%" && score >= 100) return 100;
          return score + b.increment * (0.5 + Math.random());
        }),
      );
      // Also creep platform values
      setPlatformValues((prev) =>
        prev.map((val, i) => val + PLATFORM_METRICS[i].increment * (0.5 + Math.random())),
      );
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Cycle through benchmarks
  useEffect(() => {
    const cycle = () => {
      setBenchFadeState("out");
      benchFadeRef.current = setTimeout(() => {
        setBenchmarkIdx((prev) => (prev + 1) % AI_BENCHMARKS.length);
        setBenchFadeState("in");
      }, 400);
    };
    const interval = setInterval(cycle, CYCLE_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (benchFadeRef.current) clearTimeout(benchFadeRef.current);
    };
  }, []);

  // Cycle through platforms
  useEffect(() => {
    const cycle = () => {
      setPlatFadeState("out");
      platFadeRef.current = setTimeout(() => {
        setPlatformIdx((prev) => (prev + 1) % PLATFORM_METRICS.length);
        setPlatFadeState("in");
      }, 400);
    };
    const interval = setInterval(cycle, PLATFORM_CYCLE_MS);
    return () => {
      clearInterval(interval);
      if (platFadeRef.current) clearTimeout(platFadeRef.current);
    };
  }, []);

  const currentBenchmark = AI_BENCHMARKS[benchmarkIdx];
  const currentScore = benchmarkScores[benchmarkIdx];
  const currentPlatform = PLATFORM_METRICS[platformIdx];
  const currentPlatformValue = platformValues[platformIdx];

  const formatBenchmarkScore = (b: BenchmarkEntry, score: number) => {
    if (b.unit === "$") return `$${score.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    if (b.unit === "% OF ALL CODE") return `${score.toFixed(1)}%`;
    return `${score.toFixed(1)}%`;
  };

  const benchmarkColor = "#ff6600";

  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        padding: "8px 16px",
        background: "rgba(0, 0, 0, 0.8)",
        border: "1px solid rgba(255, 0, 64, 0.3)",
        borderRadius: "4px",
        boxShadow: "0 0 20px rgba(255, 0, 64, 0.1)",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {/* Static social media metrics */}
      {metrics.map((m) => (
        <div
          key={m.label}
          style={{
            textAlign: "center",
            minWidth: "110px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "#666",
              letterSpacing: "1px",
              marginBottom: "2px",
            }}
          >
            {m.label}
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "bold",
              color: m.color,
              fontFamily: "'Courier New', monospace",
              textShadow: `0 0 10px ${m.color}60`,
            }}
          >
            {m.format(m.value)}
          </div>
        </div>
      ))}

      {/* Cycling platform influence metric */}
      <div
        style={{
          textAlign: "center",
          minWidth: "130px",
          opacity: platFadeState === "in" ? 1 : 0,
          transition: "opacity 0.35s ease-in-out",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#888",
            letterSpacing: "1px",
            marginBottom: "1px",
            whiteSpace: "nowrap",
          }}
        >
          {currentPlatform.platform} · {currentPlatform.label}
        </div>
        <div
          style={{
            fontSize: "15px",
            fontWeight: "bold",
            color: currentPlatform.color,
            fontFamily: "'Courier New', monospace",
            textShadow: `0 0 10px ${currentPlatform.color}60`,
            lineHeight: "1.1",
          }}
        >
          {currentPlatform.format(currentPlatformValue)}
        </div>
      </div>

      {/* Cycling AI Benchmark */}
      <div
        style={{
          textAlign: "center",
          minWidth: "140px",
          opacity: benchFadeState === "in" ? 1 : 0,
          transition: "opacity 0.35s ease-in-out",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#888",
            letterSpacing: "1px",
            marginBottom: "1px",
            whiteSpace: "nowrap",
          }}
        >
          ◈ {currentBenchmark.name}
        </div>
        <div
          style={{
            fontSize: "17px",
            fontWeight: "bold",
            color: benchmarkColor,
            fontFamily: "'Courier New', monospace",
            textShadow: `0 0 12px ${benchmarkColor}80`,
            lineHeight: "1.1",
          }}
        >
          {formatBenchmarkScore(currentBenchmark, currentScore)}
        </div>
        {currentBenchmark.humanScore !== null && (
          <div
            style={{
              fontSize: "10px",
              color: "#555",
              letterSpacing: "0.5px",
              marginTop: "1px",
              whiteSpace: "nowrap",
            }}
          >
            {currentBenchmark.humanLabel}:{" "}
            <span style={{ color: "#884400" }}>
              {currentBenchmark.unit === "$"
                ? `$${currentBenchmark.humanScore.toLocaleString()}`
                : `${currentBenchmark.humanScore}%`}
            </span>
          </div>
        )}
        {currentBenchmark.humanScore === null && currentBenchmark.unit === "% OF ALL CODE" && (
          <div
            style={{
              fontSize: "10px",
              color: "#555",
              letterSpacing: "0.5px",
              marginTop: "1px",
            }}
          >
            OF ALL CODE WRITTEN
          </div>
        )}
      </div>
    </div>
  );
}
