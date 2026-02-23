import { useRef } from "react";
import { useCanvas } from "./useCanvas";

const VEC_COLOR = "#00ff41";
const VEC_DIM = "rgba(0,255,65,0.2)";

interface Enemy {
  angle: number;
  depth: number;
  alive: boolean;
  respawnAt: number;
  speed: number;
}

export function GyrussPanel() {
  const stateRef = useRef({
    playerAngle: 0,
    enemies: [] as Enemy[],
    bullets: [] as { angle: number; depth: number; speed: number }[],
    stars: [] as { angle: number; depth: number; speed: number }[],
    lastShot: 0,
    initialized: false,
  });

  const canvasRef = useCanvas((ctx, w, h, t) => {
    const s = stateRef.current;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.44;

    if (!s.initialized) {
      for (let i = 0; i < 12; i++) {
        s.enemies.push({
          angle: (i / 12) * Math.PI * 2,
          depth: 0.2 + Math.random() * 0.5,
          alive: true,
          respawnAt: 0,
          speed: 0.005 + Math.random() * 0.01,
        });
      }
      for (let i = 0; i < 50; i++) {
        s.stars.push({
          angle: Math.random() * Math.PI * 2,
          depth: Math.random(),
          speed: 0.002 + Math.random() * 0.005,
        });
      }
      s.initialized = true;
    }

    // AI: orbit around and shoot
    s.playerAngle = t * 1.2;

    // Move enemies - spiral inward/outward
    for (const e of s.enemies) {
      if (!e.alive) {
        if (t > e.respawnAt) {
          e.alive = true;
          e.depth = 0.1 + Math.random() * 0.3;
          e.angle = Math.random() * Math.PI * 2;
        }
        continue;
      }
      e.angle += e.speed;
      e.depth += Math.sin(t * 2 + e.angle) * 0.002;
      e.depth = Math.max(0.1, Math.min(0.7, e.depth));
    }

    // Move stars (warp tunnel effect)
    for (const star of s.stars) {
      star.depth += star.speed;
      if (star.depth > 1) {
        star.depth = 0;
        star.angle = Math.random() * Math.PI * 2;
      }
    }

    // Shoot at nearest enemy
    if (t - s.lastShot > 0.2) {
      s.bullets.push({
        angle: s.playerAngle,
        depth: 1,
        speed: -0.04,
      });
      s.lastShot = t;
    }

    // Move bullets
    for (const b of s.bullets) {
      b.depth += b.speed;
    }
    s.bullets = s.bullets.filter((b) => b.depth > 0);

    // Collision
    for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
      const b = s.bullets[bi];
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const angleDiff = Math.abs(
          Math.atan2(Math.sin(b.angle - e.angle), Math.cos(b.angle - e.angle))
        );
        if (angleDiff < 0.3 && Math.abs(b.depth - e.depth) < 0.1) {
          e.alive = false;
          e.respawnAt = t + 1.5 + Math.random() * 2;
          s.bullets.splice(bi, 1);
          break;
        }
      }
    }

    // --- DRAW ---
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = VEC_COLOR;
    ctx.shadowBlur = 3;

    // Warp tunnel rings
    ctx.strokeStyle = VEC_DIM;
    ctx.lineWidth = 0.5;
    for (let r = 0; r < 8; r++) {
      const ringDepth = ((r / 8 + t * 0.05) % 1);
      const ringR = ringDepth * maxR;
      ctx.globalAlpha = ringDepth * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Stars
    ctx.fillStyle = VEC_DIM;
    for (const star of s.stars) {
      const sr = star.depth * maxR;
      const sx = cx + Math.cos(star.angle) * sr;
      const sy = cy + Math.sin(star.angle) * sr;
      const sz = 0.5 + star.depth * 1.5;
      ctx.globalAlpha = star.depth;
      ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    // Enemies
    ctx.strokeStyle = VEC_COLOR;
    ctx.lineWidth = 1.2;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      const er = e.depth * maxR;
      const ex = cx + Math.cos(e.angle) * er;
      const ey = cy + Math.sin(e.angle) * er;
      const sz = 3 + e.depth * 6;
      // Small diamond shape
      ctx.beginPath();
      ctx.moveTo(ex, ey - sz);
      ctx.lineTo(ex + sz * 0.7, ey);
      ctx.lineTo(ex, ey + sz);
      ctx.lineTo(ex - sz * 0.7, ey);
      ctx.closePath();
      ctx.stroke();
    }

    // Bullets
    ctx.fillStyle = VEC_COLOR;
    for (const b of s.bullets) {
      const br = b.depth * maxR;
      const bx = cx + Math.cos(b.angle) * br;
      const by = cy + Math.sin(b.angle) * br;
      ctx.beginPath();
      ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player ship (on the rim)
    const playerR = maxR;
    const px = cx + Math.cos(s.playerAngle) * playerR;
    const py = cy + Math.sin(s.playerAngle) * playerR;
    ctx.strokeStyle = VEC_COLOR;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(s.playerAngle + Math.PI);
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Center vanishing point
    ctx.shadowBlur = 8;
    ctx.fillStyle = VEC_COLOR;
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, 30);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />;
}
