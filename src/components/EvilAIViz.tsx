import { useEffect, useState } from "react";
import { useVisitorInfo } from "../hooks/useVisitorInfo";
import { MatrixRain } from "./viz/MatrixRain";
import { WorldMap } from "./viz/WorldMap";
import { FakeTerminal } from "./viz/FakeTerminal";
import { NeuralNetwork } from "./viz/NeuralNetwork";
import { HexStream } from "./viz/HexStream";
import { MetricsDashboard } from "./viz/MetricsDashboard";
import { RadarSweep } from "./viz/RadarSweep";
import { CodeFragments } from "./viz/CodeFragments";
import { WireframeGlobe } from "./viz/WireframeGlobe";
import { GlitchOverlay } from "./viz/GlitchOverlay";
import { DataFlowLines } from "./viz/DataFlowLines";
import { ScanLines } from "./viz/ScanLines";
import { WarningBanner } from "./viz/WarningBanner";
import { FullscreenButton } from "./viz/FullscreenButton";
import { AudioPlayer } from "./viz/AudioPlayer";
import { UserLocationMap } from "./viz/UserLocationMap";
import { FakeOSDialog } from "./viz/FakeOSDialog";
import { VisitorInfoBar } from "./viz/VisitorInfoBar";
// New evil features
import { WeatherWidget } from "./viz/WeatherWidget";
import { LiveViewers } from "./viz/LiveViewers";
import { SessionTimer } from "./viz/SessionTimer";
import { BatteryMonitor } from "./viz/BatteryMonitor";
import { TabAwayDetector } from "./viz/TabAwayDetector";
import { NewsWidget } from "./viz/NewsWidget";
import { GitHubLink } from "./viz/GitHubLink";

export function EvilAIViz() {
  const [loaded, setLoaded] = useState(false);
  const visitor = useVisitorInfo();

  useEffect(() => {
    // Boot sequence
    const timer = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        overflow: "hidden",
        fontFamily: "'Courier New', 'Fira Code', monospace",
        cursor: "none",
      }}
    >
      {/* Base layer - Matrix rain */}
      <MatrixRain />

      {/* Scan lines overlay */}
      <ScanLines />

      {loaded && (
        <>
          {/* World map with attack vectors - center */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "60vw",
              height: "60vh",
              opacity: 0.4,
            }}
          >
            <WorldMap />
          </div>

          {/* Wireframe globe - right side */}
          <div
            style={{
              position: "absolute",
              top: "5%",
              right: "2%",
              width: "280px",
              height: "280px",
              opacity: 0.7,
            }}
          >
            <WireframeGlobe />
          </div>

          {/* Data flow lines across screen */}
          <DataFlowLines />

          {/* Neural network - bottom left */}
          <div
            style={{
              position: "absolute",
              bottom: "12%",
              left: "2%",
              width: "320px",
              height: "240px",
              opacity: 0.8,
            }}
          >
            <NeuralNetwork />
          </div>

          {/* Fake terminal - top left */}
          <div
            style={{
              position: "absolute",
              top: "3%",
              left: "2%",
              width: "420px",
              maxHeight: "35vh",
            }}
          >
            <FakeTerminal visitor={visitor} />
          </div>

          {/* Hex stream - left side */}
          <div
            style={{
              position: "absolute",
              top: "42%",
              left: "2%",
              width: "200px",
              height: "200px",
              opacity: 0.6,
            }}
          >
            <HexStream />
          </div>

          {/* Radar sweep - bottom right */}
          <div
            style={{
              position: "absolute",
              bottom: "8%",
              right: "3%",
              width: "220px",
              height: "220px",
              opacity: 0.7,
            }}
          >
            <RadarSweep />
          </div>

          {/* User Location Map - right side, below globe — SWEEP OPERATION */}
          {visitor.loaded && (
            <div
              style={{
                position: "absolute",
                top: "36%",
                right: "2%",
                width: "300px",
                height: "280px",
                opacity: 0.9,
              }}
            >
              <UserLocationMap visitor={visitor} />
            </div>
          )}

          {/* Metrics dashboard - top center */}
          <div
            style={{
              position: "absolute",
              top: "2%",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <MetricsDashboard />
          </div>

          {/* Visitor info bar - just below metrics */}
          {visitor.loaded && <VisitorInfoBar visitor={visitor} />}

          {/* ─── NEW EVIL FEATURES ─── */}

          {/* Session timer - below visitor info bar */}
          <div
            style={{
              position: "absolute",
              top: "78px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
            }}
          >
            <SessionTimer />
          </div>

          {/* Battery monitor - below session timer */}
          <div
            style={{
              position: "absolute",
              top: "102px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
            }}
          >
            <BatteryMonitor />
          </div>

          {/* Weather widget - left side, below hex stream */}
          {visitor.loaded && (
            <div
              style={{
                position: "absolute",
                top: "58%",
                left: "2%",
                width: "220px",
                zIndex: 100,
              }}
            >
              <WeatherWidget visitor={visitor} />
            </div>
          )}

          {/* Live viewers - right side, below user location map */}
          {visitor.loaded && (
            <div
              style={{
                position: "absolute",
                bottom: "8%",
                right: "30%",
                width: "270px",
                zIndex: 100,
              }}
            >
              <LiveViewers visitor={visitor} />
            </div>
          )}

          {/* News intel feed - below weather on left side */}
          {visitor.loaded && (
            <div
              style={{
                position: "absolute",
                top: "76%",
                left: "2%",
                width: "240px",
                zIndex: 100,
              }}
            >
              <NewsWidget visitor={visitor} />
            </div>
          )}

          {/* Tab away detector - center overlay */}
          <TabAwayDetector />

          {/* Code fragments floating */}
          <CodeFragments />

          {/* Warning banner - cycles across bottom */}
          <WarningBanner />

          {/* Glitch overlay - periodic */}
          <GlitchOverlay />

          {/* Fake OS dialog - appears after delay */}
          <FakeOSDialog visitor={visitor} delay={30000} />

          {/* Fullscreen button - auto-hides */}
          <FullscreenButton />

          {/* Audio player - auto-hides */}
          <AudioPlayer />

          {/* GitHub repo link - bottom left, matches theme */}
          <GitHubLink />
        </>
      )}
    </div>
  );
}
