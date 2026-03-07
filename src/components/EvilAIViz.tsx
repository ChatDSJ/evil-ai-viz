import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import { KeystreamPanel } from "./viz/KeystreamPanel";
import { ScreenTopology } from "./viz/ScreenTopology";
import { ClipboardInterceptor } from "./viz/ClipboardInterceptor";
import { PeripheralScan } from "./viz/PeripheralScan";
import { PresenceTimeline } from "./viz/PresenceTimeline";
import { TabIntelligence } from "./viz/TabIntelligence";
import { AudioFingerprint } from "./viz/AudioFingerprint";
import { SessionMemory } from "./viz/SessionMemory";
import { TemporalProfiler } from "./viz/TemporalProfiler";
import { NetworkTiming } from "./viz/NetworkTiming";
import { WebRTCProbe } from "./viz/WebRTCProbe";
import { TypingBiometric } from "./viz/TypingBiometric";

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

const PHASE_INTERVAL_MS = 7_000; // ~7 seconds between each phase reveal (3× faster)
const ANALYSIS_CYCLE_MS = 30_000; // 30 seconds per analysis panel

/**
 * User analysis panels — surveillance/fingerprinting sub-panes.
 * Only one is visible at a time, cycling every 30 seconds.
 * Ordered: identity → hardware → network → location → behavior → keystrokes.
 */
const ANALYSIS_PANEL_IDS = [
  'sessionMemory',
  'deviceFingerprint',
  'screenTopology',
  'audioFingerprint',
  'networkTiming',
  'webrtcProbe',
  'temporalProfiler',
  'peripheralScan',
  'behaviorAnalysis',
  'presenceTimeline',
  'keystreamPanel',
  'typingBiometric',
  'clipboardInterceptor',
] as const;

