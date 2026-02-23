export function ScanLines() {
  return (
    <>
      {/* CRT scan lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px)",
          pointerEvents: "none",
          zIndex: 90,
          opacity: 0.5,
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
          zIndex: 91,
        }}
      />
      {/* Horizontal scan line that moves */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 89,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.1), transparent)",
            animation: "scanMove 4s linear infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes scanMove {
          0% { top: -2px; }
          100% { top: 100%; }
        }
      `}</style>
    </>
  );
}
