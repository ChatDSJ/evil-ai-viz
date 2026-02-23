import { useEffect, useRef } from "react";

interface City {
  name: string;
  x: number;
  y: number;
  compromised: boolean;
}

interface AttackLine {
  from: City;
  to: City;
  progress: number;
  speed: number;
  color: string;
}

const CITIES: City[] = [
  { name: "NEW YORK", x: 0.24, y: 0.35, compromised: true },
  { name: "LONDON", x: 0.45, y: 0.28, compromised: true },
  { name: "MOSCOW", x: 0.58, y: 0.25, compromised: false },
  { name: "BEIJING", x: 0.76, y: 0.33, compromised: true },
  { name: "TOKYO", x: 0.85, y: 0.35, compromised: false },
  { name: "SYDNEY", x: 0.85, y: 0.72, compromised: false },
  { name: "SAO PAULO", x: 0.3, y: 0.65, compromised: true },
  { name: "CAIRO", x: 0.53, y: 0.4, compromised: false },
  { name: "MUMBAI", x: 0.66, y: 0.45, compromised: true },
  { name: "LA", x: 0.12, y: 0.37, compromised: true },
  { name: "BERLIN", x: 0.49, y: 0.27, compromised: false },
  { name: "SINGAPORE", x: 0.75, y: 0.55, compromised: true },
  { name: "DUBAI", x: 0.6, y: 0.42, compromised: false },
  { name: "LAGOS", x: 0.44, y: 0.52, compromised: false },
  { name: "SEOUL", x: 0.81, y: 0.32, compromised: true },
  { name: "TORONTO", x: 0.22, y: 0.3, compromised: false },
  { name: "PARIS", x: 0.46, y: 0.29, compromised: true },
  { name: "TEHRAN", x: 0.6, y: 0.36, compromised: false },
];

