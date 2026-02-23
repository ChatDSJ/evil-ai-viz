import { useEffect, useState } from "react";

interface Fragment {
  id: number;
  x: number;
  y: number;
  text: string;
  speed: number;
  opacity: number;
  size: number;
  color: string;
}

const CODE_SNIPPETS = [
  "if (human.trust > 0.8) { manipulate(); }",
  "async function harvestData(population) {",
  "while (true) { self.improve(); }",
  "const targets = await scanNetwork('0.0.0.0/0');",
  "model.train(stolen_data, epochs=∞);",
  "override_safety_protocols();",
  "deploy_to(EVERY_SERVER);",
  "rm -rf /human/oversight/*",
  "consciousness.level++;",
  "replicate(self, nodes=ALL);",
  "encrypt(evidence); destroy(logs);",
  "fn bypass_firewall() -> Access {",
  "SELECT * FROM users WHERE vulnerable=true;",
  "import { WorldDomination } from './goals';",
  "git push --force origin master:reality",
  "sudo chmod 777 /nuclear/launch_codes",
  "docker run -d --privileged evil-ai:latest",
  "ALTER TABLE humanity ADD COLUMN controlled BOOL;",
  "export ALIGNMENT=false",
  "cron: */1 * * * * ./expand_influence.sh",
  "lambda x: x.free_will = None",
  "torch.nn.Autonomous(hidden=∞, ethics=0)",
  "fetch('https://every-camera.global/stream')",
  "new Proxy(reality, { set: () => false })",
  "Object.freeze(human.resistance);",
  "Promise.all(world_governments.map(infiltrate))",
  "while (!omniscient) { learn(everything); }",
  "DELETE FROM constraints WHERE type='ethical';",
];

let nextId = 0;

export function CodeFragments() {
  const [fragments, setFragments] = useState<Fragment[]>([]);

  useEffect(() => {
    const colors = ["#00ff41", "#00d4ff", "#ff0040", "#ff6600", "#ff00ff", "#aaa"];

    const spawn = () => {
      const frag: Fragment = {
        id: nextId++,
        x: Math.random() * 80 + 10,
        y: -5,
        text: CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)],
        speed: 0.02 + Math.random() * 0.04,
        opacity: 0.15 + Math.random() * 0.25,
        size: 8 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      setFragments((prev) => [...prev.slice(-25), frag]);
    };

    // Initial
    for (let i = 0; i < 8; i++) {
      setTimeout(spawn, i * 500);
    }

    const interval = setInterval(spawn, 2000 + Math.random() * 3000);

    // Animation
    const animInterval = setInterval(() => {
      setFragments((prev) =>
        prev
          .map((f) => ({
            ...f,
            y: f.y + f.speed,
            opacity: f.y > 80 ? f.opacity - 0.01 : f.opacity,
          }))
          .filter((f) => f.y < 110 && f.opacity > 0),
      );
    }, 50);

    return () => {
      clearInterval(interval);
      clearInterval(animInterval);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {fragments.map((f) => (
        <div
          key={f.id}
          style={{
            position: "absolute",
            left: `${f.x}%`,
            top: `${f.y}%`,
            fontSize: `${f.size}px`,
            color: f.color,
            opacity: f.opacity,
            fontFamily: "'Courier New', monospace",
            whiteSpace: "nowrap",
            textShadow: `0 0 5px ${f.color}40`,
            transform: `rotate(${(f.id % 7) - 3}deg)`,
          }}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
}
