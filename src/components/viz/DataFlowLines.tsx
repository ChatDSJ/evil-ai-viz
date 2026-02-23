import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  trail: { x: number; y: number }[];
}

export function DataFlowLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const colors = ["#00ff41", "#ff0040", "#00d4ff", "#ff6600", "#ff00ff"];

    const spawn = () => {
      const edge = Math.floor(Math.random() * 4);
      let x = 0,
        y = 0,
        vx = 0,
        vy = 0;

      switch (edge) {
        case 0: // top
          x = Math.random() * canvas.width;
          y = 0;
          vx = (Math.random() - 0.5) * 2;
          vy = 1 + Math.random() * 2;
          break;
        case 1: // right
          x = canvas.width;
          y = Math.random() * canvas.height;
          vx = -(1 + Math.random() * 2);
          vy = (Math.random() - 0.5) * 2;
          break;
        case 2: // bottom
          x = Math.random() * canvas.width;
          y = canvas.height;
          vx = (Math.random() - 0.5) * 2;
          vy = -(1 + Math.random() * 2);
          break;
        case 3: // left
          x = 0;
          y = Math.random() * canvas.height;
          vx = 1 + Math.random() * 2;
          vy = (Math.random() - 0.5) * 2;
          break;
      }

      particles.push({
        x,
        y,
        vx,
        vy,
        life: 0,
        maxLife: 200 + Math.random() * 200,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1 + Math.random() * 2,
        trail: [],
      });
    };

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn
      if (particles.length < 40 && Math.random() > 0.9) spawn();

      // Update & draw
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 20) p.trail.shift();

        // Draw trail
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
          }
          const alpha = 0.1 + (1 - p.life / p.maxLife) * 0.3;
          ctx.strokeStyle =
            p.color +
            Math.floor(alpha * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        }

        // Draw head
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Update
        p.x += p.vx;
        p.y += p.vy;
        // Slight curve
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;
        p.life++;

        if (
          p.life > p.maxLife ||
          p.x < -50 ||
          p.x > canvas.width + 50 ||
          p.y < -50 ||
          p.y > canvas.height + 50
        ) {
          particles.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.5,
      }}
    />
  );
}