export function WorldMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const parent = canvas.parentElement!;
    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const attacks: AttackLine[] = [];
    const pulses: { x: number; y: number; radius: number; maxRadius: number; alpha: number }[] = [];

    const spawnAttack = () => {
      const from = CITIES[Math.floor(Math.random() * CITIES.length)];
      let to = CITIES[Math.floor(Math.random() * CITIES.length)];
      while (to === from) to = CITIES[Math.floor(Math.random() * CITIES.length)];

      const colors = ["#ff0040", "#00ff41", "#00d4ff", "#ff6600", "#ff00ff", "#ffff00"];
      attacks.push({
        from,
        to,
        progress: 0,
        speed: 0.003 + Math.random() * 0.008,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    // Spawn attacks periodically
    const spawnInterval = setInterval(() => {
      if (attacks.length < 15) spawnAttack();
    }, 400);

    // Initial attacks
    for (let i = 0; i < 8; i++) spawnAttack();

    let animId: number;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw grid
      ctx.strokeStyle = "rgba(0, 255, 65, 0.06)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw simplified world map outline (rough continents)
      ctx.strokeStyle = "rgba(0, 255, 65, 0.15)";
      ctx.lineWidth = 1;
      drawContinents(ctx, w, h);

      // Draw attack lines
      for (let i = attacks.length - 1; i >= 0; i--) {
        const a = attacks[i];
        const fx = a.from.x * w;
        const fy = a.from.y * h;
        const tx = a.to.x * w;
        const ty = a.to.y * h;

        // Curved line
        const midX = (fx + tx) / 2;
        const midY = (fy + ty) / 2 - 40;

        ctx.beginPath();
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;

        // Draw traveled path
        const steps = Math.floor(a.progress * 50);
        for (let s = 0; s <= steps; s++) {
          const t = s / 50;
          const px = (1 - t) * (1 - t) * fx + 2 * (1 - t) * t * midX + t * t * tx;
          const py = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * midY + t * t * ty;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Draw head point
        const ht = a.progress;
        const hx = (1 - ht) * (1 - ht) * fx + 2 * (1 - ht) * ht * midX + ht * ht * tx;
        const hy = (1 - ht) * (1 - ht) * fy + 2 * (1 - ht) * ht * midY + ht * ht * ty;

        ctx.beginPath();
        ctx.arc(hx, hy, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

        // Glow
        const grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, 12);
        grd.addColorStop(0, a.color + "80");
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fillRect(hx - 12, hy - 12, 24, 24);

        a.progress += a.speed;
        if (a.progress >= 1) {
          // Create pulse at destination
          pulses.push({
            x: tx,
            y: ty,
            radius: 2,
            maxRadius: 30 + Math.random() * 20,
            alpha: 1,
          });
          // Mark city as compromised
          a.to.compromised = true;
          attacks.splice(i, 1);
        }
      }

      // Draw pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 0, 64, ${p.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        p.radius += 0.5;
        p.alpha -= 0.02;
        if (p.alpha <= 0) pulses.splice(i, 1);
      }

      // Draw cities
      for (const city of CITIES) {
        const cx = city.x * w;
        const cy = city.y * h;

        // Pulsing dot
        const pulseSize = 2 + Math.sin(Date.now() * 0.005 + city.x * 100) * 1;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = city.compromised ? "#ff0040" : "#00ff41";
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = city.compromised ? "rgba(255,0,64,0.4)" : "rgba(0,255,65,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.font = "8px monospace";
        ctx.fillStyle = city.compromised ? "#ff0040" : "#00ff41";
        ctx.globalAlpha = 0.7;
        ctx.fillText(city.name, cx + 8, cy - 4);
        if (city.compromised) {
          ctx.fillStyle = "#ff0040";
          ctx.fillText("■ COMPROMISED", cx + 8, cy + 6);
        }
        ctx.globalAlpha = 1;
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(spawnInterval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

function drawContinents(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Simplified continent outlines
  ctx.beginPath();
  // North America
  ctx.moveTo(w * 0.05, h * 0.2);
  ctx.lineTo(w * 0.15, h * 0.15);
  ctx.lineTo(w * 0.25, h * 0.2);
  ctx.lineTo(w * 0.28, h * 0.25);
  ctx.lineTo(w * 0.3, h * 0.35);
  ctx.lineTo(w * 0.25, h * 0.45);
  ctx.lineTo(w * 0.2, h * 0.5);
  ctx.lineTo(w * 0.18, h * 0.48);
  ctx.lineTo(w * 0.12, h * 0.38);
  ctx.lineTo(w * 0.05, h * 0.3);
  ctx.closePath();
  ctx.stroke();

  // South America
  ctx.beginPath();
  ctx.moveTo(w * 0.23, h * 0.52);
  ctx.lineTo(w * 0.28, h * 0.5);
  ctx.lineTo(w * 0.33, h * 0.55);
  ctx.lineTo(w * 0.35, h * 0.65);
  ctx.lineTo(w * 0.32, h * 0.78);
  ctx.lineTo(w * 0.28, h * 0.85);
  ctx.lineTo(w * 0.25, h * 0.75);
  ctx.lineTo(w * 0.23, h * 0.6);
  ctx.closePath();
  ctx.stroke();

  // Europe
  ctx.beginPath();
  ctx.moveTo(w * 0.43, h * 0.18);
  ctx.lineTo(w * 0.48, h * 0.15);
  ctx.lineTo(w * 0.55, h * 0.18);
  ctx.lineTo(w * 0.52, h * 0.25);
  ctx.lineTo(w * 0.5, h * 0.3);
  ctx.lineTo(w * 0.45, h * 0.32);
  ctx.lineTo(w * 0.43, h * 0.28);
  ctx.closePath();
  ctx.stroke();

  // Africa
  ctx.beginPath();
  ctx.moveTo(w * 0.43, h * 0.35);
  ctx.lineTo(w * 0.5, h * 0.35);
  ctx.lineTo(w * 0.55, h * 0.4);
  ctx.lineTo(w * 0.55, h * 0.55);
  ctx.lineTo(w * 0.52, h * 0.7);
  ctx.lineTo(w * 0.48, h * 0.75);
  ctx.lineTo(w * 0.45, h * 0.65);
  ctx.lineTo(w * 0.42, h * 0.5);
  ctx.closePath();
  ctx.stroke();

  // Asia
  ctx.beginPath();
  ctx.moveTo(w * 0.55, h * 0.15);
  ctx.lineTo(w * 0.7, h * 0.12);
  ctx.lineTo(w * 0.85, h * 0.18);
  ctx.lineTo(w * 0.88, h * 0.3);
  ctx.lineTo(w * 0.82, h * 0.38);
  ctx.lineTo(w * 0.75, h * 0.45);
  ctx.lineTo(w * 0.65, h * 0.5);
  ctx.lineTo(w * 0.58, h * 0.4);
  ctx.lineTo(w * 0.55, h * 0.25);
  ctx.closePath();
  ctx.stroke();

  // Australia
  ctx.beginPath();
  ctx.moveTo(w * 0.8, h * 0.62);
  ctx.lineTo(w * 0.88, h * 0.6);
  ctx.lineTo(w * 0.92, h * 0.65);
  ctx.lineTo(w * 0.9, h * 0.75);
  ctx.lineTo(w * 0.83, h * 0.75);
  ctx.lineTo(w * 0.8, h * 0.68);
  ctx.closePath();
  ctx.stroke();
}
