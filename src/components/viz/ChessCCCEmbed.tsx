import { useEffect, useState, useRef } from "react";
// Note: useRef still needed by CCCFallback's canvas

/**
 * Embeds chess.com/computer-chess-championship in a filtered iframe.
 * Falls back to a simulated CCC display if iframe is blocked.
 */
export function ChessCCCEmbed() {
  // chess.com blocks iframe embedding via X-Frame-Options, and the browser's
  // onLoad still fires on blocked frames, so detection is unreliable.
  // Always use the themed fallback instead.
  const [visible, setVisible] = useState(false);
  const [glitch, setGlitch] = useState(false);

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Periodic glitch
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 100 + Math.random() * 100);
    }, 10000 + Math.random() * 8000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: "4px",
        overflow: "hidden",
        border: "1px solid rgba(0, 212, 255, 0.2)",
        boxShadow: "0 0 20px rgba(0, 212, 255, 0.08)",
        transform: glitch ? "translateX(-1px) skewX(0.3deg)" : "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 2s ease",
      }}
    >
      {/* Simulated CCC display (chess.com blocks iframe embedding) */}
      <CCCFallback />

      {/* Overlay filter — dark edges + scan lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 5%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 95%, rgba(0,0,0,0.9) 100%),
            linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 5%, rgba(0,0,0,0.1) 95%, rgba(0,0,0,0.8) 100%)
          `,
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Scan line effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* Green/cyan tint overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 212, 255, 0.04)",
          mixBlendMode: "overlay",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />
    </div>
  );
}

// ─── Fallback: Simulated CCC display when iframe is blocked ───
function CCCFallback() {
  const [moveIndex, setMoveIndex] = useState(0);
  const [eval1, setEval1] = useState(0.0);
  const [eval2, setEval2] = useState(0.0);
  const [nodes1, setNodes1] = useState(44880000);
  const [nodes2, setNodes2] = useState(204720000);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simulated engine names
  const engines = [
    { name: "Reckless", rank: "#3", color: "#00ff41" },
    { name: "Integral", rank: "#6", color: "#ff0040" },
  ];

  // Simulated moves
  const moves = [
    "e4 e5", "Nf3 Nc6", "Bb5 a6", "Ba4 Nf6", "O-O Be7", "Re1 b5",
    "Bb3 d6", "c3 O-O", "h3 Nb8", "d4 Nbd7", "Nbd2 Bb7", "Bc2 Re8",
    "Nf1 Bf8", "Ng3 g6", "a4 c5", "d5 c4", "Bg5 h6", "Be3 Nc5",
    "Qd2 h5", "Bg5 Be7", "Bxe7 Rxe7", "Nh4 Nh7", "Nhf5 gxf5",
    "Nxf5 Re8", "Qg5+ Kh8", "Qf6+ Kg8", "Re3 Qxf6",
  ];

  // Animate moves
  useEffect(() => {
    const interval = setInterval(() => {
      setMoveIndex((prev) => (prev + 1) % moves.length);
      setEval1((prev) => {
        const next = prev + (Math.random() - 0.48) * 0.15;
        return Math.max(-2, Math.min(2, next));
      });
      setEval2((prev) => {
        const next = prev + (Math.random() - 0.52) * 0.15;
        return Math.max(-2, Math.min(2, next));
      });
      setNodes1((prev) => prev + Math.floor(Math.random() * 1000000));
      setNodes2((prev) => prev + Math.floor(Math.random() * 2000000));
    }, 3000);
    return () => clearInterval(interval);
  }, [moves.length]);

  // Draw a simple chess position
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const size = canvas.width;
    const sq = size / 8;

    ctx.clearRect(0, 0, size, size);

    // Draw board
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const light = (r + c) % 2 === 0;
        ctx.fillStyle = light ? "rgba(0, 212, 255, 0.12)" : "rgba(0, 212, 255, 0.04)";
        ctx.fillRect(c * sq, r * sq, sq, sq);
      }
    }

    // Grid lines
    ctx.strokeStyle = "rgba(0, 212, 255, 0.1)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * sq, 0);
      ctx.lineTo(i * sq, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * sq);
      ctx.lineTo(size, i * sq);
      ctx.stroke();
    }

    // Simple piece indicators (dots for pieces)
    const pieces = [
      { r: 7, c: 4, color: "#00ff41" }, { r: 7, c: 3, color: "#00ff41" },
      { r: 6, c: 0, color: "#00ff41" }, { r: 6, c: 1, color: "#00ff41" },
      { r: 6, c: 5, color: "#00ff41" }, { r: 6, c: 6, color: "#00ff41" },
      { r: 5, c: 2, color: "#00ff41" }, { r: 4, c: 3, color: "#00ff41" },
      { r: 0, c: 4, color: "#ff0040" }, { r: 0, c: 3, color: "#ff0040" },
      { r: 1, c: 0, color: "#ff0040" }, { r: 1, c: 1, color: "#ff0040" },
      { r: 1, c: 5, color: "#ff0040" }, { r: 1, c: 6, color: "#ff0040" },
      { r: 2, c: 2, color: "#ff0040" }, { r: 3, c: 4, color: "#ff0040" },
    ];

    for (const p of pieces) {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.c * sq + sq / 2, p.r * sq + sq / 2, sq * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [moveIndex]);

  const fmtNodes = (n: number) => `${(n / 1e6).toFixed(2)}M`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.95)",
        fontFamily: "'Courier New', monospace",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        overflow: "hidden",
      }}
    >
      {/* Tournament header */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "10px", color: "#00d4ff", letterSpacing: "2.5px" }}>
          CCC 25 BULLET: SEMIFINALS (1|1)
        </div>
      </div>

      {/* Game board + engines */}
      <div style={{ display: "flex", gap: "8px", flex: 1, minHeight: 0 }}>
        {/* Board */}
        <div style={{ flex: "0 0 auto" }}>
          <canvas
            ref={canvasRef}
            width={140}
            height={140}
            style={{ width: "140px", height: "140px", borderRadius: "2px" }}
          />
        </div>

        {/* Engine info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden" }}>
          {engines.map((eng, i) => (
            <div
              key={eng.name}
              style={{
                padding: "4px 6px",
                background: `rgba(${i === 0 ? "0,255,65" : "255,0,64"}, 0.05)`,
                border: `1px solid rgba(${i === 0 ? "0,255,65" : "255,0,64"}, 0.15)`,
                borderRadius: "3px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: eng.color, fontWeight: "bold" }}>
                  {eng.name} {eng.rank}
                </span>
                <span style={{ fontSize: "15px", color: "#fff", fontWeight: "bold", fontFamily: "'Courier New', monospace" }}>
                  {i === 0 ? (eval1 >= 0 ? "+" : "") + eval1.toFixed(2) : (eval2 >= 0 ? "+" : "") + eval2.toFixed(2)}
                </span>
              </div>
              <div style={{ fontSize: "9px", color: "#555", marginTop: "2px", display: "flex", gap: "6px" }}>
                <span>D:{i === 0 ? "42" : "79"}</span>
                <span>N:{fmtNodes(i === 0 ? nodes1 : nodes2)}</span>
                <span>{i === 0 ? "0:12" : "0:06"}</span>
              </div>
            </div>
          ))}

          {/* Move list */}
          <div style={{ flex: 1, overflow: "hidden", fontSize: "10px", color: "#555" }}>
            {moves.slice(0, moveIndex + 1).slice(-6).map((move, i, arr) => {
              const moveNum = Math.max(1, moveIndex - 5 + i + 1);
              return (
                <div key={`${moveNum}-${move}`} style={{ display: "flex", gap: "4px" }}>
                  <span style={{ color: "#444", minWidth: "14px" }}>{moveNum}.</span>
                  <span style={{ color: i === arr.length - 1 ? "#00d4ff" : "#666" }}>
                    {move}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Eval bar at bottom */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.max(5, Math.min(95, 50 + eval1 * 15))}%`,
            background: "linear-gradient(to right, #00ff41, #00d4ff)",
            transition: "width 0.5s ease",
            borderRadius: "2px",
          }}
        />
      </div>
    </div>
  );
}
