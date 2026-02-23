import { useEffect, useState } from "react";

export function GlitchOverlay() {
  const [glitching, setGlitching] = useState(false);
  const [glitchBars, setGlitchBars] = useState<
    { top: number; height: number; offset: number; color: string }[]
  >([]);

  useEffect(() => {
    const triggerGlitch = () => {
      setGlitching(true);

      const bars = Array(Math.floor(3 + Math.random() * 8))
        .fill(0)
        .map(() => ({
          top: Math.random() * 100,
          height: 1 + Math.random() * 4,
          offset: (Math.random() - 0.5) * 30,
          color:
            Math.random() > 0.5
              ? `rgba(255, 0, 64, ${0.1 + Math.random() * 0.3})`
              : `rgba(0, 255, 65, ${0.1 + Math.random() * 0.2})`,
        }));
      setGlitchBars(bars);

      setTimeout(() => {
        setGlitching(false);
        setGlitchBars([]);
      }, 100 + Math.random() * 200);
    };

    // Random glitches
    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 12000;
      return setTimeout(() => {
        triggerGlitch();
        timerRef = scheduleNext();
      }, delay);
    };

    let timerRef = scheduleNext();

    return () => clearTimeout(timerRef);
  }, []);

  if (!glitching) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100,
        mixBlendMode: "screen",
      }}
    >
      {/* RGB shift */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px)",
          opacity: 0.8,
        }}
      />

      {/* Glitch bars */}
      {glitchBars.map((bar, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${bar.top}%`,
            left: `${bar.offset}%`,
            width: `${100 + Math.abs(bar.offset)}%`,
            height: `${bar.height}%`,
            background: bar.color,
            transform: `skewX(${(Math.random() - 0.5) * 5}deg)`,
          }}
        />
      ))}

      {/* Flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255, 255, 255, 0.02)",
        }}
      />
    </div>
  );
}
