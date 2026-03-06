import { useCallback, useEffect, useRef, useState } from "react";

interface MouseSample {
  x: number;
  y: number;
  t: number;
}

interface ReplayTrack {
  samples: MouseSample[];
  startTs: number;
  endTs: number;
  durationMs: number;
  replayStartPerf: number;
}

const BUFFER_MS = 30_000;
const AUTO_REPLAY_COOLDOWN_MS = 55_000;
const MIN_REPLAY_SAMPLES = 45;

export function MouseReplay() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [replaying, setReplaying] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [coverageMs, setCoverageMs] = useState(0);
  const [replayPct, setReplayPct] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [modeLabel, setModeLabel] = useState("BUFFERING");

  const samplesRef = useRef<MouseSample[]>([]);
  const replayRef = useRef<ReplayTrack | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastAutoReplayRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      const next = samplesRef.current;
      next.push({ x: e.clientX, y: e.clientY, t: now });

      const cutoff = now - BUFFER_MS;
      while (next.length > 0 && next[0].t < cutoff) {
        next.shift();
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const samples = samplesRef.current;
      setSampleCount(samples.length);
      if (samples.length > 1) {
        setCoverageMs(samples[samples.length - 1].t - samples[0].t);
      } else {
        setCoverageMs(0);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [visible]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startReplay = useCallback(
    (auto = false) => {
      if (replaying) return;
      const samples = [...samplesRef.current];
      if (samples.length < MIN_REPLAY_SAMPLES) return;

      const startTs = samples[0].t;
      const endTs = samples[samples.length - 1].t;
      const durationMs = Math.max(2800, endTs - startTs);

      replayRef.current = {
        samples,
        startTs,
        endTs,
        durationMs,
        replayStartPerf: performance.now(),
      };

      setReplayPct(0);
      setReplaying(true);
      setCursor({ x: samples[0].x, y: samples[0].y });
      setModeLabel(auto ? "AUTO REPLAY" : "MANUAL REPLAY");
      lastAutoReplayRef.current = Date.now();
    },
    [replaying],
  );

  useEffect(() => {
    if (!visible || replaying) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const ready = coverageMs > 20_000 && sampleCount >= MIN_REPLAY_SAMPLES;
      if (!ready) return;
      if (now - lastAutoReplayRef.current < AUTO_REPLAY_COOLDOWN_MS) return;
      startReplay(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [coverageMs, replaying, sampleCount, startReplay, visible]);

  useEffect(() => {
    if (!replaying) return;

    const draw = () => {
      const replay = replayRef.current;
      const canvas = canvasRef.current;
      if (!replay || !canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.floor(window.innerWidth * dpr);
      const targetH = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const elapsed = performance.now() - replay.replayStartPerf;
      const pct = Math.min(1, elapsed / replay.durationMs);
      const targetTs = replay.startTs + (replay.endTs - replay.startTs) * pct;

      let idx = 0;
      while (
        idx < replay.samples.length - 1 &&
        replay.samples[idx + 1].t <= targetTs
      ) {
        idx++;
      }

      if (idx > 0) {
        ctx.beginPath();
        ctx.moveTo(replay.samples[0].x, replay.samples[0].y);
        for (let i = 1; i <= idx; i++) {
          ctx.lineTo(replay.samples[i].x, replay.samples[i].y);
        }
        ctx.strokeStyle = "rgba(255, 0, 64, 0.26)";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(255, 0, 64, 0.5)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      const point = replay.samples[Math.max(0, idx)];
      setCursor({ x: point.x, y: point.y });
      setReplayPct(pct);

      if (pct >= 1) {
        setReplaying(false);
        setModeLabel("BUFFERING");
        setTimeout(() => clearCanvas(), 500);
        return;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [clearCanvas, replaying]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  const coverageSec = (coverageMs / 1000).toFixed(1);
  const readiness = sampleCount >= MIN_REPLAY_SAMPLES && coverageMs > 20_000;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 46,
        }}
      />

      {replaying && cursor && (
        <div
          style={{
            position: "fixed",
            left: cursor.x - 8,
            top: cursor.y - 8,
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            border: "1px solid rgba(255, 0, 64, 0.95)",
            boxShadow: "0 0 14px rgba(255, 0, 64, 0.8)",
            pointerEvents: "none",
            zIndex: 47,
          }}
        />
      )}

      <div
        style={{
          background: "rgba(0, 0, 0, 0.9)",
          border: "1px solid rgba(255, 0, 64, 0.25)",
          borderRadius: "4px",
          padding: "8px 10px",
          fontFamily: "'Courier New', monospace",
          width: "100%",
          maxWidth: "300px",
          boxShadow: "0 0 22px rgba(255, 0, 64, 0.08)",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255, 0, 64, 0.12)",
            paddingBottom: "6px",
            marginBottom: "8px",
            cursor: "pointer",
          }}
          onClick={() => setExpanded(prev => !prev)}
          onKeyDown={() => {}}
          role="button"
          tabIndex={0}
        >
          <span
            style={{
              fontSize: "10px",
              color: "#ff0040",
              letterSpacing: "1.6px",
              fontWeight: "bold",
            }}
          >
            TRAJECTORY REPLAY
          </span>
          <span
            style={{ fontSize: "10px", color: replaying ? "#ff0040" : "#666" }}
          >
            {expanded ? "▼" : "▶"}
          </span>
        </div>

        {expanded && (
          <>
            <div
              style={{
                fontSize: "10px",
                color: "#bbb",
                lineHeight: 1.4,
                marginBottom: "7px",
              }}
            >
              Cursor telemetry buffered for {coverageSec}s. Playback reproduces
              exact path timing.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px 8px",
                marginBottom: "8px",
              }}
            >
              <div style={{ fontSize: "10px", color: "#666" }}>SAMPLES</div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#ff99aa",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {sampleCount}
              </div>
              <div style={{ fontSize: "10px", color: "#666" }}>WINDOW</div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#ff99aa",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {coverageSec}s / 30s
              </div>
              <div style={{ fontSize: "10px", color: "#666" }}>MODE</div>
              <div
                style={{
                  fontSize: "10px",
                  color: replaying ? "#ff0040" : "#999",
                  textAlign: "right",
                }}
              >
                {modeLabel}
              </div>
            </div>

            <div
              style={{
                height: "4px",
                borderRadius: "99px",
                background: "rgba(255, 255, 255, 0.1)",
                overflow: "hidden",
                marginBottom: "9px",
              }}
            >
              <div
                style={{
                  width: `${replaying ? replayPct * 100 : Math.min(100, (coverageMs / BUFFER_MS) * 100)}%`,
                  height: "100%",
                  background: replaying
                    ? "linear-gradient(90deg, #ff0040, #ff6b88)"
                    : "linear-gradient(90deg, #555, #00ff41)",
                  transition: replaying ? "none" : "width 0.25s ease",
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => startReplay(false)}
              disabled={replaying || !readiness}
              style={{
                width: "100%",
                border: "1px solid rgba(255, 0, 64, 0.5)",
                background:
                  replaying || !readiness
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(255, 0, 64, 0.13)",
                color: replaying || !readiness ? "#666" : "#ff99aa",
                fontFamily: "inherit",
                fontSize: "10px",
                letterSpacing: "1.3px",
                padding: "7px 8px",
                cursor: replaying || !readiness ? "default" : "pointer",
              }}
            >
              {replaying
                ? "REPLAY IN PROGRESS"
                : readiness
                  ? "REPLAY RECORDED PATH"
                  : "BUFFERING TRAJECTORY"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
