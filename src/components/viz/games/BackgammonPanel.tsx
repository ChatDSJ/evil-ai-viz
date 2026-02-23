import { useRef } from "react";
import { useCanvas } from "./useCanvas";

const VEC_COLOR = "#00ff41";
const VEC_DIM = "rgba(0,255,65,0.2)";

export function BackgammonPanel() {
  const stateRef = useRef({
    // 24 points, each has count and side (0 or 1)
    board: [] as { count: number; side: number }[],
    dice: [0, 0] as [number, number],
    moveTimer: 0,
    gameCount: 0,
    initialized: false,
    diceRolling: false,
    diceRollEnd: 0,
  });

  const canvasRef = useCanvas((ctx, w, h, t) => {
    const s = stateRef.current;

    if (!s.initialized) {
      s.board = Array.from({ length: 24 }, () => ({ count: 0, side: 0 }));
      // Standard starting position
      s.board[0] = { count: 2, side: 0 };
      s.board[11] = { count: 5, side: 0 };
      s.board[16] = { count: 3, side: 0 };
      s.board[18] = { count: 5, side: 0 };
      s.board[23] = { count: 2, side: 1 };
      s.board[12] = { count: 5, side: 1 };
      s.board[7] = { count: 3, side: 1 };
      s.board[5] = { count: 5, side: 1 };
      s.dice = [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
      s.initialized = true;
    }

    // AI makes moves
    if (t - s.moveTimer > 1.5) {
      s.moveTimer = t;
      s.dice = [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
      s.diceRolling = true;
      s.diceRollEnd = t + 0.4;

      // Simulate a move
      const side = Math.floor(t / 1.5) % 2;
      const occupied = s.board
        .map((p, i) => ({ ...p, i }))
        .filter((p) => p.count > 0 && p.side === side);
      if (occupied.length > 0) {
        const from = occupied[Math.floor(Math.random() * occupied.length)];
        const dir = side === 0 ? 1 : -1;
        const toIdx = from.i + dir * s.dice[0];
        if (toIdx >= 0 && toIdx < 24) {
          s.board[from.i].count--;
          if (s.board[from.i].count === 0) s.board[from.i].side = 0;
          if (s.board[toIdx].count === 0 || s.board[toIdx].side === side) {
            s.board[toIdx].count++;
            s.board[toIdx].side = side;
          }
        }
      }

      // Reset game occasionally
      if (Math.random() < 0.05) {
        s.board = Array.from({ length: 24 }, () => ({ count: 0, side: 0 }));
        s.board[0] = { count: 2, side: 0 };
        s.board[11] = { count: 5, side: 0 };
        s.board[16] = { count: 3, side: 0 };
        s.board[18] = { count: 5, side: 0 };
        s.board[23] = { count: 2, side: 1 };
        s.board[12] = { count: 5, side: 1 };
        s.board[7] = { count: 3, side: 1 };
        s.board[5] = { count: 5, side: 1 };
        s.gameCount++;
      }
    }

    if (s.diceRolling && t > s.diceRollEnd) {
      s.diceRolling = false;
    }

    // --- DRAW ---
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = VEC_COLOR;
    ctx.shadowBlur = 2;

    const margin = 10;
    const boardW = w - margin * 2;
    const boardH = h - margin * 2;
    const barW = boardW * 0.04;
    const pointW = (boardW - barW) / 12;
    const pointH = boardH * 0.38;

    // Board outline
    ctx.strokeStyle = VEC_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, margin, boardW, boardH);

    // Center bar
    const barX = margin + boardW / 2 - barW / 2;
    ctx.strokeRect(barX, margin, barW, boardH);

    // Draw triangles/points
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 24; i++) {
      const isTop = i >= 12;
      const col = isTop ? 23 - i : i;
      let px: number;
      if (col < 6) {
        px = margin + col * pointW;
      } else {
        px = margin + col * pointW + barW;
      }
      const py = isTop ? margin : margin + boardH;
      const dir = isTop ? 1 : -1;

      // Triangle
      ctx.strokeStyle = i % 2 === 0 ? VEC_DIM : "rgba(0,255,65,0.1)";
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + pointW / 2, py + dir * pointH);
      ctx.lineTo(px + pointW, py);
      ctx.closePath();
      ctx.stroke();

      // Checkers
      const point = s.board[i];
      if (point.count > 0) {
        const checkerR = Math.min(pointW * 0.35, 8);
        const maxShow = Math.min(point.count, 5);
        for (let c = 0; c < maxShow; c++) {
          const cy = py + dir * (checkerR + c * checkerR * 1.8 + 4);
          const ccx = px + pointW / 2;
          ctx.strokeStyle = point.side === 0 ? VEC_COLOR : "rgba(0,255,65,0.5)";
          ctx.lineWidth = point.side === 0 ? 1.2 : 0.8;
          ctx.beginPath();
          ctx.arc(ccx, cy, checkerR, 0, Math.PI * 2);
          ctx.stroke();
          if (point.side === 1) {
            ctx.fillStyle = "rgba(0,255,65,0.06)";
            ctx.fill();
          }
        }
        if (point.count > 5) {
          ctx.fillStyle = VEC_DIM;
          ctx.font = "8px monospace";
          ctx.fillText(
            `${point.count}`,
            px + pointW / 2 - 3,
            py + dir * (checkerR + 4 * checkerR * 1.8 + 4 + checkerR + 10)
          );
        }
      }
    }

    // Dice
    const diceY = h / 2;
    const diceSz = Math.min(16, boardW * 0.04);
    for (let d = 0; d < 2; d++) {
      const dx = w / 2 + (d - 0.5) * diceSz * 3;
      const val = s.diceRolling
        ? Math.ceil(Math.random() * 6)
        : s.dice[d];
      ctx.strokeStyle = VEC_COLOR;
      ctx.lineWidth = 1;
      ctx.strokeRect(dx - diceSz / 2, diceY - diceSz / 2, diceSz, diceSz);
      ctx.fillStyle = VEC_COLOR;
      ctx.font = `${diceSz * 0.7}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${val}`, dx, diceY);
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    // Game counter
    ctx.shadowBlur = 0;
    ctx.fillStyle = VEC_DIM;
    ctx.font = "9px monospace";
    ctx.fillText(`GAME #${s.gameCount + 1}`, 6, 12);
  }, 20);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />;
}
