import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  layer: number;
  activation: number;
}

export function NeuralNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const parent = canvas.parentElement!;

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const w = canvas.width;
    const h = canvas.height;

    // Create neural network nodes
    const nodes: Node[] = [];
    const layers = [4, 6, 8, 6, 4, 3];

    for (let l = 0; l < layers.length; l++) {
      const count = layers[l];
      const layerX = (w / (layers.length + 1)) * (l + 1);
      for (let n = 0; n < count; n++) {
        const nodeY = (h / (count + 1)) * (n + 1);
        nodes.push({
          x: layerX,
          y: nodeY,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: 3 + Math.random() * 2,
          layer: l,
          activation: Math.random(),
        });
      }
    }

    // Create connections (between adjacent layers)
    const connections: [number, number][] = [];
    let nodeIdx = 0;
    for (let l = 0; l < layers.length - 1; l++) {
      const nextStart = nodeIdx + layers[l];
      for (let i = 0; i < layers[l]; i++) {
        for (let j = 0; j < layers[l + 1]; j++) {
          if (Math.random() > 0.3) {
            connections.push([nodeIdx + i, nextStart + j]);
          }
        }
      }
      nodeIdx += layers[l];
    }

    // Signal particles
    const signals: {
      fromIdx: number;
      toIdx: number;
      progress: number;
      speed: number;
    }[] = [];

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Border
      ctx.strokeStyle = "rgba(0, 212, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, w, h);

      // Label
      ctx.font = "9px monospace";
      ctx.fillStyle = "#00d4ff";
      ctx.globalAlpha = 0.7;
      ctx.fillText("NEURAL ARCHITECTURE v7.3", 8, 14);
      ctx.fillText("STATUS: SELF-IMPROVING", 8, 26);
      ctx.globalAlpha = 1;

      // Update node positions (subtle movement)
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        node.activation = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() * 0.002 + node.x * 0.1));

        // Boundaries
        const layerX = (w / (layers.length + 1)) * (node.layer + 1);
        if (Math.abs(node.x - layerX) > 15) node.vx *= -1;
        const layerNodeCount = layers[node.layer];
        const baseY = (h / (layerNodeCount + 1)) * (nodes.filter((n) => n.layer === node.layer).indexOf(node) + 1);
        if (Math.abs(node.y - baseY) > 10) node.vy *= -1;
      }

      // Draw connections
      for (const [fromIdx, toIdx] of connections) {
        const from = nodes[fromIdx];
        const to = nodes[toIdx];
        const alpha = 0.08 + from.activation * 0.12;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Spawn signals
      if (Math.random() > 0.85 && signals.length < 20) {
        const conn = connections[Math.floor(Math.random() * connections.length)];
        signals.push({
          fromIdx: conn[0],
          toIdx: conn[1],
          progress: 0,
          speed: 0.02 + Math.random() * 0.03,
        });
      }

      // Draw signals
      for (let i = signals.length - 1; i >= 0; i--) {
        const sig = signals[i];
        const from = nodes[sig.fromIdx];
        const to = nodes[sig.toIdx];
        const x = from.x + (to.x - from.x) * sig.progress;
        const y = from.y + (to.y - from.y) * sig.progress;

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#00d4ff";
        ctx.fill();

        // Glow
        const grd = ctx.createRadialGradient(x, y, 0, x, y, 8);
        grd.addColorStop(0, "rgba(0, 212, 255, 0.4)");
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fillRect(x - 8, y - 8, 16, 16);

        sig.progress += sig.speed;
        if (sig.progress >= 1) {
          signals.splice(i, 1);
        }
      }

      // Draw nodes
      for (const node of nodes) {
        // Glow
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 4);
        grd.addColorStop(0, `rgba(0, 212, 255, ${node.activation * 0.3})`);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fillRect(node.x - node.radius * 4, node.y - node.radius * 4, node.radius * 8, node.radius * 8);

        // Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${0.4 + node.activation * 0.6})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0, 212, 255, ${0.6 + node.activation * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
