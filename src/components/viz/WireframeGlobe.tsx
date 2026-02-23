import { useEffect, useRef } from "react";

export function WireframeGlobe() {
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
    const radius = Math.min(cx, cy) - 20;

    let rotY = 0;
    let rotX = 0.3;

    // Data points on globe
    const dataPoints: { lat: number; lng: number; pulse: number }[] = [];
    for (let i = 0; i < 30; i++) {
      dataPoints.push({
        lat: (Math.random() - 0.5) * Math.PI,
        lng: Math.random() * Math.PI * 2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Connection arcs
    const arcs: { from: number; to: number; color: string }[] = [];
    for (let i = 0; i < 12; i++) {
      arcs.push({
        from: Math.floor(Math.random() * dataPoints.length),
        to: Math.floor(Math.random() * dataPoints.length),
        color: Math.random() > 0.5 ? "#ff0040" : "#00d4ff",
      });
    }

    const project = (
      lat: number,
      lng: number,
    ): { x: number; y: number; z: number } => {
      const x1 = Math.cos(lat) * Math.cos(lng + rotY);
      const y1 = Math.sin(lat);
      const z1 = Math.cos(lat) * Math.sin(lng + rotY);

      // Rotate around X
      const y2 = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
      const z2 = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);

      return {
        x: cx + x1 * radius,
        y: cy + y2 * radius,
        z: z2,
      };
    };

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Label
      ctx.font = "9px monospace";
      ctx.fillStyle = "#00ff41";
      ctx.globalAlpha = 0.6;
      ctx.fillText("GLOBAL NETWORK", 8, 14);
      ctx.fillText("NODES: " + dataPoints.length, 8, 26);
      ctx.globalAlpha = 1;

      // Draw outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 65, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw longitude lines
      for (let lng = 0; lng < Math.PI * 2; lng += Math.PI / 6) {
        ctx.beginPath();
        for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += 0.1) {
          const p = project(lat, lng);
          if (lat === -Math.PI / 2) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle =
          "rgba(0, 255, 65, 0.08)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw latitude lines
      for (let lat = -Math.PI / 3; lat <= Math.PI / 3; lat += Math.PI / 6) {
        ctx.beginPath();
        for (let lng = 0; lng <= Math.PI * 2; lng += 0.1) {
          const p = project(lat, lng);
          if (lng === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle =
          "rgba(0, 255, 65, 0.08)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw arcs between data points
      for (const arc of arcs) {
        const from = dataPoints[arc.from];
        const to = dataPoints[arc.to];
        const pf = project(from.lat, from.lng);
        const pt = project(to.lat, to.lng);

        if (pf.z > -0.3 || pt.z > -0.3) {
          ctx.beginPath();
          // Curved arc
          const midX = (pf.x + pt.x) / 2;
          const midY = (pf.y + pt.y) / 2 - 20;
          ctx.moveTo(pf.x, pf.y);
          ctx.quadraticCurveTo(midX, midY, pt.x, pt.y);
          ctx.strokeStyle = arc.color + "40";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw data points
      for (const dp of dataPoints) {
        const p = project(dp.lat, dp.lng);
        if (p.z > -0.2) {
          const alpha = 0.3 + p.z * 0.7;
          const pulseSize =
            2 + Math.sin(Date.now() * 0.003 + dp.pulse) * 1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 0, 64, ${alpha})`;
          ctx.fill();

          // Glow
          const grd = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            8,
          );
          grd.addColorStop(
            0,
            `rgba(255, 0, 64, ${alpha * 0.3})`,
          );
          grd.addColorStop(1, "transparent");
          ctx.fillStyle = grd;
          ctx.fillRect(p.x - 8, p.y - 8, 16, 16);
        }

        dp.pulse += 0.02;
      }

      rotY += 0.005;
      rotX = 0.3 + Math.sin(Date.now() * 0.0003) * 0.15;

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
