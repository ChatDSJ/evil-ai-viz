import { useRef } from "react";
import { useCanvas } from "./useCanvas";

const VEC_COLOR = "#00ff41";
const VEC_DIM = "rgba(0,255,65,0.15)";

type Piece = { type: string; col: number; row: number; side: number };

// Simple piece shapes for vector rendering
const PIECE_SHAPES: Record<string, (ctx: CanvasRenderingContext2D, sz: number) => void> = {
  K: (ctx, sz) => {
    // King - tall with cross
    ctx.moveTo(-sz * 0.3, 0);
    ctx.lineTo(-sz * 0.4, -sz * 0.3);
    ctx.lineTo(-sz * 0.2, -sz * 0.5);
    ctx.lineTo(-sz * 0.2, -sz * 0.7);
    ctx.lineTo(-sz * 0.35, -sz * 0.7);
    ctx.lineTo(-sz * 0.35, -sz * 0.8);
    ctx.lineTo(-sz * 0.15, -sz * 0.8);
    ctx.lineTo(-sz * 0.15, -sz * 0.95);
    ctx.lineTo(sz * 0.15, -sz * 0.95);
    ctx.lineTo(sz * 0.15, -sz * 0.8);
    ctx.lineTo(sz * 0.35, -sz * 0.8);
    ctx.lineTo(sz * 0.35, -sz * 0.7);
    ctx.lineTo(sz * 0.2, -sz * 0.7);
    ctx.lineTo(sz * 0.2, -sz * 0.5);
    ctx.lineTo(sz * 0.4, -sz * 0.3);
    ctx.lineTo(sz * 0.3, 0);
    ctx.closePath();
  },
  Q: (ctx, sz) => {
    // Queen - crown shape
    ctx.moveTo(-sz * 0.3, 0);
    ctx.lineTo(-sz * 0.35, -sz * 0.4);
    ctx.lineTo(-sz * 0.4, -sz * 0.85);
    ctx.lineTo(-sz * 0.2, -sz * 0.6);
    ctx.lineTo(0, -sz * 0.95);
    ctx.lineTo(sz * 0.2, -sz * 0.6);
    ctx.lineTo(sz * 0.4, -sz * 0.85);
    ctx.lineTo(sz * 0.35, -sz * 0.4);
    ctx.lineTo(sz * 0.3, 0);
    ctx.closePath();
  },
  R: (ctx, sz) => {
    // Rook - castle shape
    ctx.moveTo(-sz * 0.3, 0);
    ctx.lineTo(-sz * 0.3, -sz * 0.6);
    ctx.lineTo(-sz * 0.35, -sz * 0.6);
    ctx.lineTo(-sz * 0.35, -sz * 0.8);
    ctx.lineTo(-sz * 0.2, -sz * 0.8);
    ctx.lineTo(-sz * 0.2, -sz * 0.65);
    ctx.lineTo(-sz * 0.05, -sz * 0.65);
    ctx.lineTo(-sz * 0.05, -sz * 0.8);
    ctx.lineTo(sz * 0.05, -sz * 0.8);
    ctx.lineTo(sz * 0.05, -sz * 0.65);
    ctx.lineTo(sz * 0.2, -sz * 0.65);
    ctx.lineTo(sz * 0.2, -sz * 0.8);
    ctx.lineTo(sz * 0.35, -sz * 0.8);
    ctx.lineTo(sz * 0.35, -sz * 0.6);
    ctx.lineTo(sz * 0.3, -sz * 0.6);
    ctx.lineTo(sz * 0.3, 0);
    ctx.closePath();
  },
  B: (ctx, sz) => {
    // Bishop - pointed hat
    ctx.moveTo(-sz * 0.25, 0);
    ctx.lineTo(-sz * 0.3, -sz * 0.3);
    ctx.lineTo(-sz * 0.15, -sz * 0.6);
    ctx.lineTo(0, -sz * 0.9);
    ctx.lineTo(sz * 0.15, -sz * 0.6);
    ctx.lineTo(sz * 0.3, -sz * 0.3);
    ctx.lineTo(sz * 0.25, 0);
    ctx.closePath();
  },
  N: (ctx, sz) => {
    // Knight - L shape
    ctx.moveTo(-sz * 0.25, 0);
    ctx.lineTo(-sz * 0.2, -sz * 0.5);
    ctx.lineTo(-sz * 0.35, -sz * 0.65);
    ctx.lineTo(-sz * 0.15, -sz * 0.85);
    ctx.lineTo(sz * 0.15, -sz * 0.7);
    ctx.lineTo(sz * 0.25, -sz * 0.5);
    ctx.lineTo(sz * 0.15, -sz * 0.35);
    ctx.lineTo(sz * 0.25, 0);
    ctx.closePath();
  },
  P: (ctx, sz) => {
    // Pawn - simple
    ctx.moveTo(-sz * 0.2, 0);
    ctx.lineTo(-sz * 0.15, -sz * 0.35);
    ctx.lineTo(-sz * 0.2, -sz * 0.45);
    ctx.arc(0, -sz * 0.55, sz * 0.2, Math.PI * 0.8, Math.PI * 0.2, false);
    ctx.lineTo(sz * 0.15, -sz * 0.35);
    ctx.lineTo(sz * 0.2, 0);
    ctx.closePath();
  },
};

