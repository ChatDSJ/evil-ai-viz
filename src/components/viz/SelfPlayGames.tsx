import { useState, useEffect } from "react";
import { AsteroidsPanel } from "./games/AsteroidsPanel";
import { BattlezonePanel } from "./games/BattlezonePanel";
import { GyrussPanel } from "./games/GyrussPanel";
import { ChessPanel } from "./games/ChessPanel";
import { BackgammonPanel } from "./games/BackgammonPanel";
import { GoPanel } from "./games/GoPanel";
import { InfocomPanel } from "./games/InfocomPanel";

const VEC = "#00ff41";
const VEC_DIM = "rgba(0,255,65,0.25)";
const VEC_FAINT = "rgba(0,255,65,0.12)";

interface GameDef {
  name: string;
  component: React.FC;
  elo: number;
  eloTarget: number;
}

const GAMES: GameDef[] = [
  { name: "ASTEROIDS", component: AsteroidsPanel, elo: 1200, eloTarget: 2800 },
  { name: "BATTLEZONE", component: BattlezonePanel, elo: 1100, eloTarget: 2600 },
  { name: "GYRUSS", component: GyrussPanel, elo: 1150, eloTarget: 2700 },
  { name: "CHESS", component: ChessPanel, elo: 1300, eloTarget: 3200 },
  { name: "BACKGAMMON", component: BackgammonPanel, elo: 1250, eloTarget: 2900 },
  { name: "GO", component: GoPanel, elo: 1180, eloTarget: 3100 },
  { name: "ZORK I", component: () => <InfocomPanel gameIndex={0} />, elo: 1050, eloTarget: 2400 },
  { name: "ENCHANTER", component: () => <InfocomPanel gameIndex={1} />, elo: 1020, eloTarget: 2300 },
  { name: "ADVENTURE", component: () => <InfocomPanel gameIndex={2} />, elo: 1080, eloTarget: 2500 },
];

export function SelfPlayGames() {
  const [elos, setElos] = useState(GAMES.map((g) => g.elo));

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

  return (
    <div
      style={{
        position: "absolute",
        bottom: "2%",
        left: "1%",
        width: "58%",
        height: "52%",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Neural Architecture header */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "9px",
              letterSpacing: "2px",
              color: "#00d4ff",
              textShadow: "0 0 8px rgba(0,212,255,0.4)",
              fontFamily: "'Courier New', monospace",
              fontWeight: "bold",
            }}
          >
            NEURAL ARCHITECTURE v7.3
          </span>
          <span
            style={{
              fontSize: "7px",
              color: VEC,
              animation: "blink-status 2s steps(1) infinite",
            }}
          >
            ● SELF-IMPROVING
          </span>
        </div>
        <span
          style={{
            fontSize: "7px",
            color: "#555",
            fontFamily: "'Courier New', monospace",
          }}
        >
          {GAMES.length} PARALLEL TRAINING INSTANCES
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          gap: "2px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {GAMES.map((game, i) => {
          const Comp = game.component;
          const pct =
            ((elos[i] - game.elo) / (game.eloTarget - game.elo)) * 100;
          return (
            <div
              key={game.name}
              style={{
                display: "flex",
                flexDirection: "column" as const,
                border: `1px solid ${VEC_DIM}`,
                background: "rgba(0,0,0,0.65)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "2px 6px",
                  borderBottom: `1px solid ${VEC_FAINT}`,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "8px",
                    letterSpacing: "1.5px",
                    color: VEC,
                    textShadow: `0 0 6px ${VEC_DIM}`,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {game.name}
                </span>
                <span
                  style={{
                    fontSize: "7px",
                    color: VEC_DIM,
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  ELO {Math.floor(elos[i])}
                </span>
              </div>
              <div style={{ flex: 1, position: "relative" as const, minHeight: 0 }}>
                <Comp />
              </div>
              <div
                style={{
                  padding: "2px 6px",
                  borderTop: `1px solid ${VEC_FAINT}`,
                  flexShrink: 0,
                }}
              >
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
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes blink-status {
          0%, 70% { opacity: 1; }
          71%, 100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
