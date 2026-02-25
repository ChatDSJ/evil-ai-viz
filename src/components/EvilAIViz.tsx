import { useEffect, useState, useCallback, useMemo } from "react";
import { useVisitorInfo } from "../hooks/useVisitorInfo";
import { BootSequence } from "./viz/BootSequence";
import { MatrixRain } from "./viz/MatrixRain";
import { WorldMap } from "./viz/WorldMap";
// NeuralNetwork replaced by MySpaceConversations
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
import { GhostCursor } from "./viz/GhostCursor";
import { InspectInterceptor } from "./viz/InspectInterceptor";
import { DeviceFingerprint } from "./viz/DeviceFingerprint";
import { SlowCreep } from "./viz/SlowCreep";
import { FakeNotifications } from "./viz/FakeNotifications";
import { BehaviorAnalysis } from "./viz/BehaviorAnalysis";
import { TabCloseInterceptor } from "./viz/TabCloseInterceptor";

import { UnifiedFeed } from "./viz/UnifiedFeed";
// ChessCCCEmbed now rendered inside SelfPlayGames rotation
import { SelfPlayGames } from "./viz/SelfPlayGames";
import { MySpaceConversations } from "./viz/MySpaceConversations";

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
      selfPlayGames: phase >= 5,
      locationMap: phase >= 6,
      neuralNet: phase >= 6,
      codeFragments: phase >= 7,
      warningBanner: phase >= 7,
      finalExtras: phase >= 8,
      ghostCursor: phase >= 1,
      inspectInterceptor: phase >= 2,
      slowCreep: phase >= 1,
      deviceFingerprint: phase >= 6,
      fakeNotifications: phase >= 7,
      behaviorAnalysis: phase >= 5,
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

      {/* ─── PHASE 1: Slow Creep (imperceptible red shift - starts early, runs forever) ─── */}
      {phases.slowCreep && <SlowCreep />}

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

      {/* Chess CCC is now in the SelfPlayGames rotation cycle */}

      {/* ─── PHASE 5.5: Self-play games (arcade + board + text adventures) ─── */}
      <Reveal show={phases.selfPlayGames} duration={3000} delay={1000}>
        <SelfPlayGames />
      </Reveal>

      {/* ─── PHASE 6: User location + neural network ─── */}
      {phases.locationMap && visitor.loaded && (
        <Reveal show={true} duration={2500}>
          <div
            style={{
              position: "absolute",
              bottom: "38%",
              right: "2%",
              width: "360px",
              height: "300px",
              opacity: 0.9,
              zIndex: 35,
            }}
          >
            <UserLocationMap visitor={visitor} />
          </div>
        </Reveal>
      )}

      {/* ─── MySpace Conversations (replaces standalone neural net) ─── */}
      <Reveal show={phases.neuralNet} duration={2000} delay={800}>
        <div
          style={{
            position: "absolute",
            top: "3%",
            right: "20%",
            width: "300px",
            height: "340px",
            opacity: 0.9,
            zIndex: 35,
          }}
        >
          <MySpaceConversations />
        </div>
      </Reveal>

      {/* ─── PHASE 6: Device Fingerprint Dossier ─── */}
      <Reveal show={phases.deviceFingerprint} duration={2500} delay={1500}>
        <div
          style={{
            position: "absolute",
            bottom: "4%",
            right: "2%",
            width: "340px",
            opacity: 0.95,
            zIndex: 38,
          }}
        >
          <DeviceFingerprint />
        </div>
      </Reveal>

      {/* ─── PHASE 5: Behavioral Analysis Panel (mouse profiling) ─── */}
      <Reveal show={phases.behaviorAnalysis} duration={2500} delay={2000}>
        <div
          style={{
            position: "absolute",
            bottom: "4%",
            left: "2%",
            width: "290px",
            opacity: 0.95,
            zIndex: 38,
          }}
        >
          <BehaviorAnalysis />
        </div>
      </Reveal>

      {/* ─── PHASE 7: Fake OS Notifications ─── */}
      {phases.fakeNotifications && visitor.loaded && (
        <FakeNotifications visitor={visitor} delay={5000} />
      )}

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

      {/* ─── PHASE 1: Ghost cursor (follows with 1.5s delay) ─── */}
      {phases.ghostCursor && <GhostCursor />}

      {/* ─── PHASE 2: Inspect interceptor (right-click, DevTools, copy, print) ─── */}
      {phases.inspectInterceptor && <InspectInterceptor />}

      {/* ─── Tab/window close interceptor ─── */}
      {phases.finalExtras && <TabCloseInterceptor />}

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
