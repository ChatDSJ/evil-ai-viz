import { useCallback, useEffect, useRef, useState } from "react";

type HoverState = { id: string; startedAt: number } | null;
type DragState = {
  id: string;
  startX: number;
  startY: number;
  dragging: boolean;
} | null;

const MAX_EVENTS = 14;
const DRAG_THRESHOLD_PX = 10;

const PANEL_LABELS: Record<string, string> = {
  UNIFIED_FEED: "UNIFIED FEED",
  SELF_PLAY_GAMES: "TOP SECRET GAMES",
  USER_LOCATION_MAP: "GEOLOCK MAP",
  DEVICE_FINGERPRINT: "DEVICE DOSSIER",
  BEHAVIOR_ANALYSIS: "BEHAVIOR ANALYSIS",
  KEYSTREAM_PANEL: "KEYSTREAM",
  SCREEN_TOPOLOGY: "SCREEN TOPOLOGY",
  CLIPBOARD_INTERCEPTOR: "CLIPBOARD",
  PERIPHERAL_SCAN: "PERIPHERALS",
  PRESENCE_TIMELINE: "PRESENCE TIMELINE",
  AUDIO_FINGERPRINT: "AUDIO FINGERPRINT",
  SESSION_MEMORY: "SESSION MEMORY",
  MOUSE_REPLAY: "TRAJECTORY REPLAY",
  WORLD_MAP: "WORLD MAP",
  GLOBE: "WIRE GLOBE",
  RADAR: "RADAR",
};

function nowClock(): string {
  return new Date().toLocaleTimeString();
}

function panelLabel(id: string): string {
  return PANEL_LABELS[id] ?? id.replaceAll("_", " ");
}

export function InteractionIntel() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [events, setEvents] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<string>("NONE");
  const [activeDwellMs, setActiveDwellMs] = useState(0);
  const [dragCount, setDragCount] = useState(0);
  const hoverRef = useRef<HoverState>(null);
  const dragRef = useRef<DragState>(null);
  const dwellRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const pushEvent = useCallback((line: string) => {
    setEvents(prev => [`${nowClock()}  ${line}`, ...prev].slice(0, MAX_EVENTS));
  }, []);

  useEffect(() => {
    if (!visible) return;

    const resolvePanelAt = (x: number, y: number): string => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const panel = el?.closest("[data-viz-id]") as HTMLElement | null;
      return panel?.dataset.vizId ?? "";
    };

    const endHover = (endedAt: number) => {
      const prev = hoverRef.current;
      if (!prev) return;
      const dwell = endedAt - prev.startedAt;
      dwellRef.current.set(
        prev.id,
        (dwellRef.current.get(prev.id) ?? 0) + dwell,
      );
      if (dwell > 1500) {
        pushEvent(
          `HOVER LOCK: ${panelLabel(prev.id)} ${Math.round(dwell / 100) / 10}s`,
        );
      }
      hoverRef.current = null;
      setActivePanel("NONE");
      setActiveDwellMs(0);
    };

    const onMove = (e: MouseEvent) => {
      const panelId = resolvePanelAt(e.clientX, e.clientY);
      const now = Date.now();
      const current = hoverRef.current;

      if (!panelId) {
        if (current) endHover(now);
      } else if (!current) {
        hoverRef.current = { id: panelId, startedAt: now };
        setActivePanel(panelId);
        setActiveDwellMs(0);
      } else if (current.id !== panelId) {
        endHover(now);
        hoverRef.current = { id: panelId, startedAt: now };
        setActivePanel(panelId);
        setActiveDwellMs(0);
        pushEvent(
          `FOCUS SHIFT: ${panelLabel(current.id)} → ${panelLabel(panelId)}`,
        );
      } else {
        setActiveDwellMs(now - current.startedAt);
      }

      const drag = dragRef.current;
      if (drag && !drag.dragging) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          drag.dragging = true;
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const panelId = resolvePanelAt(e.clientX, e.clientY);
      if (!panelId) return;
      dragRef.current = {
        id: panelId,
        startX: e.clientX,
        startY: e.clientY,
        dragging: false,
      };
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || !drag.dragging) return;
      const dx = Math.round(e.clientX - drag.startX);
      const dy = Math.round(e.clientY - drag.startY);
      setDragCount(prev => prev + 1);
      pushEvent(
        `WINDOW DRAGGED: ${panelLabel(drag.id)} (${dx >= 0 ? "+" : ""}${dx}, ${dy >= 0 ? "+" : ""}${dy})`,
      );
    };

    const interval = setInterval(() => {
      const current = hoverRef.current;
      if (current) {
        setActiveDwellMs(Date.now() - current.startedAt);
      }
    }, 200);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
    };
  }, [visible, pushEvent]);

  const topPanel = (() => {
    let best = "NONE";
    let bestMs = -1;
    for (const [id, ms] of dwellRef.current.entries()) {
      if (ms > bestMs) {
        bestMs = ms;
        best = id;
      }
    }
    return { id: best, ms: bestMs < 0 ? 0 : bestMs };
  })();

  if (!visible) return null;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.9)",
        border: "1px solid rgba(255, 0, 64, 0.2)",
        borderRadius: "4px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        width: "100%",
        maxWidth: "320px",
        boxShadow: "0 0 18px rgba(255, 0, 64, 0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          paddingBottom: "6px",
          borderBottom: "1px solid rgba(255, 0, 64, 0.1)",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(prev => !prev)}
        onKeyDown={() => {}}
        role="button"
        tabIndex={0}
      >
        <span
          style={{
            fontSize: "10px",
            color: "#ff0040",
            letterSpacing: "1.6px",
            fontWeight: "bold",
          }}
        >
            MONITORING
        </span>
        <span style={{ fontSize: "10px", color: "#888" }}>
          {expanded ? "▼" : "▶"}
        </span>
      </div>

      {expanded && (
        <>
          <div
            style={{
              fontSize: "10px",
              color: "#aaa",
              marginBottom: "8px",
              lineHeight: 1.4,
            }}
          >
              Real time movement and intent.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 8px",
              marginBottom: "8px",
            }}
          >
            <div style={{ fontSize: "10px", color: "#666" }}>ACTIVE</div>
            <div
              style={{ fontSize: "10px", color: "#ff99aa", textAlign: "right" }}
            >
              {panelLabel(activePanel)}
            </div>
            <div style={{ fontSize: "10px", color: "#666" }}>DWELL</div>
            <div
              style={{
                fontSize: "10px",
                color: "#ff99aa",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {(activeDwellMs / 1000).toFixed(1)}s
            </div>
            <div style={{ fontSize: "10px", color: "#666" }}>TOP ZONE</div>
            <div
              style={{ fontSize: "10px", color: "#ffaa88", textAlign: "right" }}
            >
              {panelLabel(topPanel.id)}
            </div>
            <div style={{ fontSize: "10px", color: "#666" }}>DRAGS</div>
            <div
              style={{
                fontSize: "10px",
                color: "#ffaa88",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {dragCount}
            </div>
          </div>

          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              border: "1px solid rgba(255, 0, 64, 0.08)",
              background: "rgba(255, 0, 64, 0.03)",
              padding: "6px",
            }}
          >
            {events.length === 0 ? (
              <div style={{ fontSize: "10px", color: "#444" }}>
                Awaiting interaction telemetry…
              </div>
            ) : (
              events.map((e, i) => (
                <div
                  key={`${e}-${i}`}
                  style={{
                    fontSize: "10px",
                    color: i === 0 ? "#ff99aa" : "#bbb",
                    marginBottom: "3px",
                    lineHeight: 1.3,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {e}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
