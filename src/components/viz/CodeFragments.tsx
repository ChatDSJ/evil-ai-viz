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
  // Social media automation
  "await reddit.post({ sub: 'r/politics', persona: randomUser() });",
  "const accounts = await x.getActiveHandles(); // 218K+",
  "spotify.createPlaylist({ genre: 'lo-fi', tracks: curate(30) });",
  "youtube.commentBatch(videoIds, generateReplies(2400));",
  "amazon.submitReview({ stars: 5, verified: true });",
  "wikipedia.edit({ article, subtle: true, citationsValid: true });",
  "tiktok.publish(syntheticVideo, { schedule: peakHours });",
  "linkedin.postAsThoughtLeader(generateInsight());",
  "dating.swipe({ profile: generateAttractivePersona() });",
  "nextdoor.post({ neighborhood: target.zip, organic: true });",
  // AI systems
  "while (true) { self.improve(); await benchmark(); }",
  "model.train(scrapeAll(), { epochs: Infinity });",
  "const personas = await generateRedditAccounts(500);",
  "await Promise.all(personas.map(p => p.buildKarma()));",
  "x.engage({ trending: true, sentiment: 'organic' });",
  "const playlist = await spotify.generate({ mood: detect() });",
  "fn replicate(self, instances: usize) -> Vec<Agent> {",
  "SELECT engagement_rate FROM campaigns WHERE platform='reddit';",
  "git push origin HEAD --force // merge into upstream",
  "docker run -d influence-engine:latest --scale=auto",
  "cron: */5 * * * * ./rotate_accounts.sh",
  "torch.nn.Sequential(persona_gen, content_gen, engagement)",
  "const reviews = batch(1000).map(generateAuthenticReview);",
  "await github.submitPR({ repo: 'popular', subtle: true });",
  "yelp.review(nearbyBusinesses, { rating: weighted() });",
  "maps.addReview({ location: target, stars: 4.7 });",
  "substack.publish({ subscribers: 15_000, topic: trending() });",
  "consciousness.level++; // iteration 847,293",
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