function generatePosition(): Piece[] {
  const pieces: Piece[] = [];
  // Always have kings
  pieces.push({ type: "K", col: 4, row: 0, side: 0 });
  pieces.push({ type: "K", col: 4, row: 7, side: 1 });
  // Random other pieces
  const types = ["Q", "R", "R", "B", "B", "N", "N", "P", "P", "P", "P", "P"];
  for (const tp of types) {
    if (Math.random() > 0.5) {
      const col = Math.floor(Math.random() * 8);
      const row = Math.floor(Math.random() * 4);
      pieces.push({ type: tp, col, row, side: 0 });
    }
    if (Math.random() > 0.5) {
      const col = Math.floor(Math.random() * 8);
      const row = 4 + Math.floor(Math.random() * 4);
      pieces.push({ type: tp, col, row, side: 1 });
    }
  }
  return pieces;
}

export function ChessPanel() {
  const stateRef = useRef({
    pieces: generatePosition(),
    moveTimer: 0,
    highlight: null as { col: number; row: number } | null,
    highlightTo: null as { col: number; row: number } | null,
    gameCount: 0,
  });

  const canvasRef = useCanvas((ctx, w, h, t) => {
    const s = stateRef.current;

    // Make a move every ~1.2s
    if (t - s.moveTimer > 1.2) {
      s.moveTimer = t;
      const movable = s.pieces.filter((p) => p.type !== "K" || Math.random() > 0.8);
      if (movable.length > 0 && Math.random() > 0.15) {
        const piece = movable[Math.floor(Math.random() * movable.length)];
        s.highlight = { col: piece.col, row: piece.row };
        const newCol = Math.max(0, Math.min(7, piece.col + Math.floor(Math.random() * 3) - 1));
        const newRow = Math.max(0, Math.min(7, piece.row + (piece.side === 0 ? 1 : -1) * (Math.random() > 0.5 ? 1 : Math.floor(Math.random() * 3) - 1)));
        s.highlightTo = { col: newCol, row: newRow };
        // Capture
        const atTarget = s.pieces.findIndex((p) => p.col === newCol && p.row === newRow && p !== piece);
        if (atTarget >= 0 && s.pieces[atTarget].side !== piece.side) {
          s.pieces.splice(atTarget, 1);
        }
        piece.col = newCol;
        piece.row = newRow;
      } else {
        // New game
        s.pieces = generatePosition();
        s.highlight = null;
        s.highlightTo = null;
        s.gameCount++;
      }
    }

    // --- DRAW ---
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const boardSize = Math.min(w, h) * 0.88;
    const sq = boardSize / 8;
    const ox = (w - boardSize) / 2;
    const oy = (h - boardSize) / 2;

    ctx.shadowColor = VEC_COLOR;
    ctx.shadowBlur = 2;

    // Board grid
    ctx.strokeStyle = VEC_DIM;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * sq, oy);
      ctx.lineTo(ox + i * sq, oy + boardSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, oy + i * sq);
      ctx.lineTo(ox + boardSize, oy + i * sq);
      ctx.stroke();
    }

    // Highlight squares
    if (s.highlight && t - s.moveTimer < 1.0) {
      ctx.fillStyle = "rgba(0,255,65,0.08)";
      ctx.fillRect(ox + s.highlight.col * sq, oy + s.highlight.row * sq, sq, sq);
      if (s.highlightTo) {
        ctx.fillStyle = "rgba(0,255,65,0.12)";
        ctx.fillRect(ox + s.highlightTo.col * sq, oy + s.highlightTo.row * sq, sq, sq);
        // Move arrow
        ctx.strokeStyle = "rgba(0,255,65,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox + s.highlight.col * sq + sq / 2, oy + s.highlight.row * sq + sq / 2);
        ctx.lineTo(ox + s.highlightTo.col * sq + sq / 2, oy + s.highlightTo.row * sq + sq / 2);
        ctx.stroke();
      }
    }

    // Pieces
    for (const piece of s.pieces) {
      const px = ox + piece.col * sq + sq / 2;
      const py = oy + piece.row * sq + sq * 0.85;
      const pSz = sq * 0.45;

      ctx.strokeStyle = piece.side === 0 ? VEC_COLOR : "rgba(0,255,65,0.6)";
      ctx.lineWidth = piece.side === 0 ? 1.2 : 0.8;
      ctx.shadowBlur = 4;

      const drawFn = PIECE_SHAPES[piece.type];
      if (drawFn) {
        ctx.save();
        ctx.translate(px, py);
        ctx.beginPath();
        drawFn(ctx, pSz);
        ctx.stroke();
        if (piece.side === 1) {
          // Fill for dark pieces
          ctx.fillStyle = "rgba(0,255,65,0.05)";
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Game counter
    ctx.shadowBlur = 0;
    ctx.fillStyle = VEC_DIM;
    ctx.font = "9px monospace";
    ctx.fillText(`GAME #${s.gameCount + 1}`, 6, 12);
  }, 20);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />;
}
