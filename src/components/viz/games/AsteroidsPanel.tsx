import { useRef, useMemo } from "react";
import { useCanvas } from "./useCanvas";

const VEC_COLOR = "#00ff41";
const VEC_DIM = "rgba(0,255,65,0.3)";

interface Asteroid {
  x: number; y: number; r: number; angle: number;
  vx: number; vy: number; va: number; sides: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number; life: number;
}

export function AsteroidsPanel() {
  const stateRef = useRef<{
    ship: { x: number; y: number; angle: number; thrust: boolean };
    asteroids: Asteroid[];
    bullets: Bullet[];
    lastShot: number;
    score: number;
  } | null>(null);

  const seed = useMemo(() => Math.random(), []);

  const canvasRef = useCanvas((ctx, w, h, t) => {
    // Initialize state
    if (!stateRef.current) {
      const asteroids: Asteroid[] = [];
      for (let i = 0; i < 8; i++) {
        asteroids.push({
          x: Math.random() * w, y: Math.random() * h,
          r: 15 + Math.random() * 20,
          angle: Math.random() * Math.PI * 2,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          va: (Math.random() - 0.5) * 0.03,
          sides: 7 + Math.floor(Math.random() * 5),
        });
      }
      stateRef.current = {
        ship: { x: w / 2, y: h / 2, angle: 0, thrust: false },
        asteroids,
        bullets: [],
        lastShot: 0,
        score: 0,
      };
    }

    const state = stateRef.current;
    const { ship, asteroids, bullets } = state;

    // AI "decides" - simple pseudorandom behavior based on time
    const aiPhase = (t * 1.3 + seed * 100) % 8;
    const nearestAsteroid = asteroids.reduce((best, a) => {
      const dx = a.x - ship.x;
      const dy = a.y - ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < best.dist ? { a, dist, dx, dy } : best;
    }, { a: asteroids[0], dist: Infinity, dx: 0, dy: 0 });

    if (nearestAsteroid.a) {
      const targetAngle = Math.atan2(nearestAsteroid.dy, nearestAsteroid.dx);
      const diff = targetAngle - ship.angle;
      ship.angle += Math.sign(Math.sin(diff)) * 0.08;
    }
    ship.thrust = aiPhase < 5;

    // Shoot periodically
    if (t - state.lastShot > 0.3 + Math.sin(t * 2) * 0.15) {
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * 12,
        y: ship.y + Math.sin(ship.angle) * 12,
        vx: Math.cos(ship.angle) * 5,
        vy: Math.sin(ship.angle) * 5,
        life: 40,
      });
      state.lastShot = t;
    }

    // Move ship
    if (ship.thrust) {
      ship.x += Math.cos(ship.angle) * 1.5;
      ship.y += Math.sin(ship.angle) * 1.5;
    }
    ship.x = ((ship.x % w) + w) % w;
    ship.y = ((ship.y % h) + h) % h;

    // Move asteroids
    for (const a of asteroids) {
      a.x = ((a.x + a.vx) % w + w) % w;
      a.y = ((a.y + a.vy) % h + h) % h;
      a.angle += a.va;
    }

    // Move bullets
    for (const b of bullets) {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
    }
    state.bullets = bullets.filter((b) => b.life > 0);

    // Collisions - bullet hits asteroid
    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const b = state.bullets[bi];
        const a = asteroids[ai];
        if (!b || !a) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.sqrt(dx * dx + dy * dy) < a.r) {
          state.bullets.splice(bi, 1);
          if (a.r > 12) {
            // Split
            for (let k = 0; k < 2; k++) {
              asteroids.push({
                x: a.x, y: a.y, r: a.r * 0.6,
                angle: Math.random() * Math.PI * 2,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                va: (Math.random() - 0.5) * 0.05,
                sides: 5 + Math.floor(Math.random() * 4),
              });
            }
          }
          asteroids.splice(ai, 1);
          state.score += 100;
          break;
        }
      }
    }

    // Respawn asteroids if too few
    while (asteroids.length < 5) {
      asteroids.push({
        x: Math.random() * w, y: Math.random() * h,
        r: 15 + Math.random() * 20,
        angle: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        va: (Math.random() - 0.5) * 0.03,
        sides: 7 + Math.floor(Math.random() * 5),
      });
    }

    // --- DRAW ---
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = VEC_COLOR;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = VEC_COLOR;
    ctx.shadowBlur = 4;

    // Draw ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.stroke();
    if (ship.thrust) {
      ctx.beginPath();
      ctx.moveTo(-5, -3);
      ctx.lineTo(-12 - Math.random() * 5, 0);
      ctx.lineTo(-5, 3);
      ctx.stroke();
    }
    ctx.restore();

    // Draw asteroids
    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.beginPath();
      for (let i = 0; i <= a.sides; i++) {
        const ang = (i / a.sides) * Math.PI * 2;
        const jitter = 0.7 + ((Math.sin(i * 13.7 + a.r * 7.3) + 1) / 2) * 0.6;
        const px = Math.cos(ang) * a.r * jitter;
        const py = Math.sin(ang) * a.r * jitter;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Draw bullets
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = VEC_COLOR;
      ctx.fill();
    }

    // Score
    ctx.shadowBlur = 0;
    ctx.fillStyle = VEC_DIM;
    ctx.font = "10px monospace";
    ctx.fillText(`SCORE ${state.score}`, 8, 14);
  }, 30);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />;
}
