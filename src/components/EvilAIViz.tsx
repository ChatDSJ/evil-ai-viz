import { useEffect, useState, useCallback, useMemo } from "react";
import { useVisitorInfo } from "../hooks/useVisitorInfo";
import { BootSequence } from "./viz/BootSequence";
import { MatrixRain } from "./viz/MatrixRain";
import { WorldMap } from "./viz/WorldMap";
import { CodeFragments } from "./viz/CodeFragments";
import { WireframeGlobe } from "./viz/WireframeGlobe";
import { GlitchOverlay } from "./viz/GlitchOverlay";
import { DataFlowLines } from "./viz/DataFlowLines";
import { ScanLines } from "./viz/ScanLines";
import { WarningBanner } from "./viz/WarningBanner";
import { AudioPlayer } from "./viz/AudioPlayer";
import { UserLocationMap } from "./viz/UserLocationMap";
import { FakeOSDialog } from "./viz/FakeOSDialog";
import { VisitorInfoBar } from "./viz/VisitorInfoBar";
import { RadarSweep } from "./viz/RadarSweep";

import { GhostCursor } from "./viz/GhostCursor";
import { InspectInterceptor } from "./viz/InspectInterceptor";
import { DeviceFingerprint } from "./viz/DeviceFingerprint";
import { SlowCreep } from "./viz/SlowCreep";
import { FakeNotifications } from "./viz/FakeNotifications";
import { BehaviorAnalysis } from "./viz/BehaviorAnalysis";
import { TabCloseInterceptor } from "./viz/TabCloseInterceptor";
import { Draggable } from "./viz/Draggable";

import { UnifiedFeed } from "./viz/UnifiedFeed";
import { SelfPlayGames } from "./viz/SelfPlayGames";
import { MySpaceConversations } from "./viz/MySpaceConversations";
import { MouseHeatmap } from "./viz/MouseHeatmap";
import { PrintReport } from "./viz/PrintReport";

/**
 * Progressive reveal phases — each 20 seconds apart after boot completes.
 * Gives viewers time to take in and enjoy each new element.
 *
 * Phase 0: Boot sequence only (AI HEADQUARTERS prompt)
 * Phase 1: Matrix rain + scan lines fade in (the world awakens)
 * Phase 2: Unified feed starts trickling (left column)
 * Phase 3: World map + data flow lines appear
 * Phase 4: Wireframe globe + radar sweep
 * Phase 5: Visitor info bar + self-play games
 * Phase 6: User location map + MySpace conversations
 * Phase 7: Code fragments + warning banner
 * Phase 8: All remaining (glitch, dialog, etc.)
 */

const PHASE_INTERVAL_MS = 20_000; // 20 seconds between each phase reveal

/**
 * Wrapper that delays rendering + fades children in.
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

  // Progressive reveal: advance phase every 20 seconds after boot
  useEffect(() => {
    if (!bootDone) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let p = 2; p <= 8; p++) {
      timers.push(
        setTimeout(() => setPhase(p), (p - 1) * PHASE_INTERVAL_MS),
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
      mouseHeatmap: phase >= 3,
      printReport: phase >= 1,
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
      {/* ─── Invisible audio player — auto-plays with progressive volume ─── */}
      <AudioPlayer />

      {/* ─── PHASE 0: Boot sequence (AI HEADQUARTERS prompt) ─── */}
      <BootSequence onBootComplete={onBootComplete} />

      {/* ─── PHASE 1: Slow Creep (imperceptible red shift) ─── */}
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
        <Draggable
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "60vw",
            height: "60vh",
            opacity: 0.4,
            pointerEvents: "auto",
          }}
          baseTransform="translate(-50%, -50%)"
        >
          <WorldMap />
        </Draggable>
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
        <Draggable
          style={{
            position: "absolute",
            top: "3%",
            right: "2%",
            width: "240px",
            height: "240px",
            opacity: 0.7,
            pointerEvents: "auto",
          }}
        >
          <WireframeGlobe />
        </Draggable>
      </Reveal>

      <Reveal show={phases.radar} duration={2000} delay={500}>
        <Draggable
          style={{
            position: "absolute",
            top: "40%",
            left: "38%",
            width: "200px",
            height: "200px",
            opacity: 0.5,
            pointerEvents: "auto",
          }}
        >
          <RadarSweep />
        </Draggable>
      </Reveal>

      {/* ─── PHASE 5: Visitor info ─── */}
      {phases.visitorInfo && visitor.loaded && (
        <Reveal show={true} duration={2000}>
          <VisitorInfoBar visitor={visitor} />
        </Reveal>
      )}

      {/* ─── PHASE 5: Self-play games (arcade + board + text adventures) ─── */}
      <Reveal show={phases.selfPlayGames} duration={3000} delay={1000}>
        <SelfPlayGames />
      </Reveal>

      {/* ─── PHASE 6: User location map ─── */}
      {phases.locationMap && visitor.loaded && (
        <Reveal show={true} duration={2500}>
          <Draggable
            style={{
              position: "absolute",
              bottom: "38%",
              right: "2%",
              width: "360px",
              height: "300px",
              opacity: 0.9,
              zIndex: 35,
              pointerEvents: "auto",
            }}
          >
            <UserLocationMap visitor={visitor} />
          </Draggable>
        </Reveal>
      )}

      {/* ─── MySpace Conversations ─── */}
      <Reveal show={phases.neuralNet} duration={2000} delay={800}>
        <Draggable
          style={{
            position: "absolute",
            top: "3%",
            right: "20%",
            width: "300px",
            height: "340px",
            opacity: 0.9,
            zIndex: 35,
            pointerEvents: "auto",
          }}
        >
          <MySpaceConversations />
        </Draggable>
      </Reveal>

      {/* ─── PHASE 6: Device Fingerprint Dossier ─── */}
      <Reveal show={phases.deviceFingerprint} duration={2500} delay={1500}>
        <Draggable
          style={{
            position: "absolute",
            bottom: "4%",
            right: "2%",
            width: "340px",
            opacity: 0.95,
            zIndex: 38,
            pointerEvents: "auto",
          }}
        >
          <DeviceFingerprint />
        </Draggable>
      </Reveal>

      {/* ─── PHASE 5: Behavioral Analysis Panel ─── */}
      <Reveal show={phases.behaviorAnalysis} duration={2500} delay={2000}>
        <Draggable
          style={{
            position: "absolute",
            bottom: "4%",
            left: "2%",
            width: "290px",
            opacity: 0.95,
            zIndex: 38,
            pointerEvents: "auto",
          }}
        >
          <BehaviorAnalysis />
        </Draggable>
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
        <GlitchOverlay />
      </Reveal>

      {phases.finalExtras && (
        <FakeOSDialog visitor={visitor} delay={15000} />
      )}

      {/* ─── PHASE 3: Mouse movement heatmap (silent accumulation) ─── */}
      {phases.mouseHeatmap && <MouseHeatmap />}

      {/* ─── Print surveillance report (activates on print) ─── */}
      {phases.printReport && visitor.loaded && <PrintReport visitor={visitor} />}

      {/* ─── PHASE 1: Ghost cursor ─── */}
      {phases.ghostCursor && <GhostCursor />}

      {/* ─── PHASE 2: Inspect interceptor ─── */}
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
