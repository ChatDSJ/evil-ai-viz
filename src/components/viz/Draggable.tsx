import { useRef, useCallback, useState, type ReactNode } from "react";

interface DraggableProps {
  children: ReactNode;
  style?: React.CSSProperties;
  /** Extra className for the wrapper */
  className?: string;
  /** Base transform to compose with drag offset (e.g. "translate(-50%, -50%)") */
  baseTransform?: string;
  /** If set, this pane stays at a fixed z-index even while dragging. */
  fixedZIndex?: number;
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
  fixedZIndex,
}: DraggableProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Track current offset in both state (for rendering) and a ref (for reading
  // inside callbacks without stale closures).
  const [offset, setOffsetState] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  function setOffset(v: { x: number; y: number }) {
    offsetRef.current = v;
    setOffsetState(v);
  }

  // Drag origin and offset captured at the moment the pointer goes down.
  const dragOrigin = useRef({ x: 0, y: 0 });
  const offsetAtDragStart = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [localZ, setLocalZ] = useState<number | undefined>(undefined);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;

    dragOrigin.current = { x: e.clientX, y: e.clientY };
    offsetAtDragStart.current = { ...offsetRef.current };
    isDraggingRef.current = true;

    if (fixedZIndex !== undefined) {
      setLocalZ(fixedZIndex);
    } else {
      // Bring this pane to the front
      topZIndex += 1;
      setLocalZ(topZIndex);
    }

    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    setOffset({
      x: offsetAtDragStart.current.x + (e.clientX - dragOrigin.current.x),
      y: offsetAtDragStart.current.y + (e.clientY - dragOrigin.current.y),
    });
    e.stopPropagation();
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    ref.current?.releasePointerCapture(e.pointerId);
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
        zIndex: fixedZIndex ?? localZ ?? (style?.zIndex as number | undefined),
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
