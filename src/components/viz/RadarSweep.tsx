import { useEffect, useRef } from "react";

export function RadarSweep() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const parent = canvas.parentElement!;

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 10;

    let angle = 0;
    const blips: { angle: number; dist: number; alpha: number; size: number }[] = [];

    // Spawn blips
    const spawnBlip = () => {
      blips.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0.2 + Math.random() * 0.7,
        alpha: 1,
        size: 2 + Math.random() * 3,
      });
    };

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Border
      ctx.strokeStyle = "rgba(0, 255, 65, 0.3)";
      ctx.lineWidth = 1;

      // Concentric circles
      for (let r = 0.25; r <= 1; r += 0.25) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cross lines
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();

      // Sweep gradient
      const sweepAngle = 0.8;
      const gradient = ctx.createConicGradient(angle - sweepAngle, cx, cy);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(sweepAngle / (Math.PI * 2), "rgba(0, 255, 65, 0.3)");
      gradient.addColorStop(sweepAngle / (Math.PI * 2) + 0.001, "transparent");

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = "#00ff41";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw and update blips
      for (let i = blips.length - 1; i >= 0; i--) {
        const b = blips[i];
        const bx = cx + Math.cos(b.angle) * b.dist * radius;
        const by = cy + Math.sin(b.angle) * b.dist * radius;

        ctx.beginPath();
        ctx.arc(bx, by, b.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 64, ${b.alpha})`;
        ctx.fill();

        // Glow
        const grd = ctx.createRadialGradient(bx, by, 0, bx, by, b.size * 3);
        grd.addColorStop(0, `rgba(255, 0, 64, ${b.alpha * 0.4})`);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fillRect(bx - b.size * 3, by - b.size * 3, b.size * 6, b.size * 6);

        b.alpha -= 0.003;
        if (b.alpha <= 0) blips.splice(i, 1);
      }

      // Spawn blips near sweep line
      if (Math.random() > 0.92) spawnBlip();

      // Labels
      ctx.font = "8px monospace";
      ctx.fillStyle = "#00ff41";
      ctx.globalAlpha = 0.6;
      ctx.fillText("THREAT RADAR", 6, 12);
      ctx.fillText(`TARGETS: ${blips.length}`, 6, 24);
      ctx.globalAlpha = 1;

      angle += 0.02;

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
