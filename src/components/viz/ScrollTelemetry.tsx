import { useEffect, useState, useRef, useCallback } from "react";

/**
 * ScrollTelemetry — Converts scroll behavior into quantified surveillance
 * data. Measures every scroll event and computes physical distance,
 * velocity patterns, direction changes, and viewport coverage.
 *
 * Shows:
 * - Current scroll position (px)
 * - Total distance scrolled (px + physical cm/meters)
 * - Maximum depth reached
 * - Scroll velocity (live, px/s)
 * - Peak velocity recorded
 * - Number of direction reversals
 * - Total active scroll time
 * - Document coverage percentage (how much of the page you've "scanned")
 * - Mini heatmap strip showing which regions have been viewed most
 *
 * Physical distance calculation uses devicePixelRatio and assumed
 * 96 DPI to convert pixel distance into real-world centimeters/meters.
 *
 * No commentary. Quantifying casual browsing into precise physical
 * metrics ("you have scrolled 2.4 meters") is unsettling on its own.
 */

// Convert CSS pixels to physical cm
// 1 CSS px = 1/96 inch at standard DPI, adjusted by devicePixelRatio
function pxToCm(px: number): number {
  const dpr = window.devicePixelRatio || 1;
  const physicalPx = px / dpr; // back to CSS pixels
  const inches = physicalPx / 96;
  return inches * 2.54;
}

function formatDistance(cm: number): string {
  if (cm < 100) return `${cm.toFixed(1)} cm`;
  return `${(cm / 100).toFixed(2)} m`;
}

// Coverage heatmap — divide document into N bins
const COVERAGE_BINS = 40;

