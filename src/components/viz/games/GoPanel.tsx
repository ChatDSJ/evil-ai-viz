import { useRef } from "react";
import { useCanvas } from "./useCanvas";

const VEC_COLOR = "#00ff41";
const VEC_DIM = "rgba(0,255,65,0.15)";

export function GoPanel() {
  const BOARD_SIZE = 9; // 9x9 for visual clarity
  const stateRef = useRef({
    board: Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => 0), // 0=empty, 1=black, 2=white
    moveTimer: 0,
    currentPlayer: 1,
    moveCount: 0,
    gameCount: 0,
    lastMove: -1,
    territory: Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => 0), // territory visualization
  });

  const canvasRef = useCanvas((ctx, w, h, t) => {
    const s = stateRef.current;

    // AI places stones
    if (t - s.moveTimer > 0.7) {
      s.moveTimer = t;
      s.moveCount++;

      // Find empty spots and place with some spatial logic
      const empty: number[] = [];
      for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        if (s.board[i] === 0) empty.push(i);
      }

      if (empty.length > 5 && s.moveCount < 60) {
        // Prefer spots near existing stones
        let chosen = empty[Math.floor(Math.random() * empty.length)];
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = empty[Math.floor(Math.random() * empty.length)];
          const cx = candidate % BOARD_SIZE;
          const cy = Math.floor(candidate / BOARD_SIZE);
          let nearFriendly = false;
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
              if (s.board[ny * BOARD_SIZE + nx] === s.currentPlayer) {
                nearFriendly = true;
                break;
              }
            }
          }
          if (nearFriendly || s.moveCount < 5) {
            chosen = candidate;
            break;
          }
        }

        s.board[chosen] = s.currentPlayer;
        s.lastMove = chosen;

        // Simple capture: remove enemy groups with no liberties
        const enemy = s.currentPlayer === 1 ? 2 : 1;
        for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
          if (s.board[i] === enemy) {
            // Check if this group has liberties
            const group = floodFill(s.board, i, enemy, BOARD_SIZE);
            let hasLiberty = false;
            for (const gi of group) {
              const gx = gi % BOARD_SIZE;
              const gy = Math.floor(gi / BOARD_SIZE);
              for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const nx = gx + dx;
                const ny = gy + dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                  if (s.board[ny * BOARD_SIZE + nx] === 0) {
                    hasLiberty = true;
                    break;
                  }
                }
              }
              if (hasLiberty) break;
            }
            if (!hasLiberty) {
              for (const gi of group) s.board[gi] = 0;
            }
          }
        }

        s.currentPlayer = s.currentPlayer === 1 ? 2 : 1;

        // Update territory visualization
        for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
          if (s.board[i] !== 0) {
            s.territory[i] = s.board[i];
          } else {
            // Simple influence: check nearby stones
            let b = 0, w2 = 0;
            const ix = i % BOARD_SIZE;
            const iy = Math.floor(i / BOARD_SIZE);
            for (let dx = -2; dx <= 2; dx++) {
              for (let dy = -2; dy <= 2; dy++) {
                const nx = ix + dx;
                const ny = iy + dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                  const stone = s.board[ny * BOARD_SIZE + nx];
                  if (stone === 1) b++;
                  if (stone === 2) w2++;
                }
              }
            }
            s.territory[i] = b > w2 ? 1 : w2 > b ? 2 : 0;
          }
        }
      } else {
        // New game
        s.board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => 0);
        s.territory = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => 0);
        s.moveCount = 0;
        s.currentPlayer = 1;
        s.lastMove = -1;
        s.gameCount++;
      }
    }

    // --- DRAW ---
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = VEC_COLOR;
    ctx.shadowBlur = 2;

    const boardPx = Math.min(w, h) * 0.88;
    const cellSize = boardPx / (BOARD_SIZE + 1);
    const ox = (w - boardPx) / 2 + cellSize;
    const oy = (h - boardPx) / 2 + cellSize;

    // Territory shading
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const terr = s.territory[y * BOARD_SIZE + x];
        if (terr !== 0 && s.board[y * BOARD_SIZE + x] === 0) {
          ctx.fillStyle = terr === 1 ? "rgba(0,255,65,0.04)" : "rgba(0,200,255,0.03)";
          ctx.fillRect(
            ox + x * cellSize - cellSize / 2,
            oy + y * cellSize - cellSize / 2,
            cellSize,
            cellSize
          );
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = VEC_DIM;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < BOARD_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * cellSize, oy);
      ctx.lineTo(ox + i * cellSize, oy + (BOARD_SIZE - 1) * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, oy + i * cellSize);
      ctx.lineTo(ox + (BOARD_SIZE - 1) * cellSize, oy + i * cellSize);
      ctx.stroke();
    }

    // Star points (for 9x9)
    const starPoints = [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];
    ctx.fillStyle = VEC_DIM;
    for (const [sx, sy] of starPoints) {
      ctx.beginPath();
      ctx.arc(ox + sx * cellSize, oy + sy * cellSize, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stones
    const stoneR = cellSize * 0.38;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const stone = s.board[y * BOARD_SIZE + x];
        if (stone === 0) continue;
        const px = ox + x * cellSize;
        const py = oy + y * cellSize;
        const isLast = y * BOARD_SIZE + x === s.lastMove;

        if (stone === 1) {
          // Black = filled circle
          ctx.strokeStyle = VEC_COLOR;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = isLast ? 8 : 3;
          ctx.beginPath();
          ctx.arc(px, py, stoneR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(0,255,65,0.1)";
          ctx.fill();
        } else {
          // White = hollow circle
          ctx.strokeStyle = "rgba(0,200,255,0.7)";
          ctx.lineWidth = 1.2;
          ctx.shadowColor = "rgba(0,200,255,0.5)";
          ctx.shadowBlur = isLast ? 8 : 3;
          ctx.beginPath();
          ctx.arc(px, py, stoneR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowColor = VEC_COLOR;
        }

        // Last move marker
        if (isLast) {
          ctx.strokeStyle = stone === 1 ? VEC_COLOR : "rgba(0,200,255,0.9)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.rect(px - 3, py - 3, 6, 6);
          ctx.stroke();
        }
      }
    }

    // Game info
    ctx.shadowBlur = 0;
    ctx.fillStyle = VEC_DIM;
    ctx.font = "9px monospace";
    ctx.fillText(`GAME #${s.gameCount + 1}  MOVE ${s.moveCount}`, 6, 12);
  }, 20);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />;
}

function floodFill(board: number[], start: number, color: number, size: number): number[] {
  const visited = new Set<number>();
  const queue = [start];
  visited.add(start);
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const cx = curr % size;
    const cy = Math.floor(curr / size);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        const ni = ny * size + nx;
        if (!visited.has(ni) && board[ni] === color) {
          visited.add(ni);
          queue.push(ni);
        }
      }
    }
  }
  return Array.from(visited);
}
