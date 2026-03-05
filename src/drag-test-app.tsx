/**
 * Minimal app for drag testing — renders Draggable panes immediately
 * without any boot sequence or Convex dependency.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Draggable } from "./components/viz/Draggable";

function DragTestApp() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#111",
        overflow: "hidden",
      }}
    >
      {[
        { left: 100, top: 100, color: "#1a3a1a", label: "Pane A" },
        { left: 400, top: 200, color: "#1a1a3a", label: "Pane B" },
        { left: 200, top: 350, color: "#3a1a1a", label: "Pane C" },
      ].map(({ left, top, color, label }) => (
        <Draggable
          key={label}
          style={{ position: "absolute", left, top }}
        >
          <div
            data-testid={`pane-${label.replace(" ", "-").toLowerCase()}`}
            style={{
              width: 200,
              height: 120,
              background: color,
              border: "1px solid #444",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#aaa",
              fontFamily: "monospace",
              fontSize: 14,
            }}
          >
            {label}
          </div>
        </Draggable>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DragTestApp />
  </StrictMode>
);