type AnalysisPanelId = typeof ANALYSIS_PANEL_IDS[number];

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

  // Progressive reveal: advance phase every ~7 seconds after boot
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

  // Click/key advances to next phase immediately (5s debounce)
  const lastAdvanceRef = useRef(0);
  useEffect(() => {
    if (!bootDone) return;

    const advance = () => {
      const now = Date.now();
      if (now - lastAdvanceRef.current < 5000) return; // 5s debounce
      lastAdvanceRef.current = now;
      setPhase((prev) => Math.min(prev + 1, 8));
    };

    window.addEventListener("click", advance);
    window.addEventListener("keydown", advance);
    return () => {
      window.removeEventListener("click", advance);
      window.removeEventListener("keydown", advance);
    };
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
      keystreamPanel: phase >= 6,
      screenTopology: phase >= 5,
      clipboardInterceptor: phase >= 7,
      peripheralScan: phase >= 6,
      presenceTimeline: phase >= 4,
      tabIntelligence: phase >= 2,
      audioFingerprint: phase >= 5,
      sessionMemory: phase >= 3,
      temporalProfiler: phase >= 4,
      networkTiming: phase >= 6,
      webrtcProbe: phase >= 5,
      typingBiometric: phase >= 4,
    }),
    [phase],
  );

  // ── Cycle through user analysis panels — one visible at a time ──
  const [analysisIndex, setAnalysisIndex] = useState(0);

  useEffect(() => {
    if (!bootDone) return;
    const interval = setInterval(() => {
      setAnalysisIndex((prev) => prev + 1);
    }, ANALYSIS_CYCLE_MS);
    return () => clearInterval(interval);
  }, [bootDone]);

  // Only cycle through panels whose phase has been reached
  const activeAnalysisPanel = useMemo((): AnalysisPanelId | null => {
    const phaseGate: Record<AnalysisPanelId, boolean> = {
      sessionMemory: phases.sessionMemory,
      deviceFingerprint: phases.deviceFingerprint,
      screenTopology: phases.screenTopology,
      audioFingerprint: phases.audioFingerprint,
      networkTiming: phases.networkTiming,
      webrtcProbe: phases.webrtcProbe,
      temporalProfiler: phases.temporalProfiler && visitor.loaded,
      peripheralScan: phases.peripheralScan,
      behaviorAnalysis: phases.behaviorAnalysis,
      presenceTimeline: phases.presenceTimeline,
      keystreamPanel: phases.keystreamPanel,
      typingBiometric: phases.typingBiometric,
      clipboardInterceptor: phases.clipboardInterceptor,
    };
    const available = ANALYSIS_PANEL_IDS.filter((id) => phaseGate[id]);
    if (available.length === 0) return null;
    return available[analysisIndex % available.length];
  }, [phases, visitor.loaded, analysisIndex]);

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
        <div style={{ pointerEvents: "auto" }}>
          <SelfPlayGames />
        </div>
      </Reveal>

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

      {/* ─── User location map (always visible, not part of cycling) ─── */}
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

      {/* ─── USER ANALYSIS PANELS — one at a time, cycling every 30s ─── */}
      {activeAnalysisPanel === 'sessionMemory' && (
        <Reveal show={true} duration={1000} key="analysis-sessionMemory">
          <Draggable
            style={{
              position: "absolute",
              top: "18%",
              right: "18%",
              width: "260px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <SessionMemory />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'deviceFingerprint' && (
        <Reveal show={true} duration={1000} key="analysis-deviceFingerprint">
          <Draggable
            style={{
              position: "absolute",
              bottom: "4%",
              right: "2%",
              width: "340px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <DeviceFingerprint />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'screenTopology' && (
        <Reveal show={true} duration={1000} key="analysis-screenTopology">
          <Draggable
            style={{
              position: "absolute",
              top: "3%",
              left: "38%",
              width: "260px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <ScreenTopology />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'audioFingerprint' && (
        <Reveal show={true} duration={1000} key="analysis-audioFingerprint">
          <Draggable
            style={{
              position: "absolute",
              top: "28%",
              left: "26%",
              width: "270px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <AudioFingerprint />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'networkTiming' && (
        <Reveal show={true} duration={1000} key="analysis-networkTiming">
          <Draggable
            style={{
              position: "absolute",
              top: "18%",
              left: "2%",
              width: "280px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <NetworkTiming />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'webrtcProbe' && (
        <Reveal show={true} duration={1000} key="analysis-webrtcProbe">
          <Draggable
            style={{
              position: "absolute",
              top: "58%",
              right: "18%",
              width: "280px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <WebRTCProbe />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'temporalProfiler' && (
        <Reveal show={true} duration={1000} key="analysis-temporalProfiler">
          <Draggable
            style={{
              position: "absolute",
              bottom: "6%",
              left: "28%",
              width: "240px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <TemporalProfiler lat={visitor.lat} lon={visitor.lon} timezone={visitor.timezone} />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'peripheralScan' && (
        <Reveal show={true} duration={1000} key="analysis-peripheralScan">
          <Draggable
            style={{
              position: "absolute",
              top: "42%",
              left: "2%",
              width: "250px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <PeripheralScan />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'behaviorAnalysis' && (
        <Reveal show={true} duration={1000} key="analysis-behaviorAnalysis">
          <Draggable
            style={{
              position: "absolute",
              bottom: "4%",
              left: "2%",
              width: "290px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <BehaviorAnalysis />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'presenceTimeline' && (
        <Reveal show={true} duration={1000} key="analysis-presenceTimeline">
          <Draggable
            style={{
              position: "absolute",
              bottom: "20%",
              left: "28%",
              width: "270px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <PresenceTimeline />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'keystreamPanel' && (
        <Reveal show={true} duration={1000} key="analysis-keystreamPanel">
          <Draggable
            style={{
              position: "absolute",
              top: "36%",
              right: "2%",
              width: "260px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <KeystreamPanel />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'typingBiometric' && (
        <Reveal show={true} duration={1000} key="analysis-typingBiometric">
          <Draggable
            style={{
              position: "absolute",
              top: "38%",
              left: "15%",
              width: "260px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <TypingBiometric />
          </Draggable>
        </Reveal>
      )}

      {activeAnalysisPanel === 'clipboardInterceptor' && (
        <Reveal show={true} duration={1000} key="analysis-clipboardInterceptor">
          <Draggable
            style={{
              position: "absolute",
              top: "48%",
              left: "26%",
              width: "280px",
              opacity: 0.95,
              zIndex: 40,
              pointerEvents: "auto",
            }}
          >
            <ClipboardInterceptor />
          </Draggable>
        </Reveal>
      )}

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

      {/* ─── Tab Intelligence — title/favicon manipulation when tab is hidden ─── */}
      {phases.tabIntelligence && visitor.loaded && <TabIntelligence visitor={visitor} />}

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
