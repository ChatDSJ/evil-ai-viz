import { useEffect, useRef, useState } from "react";

/**
 * MouseHeatmap — a full-screen canvas overlay that silently accumulates
 * cursor position data and renders it as a heat signature. Over time,
 * frequently visited areas glow warm (orange → red) while the rest
 * stays dark. No labels, no text, no explanation.
 *
 * Technical approach:
 * - Maintains an off-screen "accumulation" canvas at reduced resolution
 * - Each mouse position adds a radial gradient "stamp" to the accumulator
 * - Every frame, the accumulator is rendered to screen with a color map
 * - The heatmap fades in gradually once enough data has accumulated
 * - Uses requestAnimationFrame for smooth rendering
 */

const RESOLUTION_SCALE = 0.15; // Render at 15% of screen resolution for performance
const STAMP_RADIUS = 18; // Radius of each cursor stamp (in scaled pixels)
const STAMP_INTENSITY = 0.012; // How much each sample adds (subtle accumulation)
const RENDER_FPS = 12; // Don't need 60fps for a slow-building heatmap
const MIN_SAMPLES_TO_SHOW = 80; // Wait for this many samples before fading in
const FADE_IN_DURATION = 8000; // ms to fade in
const MAX_OPACITY = 0.25; // Maximum overlay opacity — should be subtle

export function MouseHeatmap() {
  const screenCanvasRef = useRef<HTMLCanvasElement>(null);
  const accumRef = useRef<Float32Array | null>(null);
  const dimsRef = useRef({ w: 0, h: 0, sw: 0, sh: 0 });
  const sampleCountRef = useRef(0);
  const [opacity, setOpacity] = useState(0);
  const fadeStartRef = useRef<number | null>(null);

  // Initialize accumulation buffer
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const sw = Math.ceil(w * RESOLUTION_SCALE);
    const sh = Math.ceil(h * RESOLUTION_SCALE);
    dimsRef.current = { w, h, sw, sh };
    accumRef.current = new Float32Array(sw * sh);

    // Handle resize
    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      const nsw = Math.ceil(nw * RESOLUTION_SCALE);
      const nsh = Math.ceil(nh * RESOLUTION_SCALE);
      dimsRef.current = { w: nw, h: nh, sw: nsw, sh: nsh };
      // Create new buffer (loses old data on resize — acceptable)
      accumRef.current = new Float32Array(nsw * nsh);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Track mouse and stamp into accumulation buffer
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const accum = accumRef.current;
      if (!accum) return;

      const { w, h, sw, sh } = dimsRef.current;
      const sx = (e.clientX / w) * sw;
      const sy = (e.clientY / h) * sh;

      // Stamp a radial gradient into the accumulation buffer
      const r = STAMP_RADIUS * RESOLUTION_SCALE;
      const r2 = r * r;
      const x0 = Math.max(0, Math.floor(sx - r));
      const y0 = Math.max(0, Math.floor(sy - r));
      const x1 = Math.min(sw - 1, Math.ceil(sx + r));
      const y1 = Math.min(sh - 1, Math.ceil(sy + r));

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - sx;
          const dy = y - sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2) {
            // Gaussian-ish falloff
            const falloff = 1 - d2 / r2;
            const intensity = STAMP_INTENSITY * falloff * falloff;
            accum[y * sw + x] = Math.min(1, accum[y * sw + x] + intensity);
          }
        }
      }

      sampleCountRef.current++;
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Render loop
  useEffect(() => {
    let animId: number;
    let lastRender = 0;
    const interval = 1000 / RENDER_FPS;

    const render = (time: number) => {
      animId = requestAnimationFrame(render);

      if (time - lastRender < interval) return;
      lastRender = time;

      const canvas = screenCanvasRef.current;
      const accum = accumRef.current;
      if (!canvas || !accum) return;

      const { w, h, sw, sh } = dimsRef.current;

      // Resize canvas if needed
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fade-in logic
      if (sampleCountRef.current >= MIN_SAMPLES_TO_SHOW) {
        if (fadeStartRef.current === null) {
          fadeStartRef.current = time;
        }
        const elapsed = time - fadeStartRef.current;
        const t = Math.min(1, elapsed / FADE_IN_DURATION);
        const newOpacity = t * MAX_OPACITY;
        setOpacity(newOpacity);
      }

      // Create ImageData from accumulation buffer
      const imgData = ctx.createImageData(sw, sh);
      const pixels = imgData.data;

      for (let i = 0; i < sw * sh; i++) {
        const v = accum[i];
        if (v < 0.001) {
          // Fully transparent — skip
          pixels[i * 4 + 3] = 0;
          continue;
        }

        // Color ramp: dark blue → cyan → yellow → orange → red
        let r: number, g: number, b: number, a: number;

        if (v < 0.15) {
          // Dark blue → cyan
          const t = v / 0.15;
          r = 0;
          g = Math.round(t * 80);
          b = Math.round(40 + t * 120);
          a = Math.round(t * 120);
        } else if (v < 0.35) {
          // Cyan → green
          const t = (v - 0.15) / 0.2;
          r = 0;
          g = Math.round(80 + t * 140);
          b = Math.round(160 - t * 100);
          a = Math.round(120 + t * 50);
        } else if (v < 0.55) {
          // Green → yellow
          const t = (v - 0.35) / 0.2;
          r = Math.round(t * 255);
          g = Math.round(220 - t * 20);
          b = Math.round(60 - t * 60);
          a = Math.round(170 + t * 30);
        } else if (v < 0.75) {
          // Yellow → orange
          const t = (v - 0.55) / 0.2;
          r = 255;
          g = Math.round(200 - t * 120);
          b = 0;
          a = Math.round(200 + t * 30);
        } else {
          // Orange → red/white hot
          const t = Math.min(1, (v - 0.75) / 0.25);
          r = 255;
          g = Math.round(80 - t * 40 + t * 100); // Goes toward white
          b = Math.round(t * 80);
          a = Math.round(230 + t * 25);
        }

        pixels[i * 4] = r;
        pixels[i * 4 + 1] = g;
        pixels[i * 4 + 2] = b;
        pixels[i * 4 + 3] = a;
      }

      // Clear and draw scaled
      ctx.clearRect(0, 0, w, h);

      // Draw the low-res heatmap scaled up with smoothing
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = sw;
      tempCanvas.height = sh;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(tempCanvas, 0, 0, sw, sh, 0, 0, w, h);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={screenCanvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 45,
        opacity,
        transition: "opacity 0.5s ease",
        mixBlendMode: "screen",
      }}
    />
  );
}