export function ScrollTelemetry() {
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({
    position: 0,
    totalDistance: 0,
    maxDepth: 0,
    velocity: 0,
    peakVelocity: 0,
    reversals: 0,
    scrollTime: 0,
    coverage: 0,
    events: 0,
  });
  const [coverageBins, setCoverageBins] = useState<Float32Array>(
    () => new Float32Array(COVERAGE_BINS)
  );
  const [active, setActive] = useState(false);

  // Refs for tracking
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const lastDirection = useRef(0); // 1=down, -1=up, 0=none
  const totalDist = useRef(0);
  const maxDepth = useRef(0);
  const peakVel = useRef(0);
  const reversals = useRef(0);
  const scrollTime = useRef(0);
  const events = useRef(0);
  const velocityHistory = useRef<number[]>([]);
  const scrollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const binsRef = useRef<Float32Array>(new Float32Array(COVERAGE_BINS));
  const lastScrollActive = useRef(0);

  const updateCoverage = useCallback(() => {
    const scrollY = window.scrollY || window.pageYOffset;
    const viewportH = window.innerHeight;
    const docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      viewportH
    );

    // Mark bins that are currently visible
    const topFrac = scrollY / docH;
    const bottomFrac = (scrollY + viewportH) / docH;
    const startBin = Math.floor(topFrac * COVERAGE_BINS);
    const endBin = Math.min(
      Math.ceil(bottomFrac * COVERAGE_BINS),
      COVERAGE_BINS
    );

    const bins = binsRef.current;
    for (let i = startBin; i < endBin; i++) {
      bins[i] = Math.min(bins[i] + 0.05, 1.0);
    }
    setCoverageBins(new Float32Array(bins));

    // Calculate coverage percentage (bins > 0)
    let covered = 0;
    for (let i = 0; i < COVERAGE_BINS; i++) {
      if (bins[i] > 0) covered++;
    }
    return (covered / COVERAGE_BINS) * 100;
  }, []);

  // Scroll event handler
  useEffect(() => {
    const handleScroll = () => {
      const now = performance.now();
      const scrollY = window.scrollY || window.pageYOffset;
      const delta = scrollY - lastY.current;
      const absDelta = Math.abs(delta);
      const dt = now - lastTime.current;

      events.current++;

      // Distance
      totalDist.current += absDelta;

      // Max depth
      if (scrollY > maxDepth.current) {
        maxDepth.current = scrollY;
      }

      // Velocity (px/s)
      let vel = 0;
      if (dt > 0 && dt < 500) {
        vel = (absDelta / dt) * 1000;
        velocityHistory.current.push(vel);
        if (velocityHistory.current.length > 20) {
          velocityHistory.current.shift();
        }
      }

      // Peak velocity
      if (vel > peakVel.current) {
        peakVel.current = vel;
      }

      // Direction reversals
      const dir = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      if (dir !== 0 && lastDirection.current !== 0 && dir !== lastDirection.current) {
        reversals.current++;
      }
      if (dir !== 0) {
        lastDirection.current = dir;
      }

      // Scroll time
      if (dt < 300) {
        scrollTime.current += dt;
      }

      // Coverage
      const coverage = updateCoverage();

      // Active indicator
      setActive(true);
      lastScrollActive.current = now;
      if (scrollingTimer.current) clearTimeout(scrollingTimer.current);
      scrollingTimer.current = setTimeout(() => setActive(false), 500);

      lastY.current = scrollY;
      lastTime.current = now;

      // Average recent velocity
      const recentVel =
        velocityHistory.current.length > 0
          ? velocityHistory.current.reduce((a, b) => a + b, 0) /
            velocityHistory.current.length
          : 0;

      setStats({
        position: scrollY,
        totalDistance: totalDist.current,
        maxDepth: maxDepth.current,
        velocity: recentVel,
        peakVelocity: peakVel.current,
        reversals: reversals.current,
        scrollTime: scrollTime.current,
        coverage,
        events: events.current,
      });
    };

    // Initial state
    lastY.current = window.scrollY || window.pageYOffset;
    lastTime.current = performance.now();
    maxDepth.current = lastY.current;
    updateCoverage();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollingTimer.current) clearTimeout(scrollingTimer.current);
    };
  }, [updateCoverage]);

  // Physical distance in cm
  const distanceCm = pxToCm(stats.totalDistance);
  const maxDepthCm = pxToCm(stats.maxDepth);
  const scrollTimeSec = stats.scrollTime / 1000;

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.85)",
        border: `1px solid rgba(255,140,0,${active ? 0.5 : 0.3})`,
        borderRadius: "3px",
        padding: collapsed ? "6px 10px" : "10px 12px",
        fontFamily: "'Courier New', monospace",
        fontSize: "9px",
        color: "#ff8c00",
        userSelect: "none",
        width: "100%",
        boxSizing: "border-box",
        transition: "border-color 0.3s ease",
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
              background: active ? "#ff4400" : "#ff8c00",
              boxShadow: `0 0 ${active ? "6" : "4"}px ${active ? "#ff4400" : "#ff8c00"}`,
              display: "inline-block",
              transition: "all 0.2s ease",
            }}
          />
          <span style={{ letterSpacing: "2px", fontSize: "8px", color: "#ff8c00", opacity: 0.9 }}>
            SCROLL TELEMETRY
          </span>
        </div>
        <span style={{ color: "#555", fontSize: "8px" }}>{collapsed ? "▸" : "▾"}</span>
      </div>

      {collapsed ? null : (
        <div>
          {/* Position + Distance */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "3px 12px",
              marginBottom: "6px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666", fontSize: "8px" }}>POSITION</span>
              <span style={{ color: "#aaa", fontSize: "8px" }}>
                {Math.round(stats.position)}px
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666", fontSize: "8px" }}>MAX DEPTH</span>
              <span style={{ color: "#aaa", fontSize: "8px" }}>
                {Math.round(stats.maxDepth)}px
              </span>
            </div>
          </div>

          {/* Physical distance — the star metric */}
          <div
            style={{
              background: "rgba(255,140,0,0.08)",
              borderRadius: "2px",
              padding: "6px 8px",
              marginBottom: "6px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "7px", color: "#666", letterSpacing: "1.5px", marginBottom: "2px" }}>
              TOTAL DISTANCE SCROLLED
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#ff8c00",
                fontWeight: "bold",
                textShadow: "0 0 6px rgba(255,140,0,0.3)",
              }}
            >
              {formatDistance(distanceCm)}
            </div>
            <div style={{ fontSize: "7px", color: "#555", marginTop: "1px" }}>
              {Math.round(stats.totalDistance).toLocaleString()} px
            </div>
          </div>

          {/* Velocity */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "3px",
            }}
          >
            <span style={{ color: "#666", fontSize: "8px" }}>VELOCITY</span>
            <span
              style={{
                color: active ? "#ff4400" : "#888",
                fontSize: "8px",
                transition: "color 0.3s ease",
              }}
            >
              {active ? `${Math.round(stats.velocity)} px/s` : "—"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "3px",
            }}
          >
            <span style={{ color: "#666", fontSize: "8px" }}>PEAK VELOCITY</span>
            <span style={{ color: "#ff8c00", fontSize: "8px" }}>
              {Math.round(stats.peakVelocity)} px/s
            </span>
          </div>

          {/* Stats grid */}
          <div
            style={{
              borderTop: "1px solid rgba(255,140,0,0.15)",
              paddingTop: "5px",
              marginTop: "4px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "3px 12px",
              fontSize: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#555" }}>REVERSALS</span>
              <span style={{ color: "#aaa" }}>{reversals.current}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#555" }}>EVENTS</span>
              <span style={{ color: "#aaa" }}>{stats.events.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#555" }}>SCROLL TIME</span>
              <span style={{ color: "#aaa" }}>{scrollTimeSec.toFixed(1)}s</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#555" }}>DEPTH</span>
              <span style={{ color: "#aaa" }}>{formatDistance(maxDepthCm)}</span>
            </div>
          </div>

          {/* Coverage heatmap */}
          <div
            style={{
              borderTop: "1px solid rgba(255,140,0,0.15)",
              paddingTop: "5px",
              marginTop: "5px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span style={{ color: "#555", fontSize: "7px", letterSpacing: "1px" }}>
                COVERAGE MAP
              </span>
              <span style={{ color: "#ff8c00", fontSize: "8px", fontWeight: "bold" }}>
                {stats.coverage.toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "1px",
                height: "12px",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              {Array.from(coverageBins).map((val, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    background:
                      val > 0.6
                        ? `rgba(255,68,0,${0.3 + val * 0.7})`
                        : val > 0
                          ? `rgba(255,140,0,${0.15 + val * 0.5})`
                          : "rgba(255,255,255,0.03)",
                    transition: "background 0.5s ease",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
