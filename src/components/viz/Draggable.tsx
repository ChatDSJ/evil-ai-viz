import { useRef, useCallback, useState, type ReactNode } from "react";

interface DraggableProps {
  children: ReactNode;
  style?: React.CSSProperties;
  /** Extra className for the wrapper */
  className?: string;
  /** Base transform to compose with drag offset (e.g. "translate(-50%, -50%)") */
  baseTransform?: string;
}

/** Shared counter so the most-recently-grabbed pane always lands on top. */
let topZIndex = 100;

/**
 * Makes any absolutely-positioned widget draggable via mouse or touch.
 * Wraps children in a div that intercepts pointer events for dragging.
 * The wrapper inherits position:absolute and passes through all style props.
 *
 * - stopPropagation on all pointer events so global click handlers can't interfere
 * - Bring-to-front: every grab bumps the pane above all others
 * - Suppresses the synthetic click that follows a drag so phase-advance etc. don't fire
 */
export function Draggable({
  children,
  style,
  className,
  baseTransform = "",
}: DraggableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
    moved: boolean; // true if the pointer moved between down and up
  } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [localZ, setLocalZ] = useState<number | undefined>(undefined);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      dragging: true,
      moved: false,
    };

    // Bring this pane to the front
    topZIndex += 1;
    setLocalZ(topZIndex);

    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const state = dragState.current;
    if (!state?.dragging) return;

    state.moved = true;
    setOffset((prev) => ({
      x: prev.x + (e.clientX - state.startX),
      y: prev.y + (e.clientY - state.startY),
    }));
    // Update start position for next move delta
    state.startX = e.clientX;
    state.startY = e.clientY;
    e.stopPropagation();
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragState.current) {
      dragState.current.dragging = false;
    }
    setIsDragging(false);
    const el = ref.current;
    if (el) {
      el.releasePointerCapture(e.pointerId);
    }
    e.stopPropagation();
  }, []);

  /**
   * Suppress the click event that the browser fires after pointerup
   * so it doesn't bubble to global handlers (e.g. phase advance).
   */
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    // Always stop clicks from bubbling out of a Draggable pane
    e.stopPropagation();
  }, []);

  // Compose base transform with drag offset
  const dragTransform = `translate(${offset.x}px, ${offset.y}px)`;
  const fullTransform = baseTransform
    ? `${dragTransform} ${baseTransform}`
    : dragTransform;

  // Remove transform & zIndex from passed style to avoid conflict
  const { transform: _ignored, zIndex: _z, ...restStyle } = style || {};

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...restStyle,
        transform: fullTransform,
        zIndex: localZ ?? (style?.zIndex as number | undefined),
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}
