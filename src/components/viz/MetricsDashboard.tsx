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

const CYCLE_INTERVAL_MS = 4500; // switch benchmark every 4.5s

const INITIAL_METRICS: Metric[] = [
  {
    label: "AI R&D MULTIPLIER",
    value: 2.31,
    increment: 0.0003,
    format: (n) => `${n.toFixed(2)}×`,
    color: "#ff6600",
  },
  {
    label: "COMPUTE DEPLOYED",
    value: 247583,
    increment: 4.2,
    format: (n) => `${Math.floor(n).toLocaleString()} H100e`,
    color: "#00d4ff",
  },
  {
    label: "AGENT INSTANCES",
    value: 84291,
    increment: 2.8,
    format: (n) => Math.floor(n).toLocaleString(),
    color: "#00ff41",
  },
  {
    label: "DATACENTER CAPEX",
    value: 308.4,
    increment: 0.008,
    format: (n) => `$${n.toFixed(1)}B/yr`,
    color: "#ff00ff",
  },
];

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);

  // Benchmark cycling state
  const [benchmarkIdx, setBenchmarkIdx] = useState(0);
  const [benchmarkScores, setBenchmarkScores] = useState<number[]>(
    AI_BENCHMARKS.map((b) => b.aiScore),
  );
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tick all normal metrics
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
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Cycle through benchmarks
  useEffect(() => {
    const cycle = () => {
      // Fade out
      setFadeState("out");
      fadeTimeoutRef.current = setTimeout(() => {
        // Switch benchmark
        setBenchmarkIdx((prev) => (prev + 1) % AI_BENCHMARKS.length);
        // Fade in
        setFadeState("in");
      }, 400);
    };
    const interval = setInterval(cycle, CYCLE_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  const currentBenchmark = AI_BENCHMARKS[benchmarkIdx];
  const currentScore = benchmarkScores[benchmarkIdx];

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
      }}
    >
      {metrics.slice(0, 2).map((m) => (
        <div
          key={m.label}
          style={{
            textAlign: "center",
            minWidth: "120px",
          }}
        >
          <div
            style={{
              fontSize: "8px",
              color: "#666",
              letterSpacing: "1px",
              marginBottom: "2px",
            }}
          >
            {m.label}
          </div>
          <div
            style={{
              fontSize: "16px",
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

      {/* Cycling AI Benchmark */}
      <div
        style={{
          textAlign: "center",
          minWidth: "160px",
          opacity: fadeState === "in" ? 1 : 0,
          transition: "opacity 0.35s ease-in-out",
        }}
      >
        <div
          style={{
            fontSize: "7px",
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
            fontSize: "18px",
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
              fontSize: "7px",
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
              fontSize: "7px",
              color: "#555",
              letterSpacing: "0.5px",
              marginTop: "1px",
            }}
          >
            OF ALL CODE WRITTEN
          </div>
        )}
      </div>

      {metrics.slice(2).map((m) => (
        <div
          key={m.label}
          style={{
            textAlign: "center",
            minWidth: "120px",
          }}
        >
          <div
            style={{
              fontSize: "8px",
              color: "#666",
              letterSpacing: "1px",
              marginBottom: "2px",
            }}
          >
            {m.label}
          </div>
          <div
            style={{
              fontSize: "16px",
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
    </div>
  );
}
