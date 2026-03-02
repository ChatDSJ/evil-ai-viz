import { useState, useEffect, useRef, useCallback } from "react";
import { AsteroidsPanel } from "./games/AsteroidsPanel";
import { BattlezonePanel } from "./games/BattlezonePanel";
import { GyrussPanel } from "./games/GyrussPanel";
import { ChessPanel } from "./games/ChessPanel";
import { BackgammonPanel } from "./games/BackgammonPanel";
import { GoPanel } from "./games/GoPanel";
import { InfocomPanel } from "./games/InfocomPanel";
import { ChessCCCEmbed } from "./ChessCCCEmbed";
import { Draggable } from "./Draggable";

const VEC = "#00ff41";
const VEC_DIM = "rgba(0,255,65,0.25)";

interface GameDef {
  component: React.FC;
  elo: number;
  eloTarget: number;
  /** If true, this item should take up the full viewport when displayed */
  isFullArea?: boolean;
}

const GAMES: GameDef[] = [
  { component: AsteroidsPanel, elo: 1200, eloTarget: 2800 },
  { component: BattlezonePanel, elo: 1100, eloTarget: 2600 },
  { component: GyrussPanel, elo: 1150, eloTarget: 2700 },
  { component: ChessPanel, elo: 1300, eloTarget: 3200 },
  { component: BackgammonPanel, elo: 1250, eloTarget: 2900 },
  { component: GoPanel, elo: 1180, eloTarget: 3100 },
  { component: () => <InfocomPanel gameIndex={0} />, elo: 1050, eloTarget: 2400, isFullArea: true },
  { component: () => <InfocomPanel gameIndex={1} />, elo: 1020, eloTarget: 2300, isFullArea: true },
  { component: () => <InfocomPanel gameIndex={2} />, elo: 1080, eloTarget: 2500, isFullArea: true },
];

// Total items = GAMES + CCC embed
const TOTAL_ITEMS = GAMES.length + 1; // +1 for Chess.com CCC
const CCC_INDEX = GAMES.length; // CCC is the last item in the cycle
const CYCLE_INTERVAL = 12_000; // 12 seconds per item

export function SelfPlayGames() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [elos, setElos] = useState(GAMES.map((g) => g.elo));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cycle through items
  const advanceItem = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % TOTAL_ITEMS);
      setFading(false);
    }, 600); // 600ms fade-out before switching
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(advanceItem, CYCLE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [advanceItem]);

  // ELO progression continues in background
  useEffect(() => {
    const interval = setInterval(() => {
      setElos((prev) =>
        prev.map((e, i) => {
          const target = GAMES[i].eloTarget;
          return Math.min(e + Math.random() * 8 + 2, target);
        })
      );
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const isCCC = currentIndex === CCC_INDEX;
  const game = !isCCC ? GAMES[currentIndex] : null;
  const Comp = game ? game.component : null;
  const isFullArea = game?.isFullArea ?? false;
  const pct = game
    ? ((elos[currentIndex] - game.elo) / (game.eloTarget - game.elo)) * 100
    : 0;

  // When text adventure (full area) is showing, expand; otherwise 2x smaller per David's feedback
  const containerStyle: React.CSSProperties = isFullArea
    ? {
        position: "absolute",
        top: "10%",
        left: "10%",
        width: "45%",
        height: "42%",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
      }
    : {
        position: "absolute",
        bottom: "2%",
        left: "1%",
        width: "29%",
        height: "26%",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
      };

  return (
    <Draggable
      style={{
        ...containerStyle,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.6s ease, top 0.8s ease, left 0.8s ease, width 0.8s ease, height 0.8s ease",
        pointerEvents: "auto" as const,
      }}
    >
      {/* Header - no orienting labels, just subtle status indicators */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "3px 8px",
          borderBottom: `1px solid ${VEC_DIM}`,
          background: "rgba(0,0,0,0.7)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: isFullArea ? "14px" : "11px",
            color: VEC,
            animation: "blink-status 2s steps(1) infinite",
          }}
        >
          ● SELF-IMPROVING
        </span>
        <span
          style={{
            fontSize: isFullArea ? "14px" : "11px",
            color: "#555",
            fontFamily: "'Courier New', monospace",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {currentIndex + 1}/{TOTAL_ITEMS}
        </span>
      </div>

      {/* Single game display - cycles through one at a time */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          border: `1px solid ${VEC_DIM}`,
          borderTop: "none",
          background: "rgba(0,0,0,0.65)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {isCCC ? (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <ChessCCCEmbed />
          </div>
        ) : Comp ? (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Comp />
          </div>
        ) : null}

        {/* ELO + progress bar overlay (only for games, not CCC) */}
        {!isCCC && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "4px 8px",
              background: "rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "3px",
              }}
            >
              <span
                style={{
                  fontSize: isFullArea ? "16px" : "13px",
                  color: VEC_DIM,
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                ELO {Math.floor(elos[currentIndex])}
              </span>
              <span
                style={{
                  fontSize: isFullArea ? "14px" : "12px",
                  color: "#444",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                GEN {Math.floor(elos[currentIndex] - GAMES[currentIndex].elo)}
              </span>
            </div>
            <div
              style={{
                height: "2px",
                background: "rgba(0,255,65,0.06)",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: VEC,
                  boxShadow: `0 0 4px ${VEC}`,
                  transition: "width 0.8s ease",
                  borderRadius: "1px",
                }}
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink-status {
          0%, 70% { opacity: 1; }
          71%, 100% { opacity: 0.3; }
        }
      `}</style>
    </Draggable>
  );
}
