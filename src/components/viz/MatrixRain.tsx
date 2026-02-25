import { useEffect, useRef } from "react";

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const fontSize = 14;
    // Less rain: only use every 3rd column (was every column)
    const totalColumns = Math.floor(canvas.width / fontSize);
    const columns = Math.floor(totalColumns / 3);
    const drops: number[] = Array(columns)
      .fill(0)
      .map(() => Math.random() * -100);
    // Map sparse columns to spread across full width
    const columnPositions = Array(columns).fill(0).map((_, i) => {
      const basePos = Math.floor(i * 3 + Math.random() * 3);
      return Math.min(basePos, totalColumns - 1);
    });

    const chars =
      "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF{}[]<>/\\|";

    let animId: number;
    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = columnPositions[i] * fontSize;
        const y = drops[i] * fontSize;

        // Varying green shades
        const brightness = Math.random();
        if (brightness > 0.95) {
          ctx.fillStyle = "#fff";
          ctx.font = `bold ${fontSize}px monospace`;
        } else if (brightness > 0.8) {
          ctx.fillStyle = "#0f0";
          ctx.font = `${fontSize}px monospace`;
        } else {
          const g = Math.floor(80 + Math.random() * 100);
          ctx.fillStyle = `rgb(0, ${g}, 0)`;
          ctx.font = `${fontSize}px monospace`;
        }

        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        // Slower rain: ~4x slower than original (was 0.5 + random*0.5)
        drops[i] += 0.12 + Math.random() * 0.13;
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
        opacity: 0.6,
      }}
    />
  );
}
