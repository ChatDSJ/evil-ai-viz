import { useEffect, useState, useCallback, useMemo } from "react";
import { useVisitorInfo } from "../hooks/useVisitorInfo";
import { BootSequence } from "./viz/BootSequence";
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
import { UnifiedFeed } from "./viz/UnifiedFeed";
import { ChessCCCEmbed } from "./viz/ChessCCCEmbed";

/**
 * Progressive reveal phases (each ~5s apart after boot completes):
 *
 * Phase 0: Boot sequence only (AI HEADQUARTERS prompt)
 * Phase 1: Matrix rain + scan lines fade in (the world awakens)
 * Phase 2: Unified feed starts trickling (left column)
 * Phase 3: World map + data flow lines appear
 * Phase 4: Wireframe globe + radar sweep
 * Phase 5: Visitor info bar + Chess CCC embed
 * Phase 6: User location map + neural network
 * Phase 7: Code fragments + warning banner
 * Phase 8: All remaining (glitch, dialog, controls)
 */

/**
 * Wrapper that delays rendering + fades children in.
 * Uses `position: absolute; inset: 0` by default so it doesn't
 * break the absolute-positioned children (canvases, overlays).
 * Pass `inline` to use inline layout instead.
 */
function Reveal({
  show,
  duration = 2000,
  delay = 0,
  inline = false,
  children,
}: {
  show: boolean;
  duration?: number;
  delay?: number;
  inline?: boolean;
  children: React.ReactNode;
}) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setShouldRender(true), delay);
      return () => clearTimeout(timer);
    }
  }, [show, delay]);

  if (!shouldRender) return null;

  if (inline) {
    return (
      <div
        style={{
          animation: `revealFadeIn ${duration}ms ease-out forwards`,
        }}
      >
        {children}
      </div>
    );
  }

  // Full-overlay wrapper — preserves absolute positioning of children
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        animation: `revealFadeIn ${duration}ms ease-out forwards`,
      }}
    >
      {children}
    </div>
  );
}

export function EvilAIViz() {
  const [phase, setPhase] = useState(0);
  const [bootDone, setBootDone] = useState(false);
  const visitor = useVisitorInfo();

  const onBootComplete = useCallback(() => {
    setBootDone(true);
    setPhase(1);
  }, []);

  // Progressive reveal: advance phase every 5 seconds after boot
  useEffect(() => {
    if (!bootDone) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let p = 2; p <= 8; p++) {
      timers.push(
        setTimeout(() => setPhase(p), (p - 1) * 5000),
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [bootDone]);

  // Memoize phase checks
  const phases = useMemo(
    () => ({
      matrixRain: phase >= 1,
      scanLines: phase >= 1,
      feed: phase >= 2,
      worldMap: phase >= 3,
      dataFlow: phase >= 3,
      globe: phase >= 4,
      radar: phase >= 4,
      visitorInfo: phase >= 5,
      chessCCC: phase >= 5,
      locationMap: phase >= 6,
      neuralNet: phase >= 6,
      codeFragments: phase >= 7,
      warningBanner: phase >= 7,
      finalExtras: phase >= 8,
    }),
    [phase],
  );

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
      {/* ─── PHASE 0: Boot sequence (AI HEADQUARTERS prompt) ─── */}
      <BootSequence onBootComplete={onBootComplete} />

      {/* ─── PHASE 1: Matrix rain + scan lines ─── */}
      <Reveal show={phases.matrixRain} duration={3000}>
        <MatrixRain />
      </Reveal>

      <Reveal show={phases.scanLines} duration={2000} delay={500}>
        <ScanLines />
      </Reveal>

      {/* ─── PHASE 3: World map + data flow ─── */}
      <Reveal show={phases.worldMap} duration={3000}>
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
      </Reveal>

      <Reveal show={phases.dataFlow} duration={2000} delay={1000}>
        <DataFlowLines />
      </Reveal>

      {/* ─── PHASE 2: Unified feed (left column) ─── */}
      {phases.feed && visitor.loaded && (
        <Reveal show={true} duration={2500}>
          <UnifiedFeed visitor={visitor} />
        </Reveal>
      )}

      {/* ─── PHASE 4: Globe + radar ─── */}
      <Reveal show={phases.globe} duration={2500}>
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
      </Reveal>

      <Reveal show={phases.radar} duration={2000} delay={500}>
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
      </Reveal>

      {/* ─── PHASE 5: Visitor info + Chess CCC ─── */}
      {phases.visitorInfo && visitor.loaded && (
        <Reveal show={true} duration={2000}>
          <VisitorInfoBar visitor={visitor} />
        </Reveal>
      )}

      <Reveal show={phases.chessCCC} duration={2500} delay={500}>
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
      </Reveal>

      {/* ─── PHASE 6: User location + neural network ─── */}
      {phases.locationMap && visitor.loaded && (
        <Reveal show={true} duration={2500}>
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
        </Reveal>
      )}

      <Reveal show={phases.neuralNet} duration={2000} delay={800}>
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
      </Reveal>

      {/* ─── PHASE 7: Code fragments + warning banner ─── */}
      <Reveal show={phases.codeFragments} duration={2000}>
        <CodeFragments />
      </Reveal>

      <Reveal show={phases.warningBanner} duration={1500} delay={500}>
        <WarningBanner />
      </Reveal>

      {/* ─── PHASE 8: All remaining extras ─── */}
      <Reveal show={phases.finalExtras} duration={2000}>
        <TabAwayDetector />
      </Reveal>

      <Reveal show={phases.finalExtras} duration={2000}>
        <GlitchOverlay />
      </Reveal>

      {phases.finalExtras && (
        <FakeOSDialog visitor={visitor} delay={15000} />
      )}

      <Reveal show={phases.finalExtras} duration={1500} delay={500}>
        <FullscreenButton />
      </Reveal>

      <Reveal show={phases.finalExtras} duration={1500} delay={500}>
        <AudioPlayer />
      </Reveal>

      <Reveal show={phases.finalExtras} duration={1500} delay={500}>
        <GitHubLink />
      </Reveal>

      {/* Global animation keyframes */}
      <style>{`
        @keyframes revealFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
