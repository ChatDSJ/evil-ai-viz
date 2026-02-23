import { useEffect, useState } from "react";
import { useVisitorInfo } from "../hooks/useVisitorInfo";
import { MatrixRain } from "./viz/MatrixRain";
import { WorldMap } from "./viz/WorldMap";
import { NeuralNetwork } from "./viz/NeuralNetwork";
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
import { RadarSweep } from "./viz/RadarSweep";
import { TabAwayDetector } from "./viz/TabAwayDetector";
import { GitHubLink } from "./viz/GitHubLink";
// New components
import { UnifiedFeed } from "./viz/UnifiedFeed";
import { ChessCCCEmbed } from "./viz/ChessCCCEmbed";

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

          {/* Data flow lines across screen */}
          <DataFlowLines />

          {/* ═══ LEFT SIDE: Unified scrolling feed (entire left column) ═══ */}
          {visitor.loaded && <UnifiedFeed visitor={visitor} />}

          {/* ═══ RIGHT SIDE: Visualizations ═══ */}

          {/* Wireframe globe - top right */}
          <div
            style={{
              position: "absolute",
              top: "3%",
              right: "2%",
              width: "240px",
              height: "240px",
              opacity: 0.7,
            }}
          >
            <WireframeGlobe />
          </div>

          {/* Chess.com CCC embed - right side, below globe */}
          <div
            style={{
              position: "absolute",
              top: "32%",
              right: "2%",
              width: "340px",
              height: "280px",
              opacity: 0.9,
              zIndex: 40,
            }}
          >
            <ChessCCCEmbed />
          </div>

          {/* User Location Map - center right area */}
          {visitor.loaded && (
            <div
              style={{
                position: "absolute",
                bottom: "8%",
                right: "2%",
                width: "280px",
                height: "240px",
                opacity: 0.9,
              }}
            >
              <UserLocationMap visitor={visitor} />
            </div>
          )}

          {/* Neural network - bottom center-right */}
          <div
            style={{
              position: "absolute",
              bottom: "8%",
              right: "26%",
              width: "280px",
              height: "200px",
              opacity: 0.8,
            }}
          >
            <NeuralNetwork />
          </div>

          {/* Radar sweep - center area */}
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "38%",
              width: "200px",
              height: "200px",
              opacity: 0.5,
            }}
          >
            <RadarSweep />
          </div>

          {/* Visitor info bar - top center */}
          {visitor.loaded && <VisitorInfoBar visitor={visitor} />}

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
