import { useEffect, useState } from "react";

export function HexStream() {
  const [hexLines, setHexLines] = useState<string[]>([]);

  useEffect(() => {
    const generateHexLine = () => {
      const addr = Math.floor(Math.random() * 0xfffff)
        .toString(16)
        .padStart(5, "0");
      const bytes = Array(8)
        .fill(0)
        .map(() =>
          Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, "0"),
        )
        .join(" ");
      return `0x${addr}: ${bytes}`;
    };

    const initialLines = Array(12)
      .fill(0)
      .map(() => generateHexLine());
    setHexLines(initialLines);

    const interval = setInterval(() => {
      setHexLines((prev) => {
        const next = [...prev, generateHexLine()];
        return next.slice(-12);
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.7)",
        border: "1px solid rgba(0, 255, 65, 0.2)",
        borderRadius: "2px",
        padding: "6px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: "7px",
          color: "#00ff41",
          opacity: 0.5,
          marginBottom: "4px",
        }}
      >
        ▸ DATA EXFILTRATION STREAM
      </div>
      {hexLines.map((line, i) => (
        <div
          key={`${i}-${line}`}
          style={{
            fontSize: "8px",
            lineHeight: "1.4",
            color: "#00ff41",
            opacity: 0.3 + (i / hexLines.length) * 0.7,
            fontFamily: "'Courier New', monospace",
            whiteSpace: "nowrap",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
