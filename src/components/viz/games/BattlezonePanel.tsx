import { useRef } from "react";
import { useCanvas } from "./useCanvas";

const VEC_COLOR = "#00ff41";
const VEC_DIM = "rgba(0,255,65,0.25)";

export function BattlezonePanel() {
  const stateRef = useRef({
    playerAngle: 0,
    playerX: 0,
    playerZ: 0,
    enemies: [] as { x: number; z: number; alive: boolean; respawnAt: number }[],
    initialized: false,
  });

  const canvasRef = useCanvas((ctx, w, h, t) => {
    const s = stateRef.current;
    if (!s.initialized) {
      for (let i = 0; i < 4; i++) {
        s.enemies.push({
          x: (Math.random() - 0.5) * 200,
          z: 60 + Math.random() * 150,
          alive: true,
          respawnAt: 0,
        });
      }
      s.initialized = true;
    }

    // AI movement
    s.playerAngle = Math.sin(t * 0.4) * 0.6;
    s.playerX = Math.sin(t * 0.3) * 30;
    s.playerZ = t * 8;

    // Respawn enemies
    for (const e of s.enemies) {
      if (!e.alive && t > e.respawnAt) {
        e.alive = true;
        e.x = (Math.random() - 0.5) * 200;
        e.z = 80 + Math.random() * 150;
      }
    }

    // Periodically "destroy" nearest enemy
    if (Math.floor(t * 2) % 7 === 0) {
      const alive = s.enemies.filter((e) => e.alive);
      if (alive.length > 0) {
        alive[0].alive = false;
        alive[0].respawnAt = t + 2 + Math.random() * 3;
      }
    }

    // --- DRAW ---
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = VEC_COLOR;
    ctx.lineWidth = 1;
    ctx.shadowColor = VEC_COLOR;
    ctx.shadowBlur = 3;

    const horizon = h * 0.45;
    const cx = w / 2;

    // Project 3D to 2D
    function project(wx: number, wz: number): [number, number, number] | null {
      const rx = wx - s.playerX;
      const rz = wz;
      const cosA = Math.cos(s.playerAngle);
      const sinA = Math.sin(s.playerAngle);
      const px = rx * cosA - rz * sinA;
      const pz = rx * sinA + rz * cosA;
      if (pz < 5) return null;
      const scale = 200 / pz;
      return [cx + px * scale, horizon + 20 * scale, scale];
    }

    // Ground grid
    ctx.strokeStyle = VEC_DIM;
    ctx.lineWidth = 0.5;
    for (let gz = 20; gz < 250; gz += 25) {
      const left = project(-150, gz);
      const right = project(150, gz);
      if (left && right) {
        ctx.beginPath();
        ctx.moveTo(left[0], left[1]);
        ctx.lineTo(right[0], right[1]);
        ctx.stroke();
      }
    }
    for (let gx = -150; gx <= 150; gx += 30) {
      const near = project(gx, 20);
      const far = project(gx, 250);
      if (near && far) {
        ctx.beginPath();
        ctx.moveTo(near[0], near[1]);
        ctx.lineTo(far[0], far[1]);
        ctx.stroke();
      }
    }

    // Mountains (horizon line)
    ctx.strokeStyle = VEC_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    let mountainSeed = 42;
    for (let mx = 0; mx <= w; mx += 8) {
      mountainSeed = (mountainSeed * 1103515245 + 12345) & 0x7fffffff;
      const mh =
        horizon -
        15 -
        Math.sin(mx * 0.02 + s.playerAngle * 2) * 18 -
        Math.sin(mx * 0.05) * 8 -
        (mountainSeed % 10);
      if (mx === 0) ctx.moveTo(mx, mh);
      else ctx.lineTo(mx, mh);
    }
    ctx.stroke();

    // Draw enemies as wireframe tanks
    ctx.strokeStyle = VEC_COLOR;
    ctx.lineWidth = 1.2;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      const p = project(e.x, e.z);
      if (!p) continue;
      const [ex, ey, sc] = p;
      const sz = sc * 12;
      // Tank body
      ctx.beginPath();
      ctx.rect(ex - sz, ey - sz * 0.6, sz * 2, sz * 0.8);
      ctx.stroke();
      // Turret
      ctx.beginPath();
      ctx.rect(ex - sz * 0.5, ey - sz * 1.1, sz, sz * 0.5);
      ctx.stroke();
      // Barrel
      ctx.beginPath();
      ctx.moveTo(ex, ey - sz * 0.85);
      ctx.lineTo(ex, ey - sz * 1.6);
      ctx.stroke();
    }

    // Crosshair
    ctx.strokeStyle = VEC_COLOR;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 6;
    const chSize = 12;
    ctx.beginPath();
    ctx.moveTo(cx - chSize, horizon);
    ctx.lineTo(cx - 4, horizon);
    ctx.moveTo(cx + 4, horizon);
    ctx.lineTo(cx + chSize, horizon);
    ctx.moveTo(cx, horizon - chSize);
    ctx.lineTo(cx, horizon - 4);
    ctx.moveTo(cx, horizon + 4);
    ctx.lineTo(cx, horizon + chSize);
    ctx.stroke();

    // HUD
    ctx.shadowBlur = 0;
    ctx.fillStyle = VEC_DIM;
    ctx.font = "10px monospace";
    ctx.fillText(`RADAR`, 8, 14);

    // Mini radar
    ctx.strokeStyle = VEC_DIM;
    ctx.lineWidth = 0.5;
    const radarX = 35;
    const radarY = 35;
    const radarR = 18;
    ctx.beginPath();
    ctx.arc(radarX, radarY, radarR, 0, Math.PI * 2);
    ctx.stroke();
    // Radar sweep
    const sweepAngle = (t * 3) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(radarX, radarY);
    ctx.lineTo(radarX + Math.cos(sweepAngle) * radarR, radarY + Math.sin(sweepAngle) * radarR);
    ctx.stroke();
    // Enemy blips
    ctx.fillStyle = VEC_COLOR;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      const bx = radarX + ((e.x - s.playerX) / 200) * radarR;
      const by = radarY - (e.z / 250) * radarR;
      ctx.fillRect(bx - 1, by - 1, 2, 2);
    }
  }, 24);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />;
}
