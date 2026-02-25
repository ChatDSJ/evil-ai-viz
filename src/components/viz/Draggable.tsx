import { useRef, useCallback, useState, type ReactNode } from "react";

interface DraggableProps {
  children: ReactNode;
  style?: React.CSSProperties;
  /** Extra className for the wrapper */
  className?: string;
  /** Base transform to compose with drag offset (e.g. "translate(-50%, -50%)") */
  baseTransform?: string;
}

/**
 * Makes any absolutely-positioned widget draggable via mouse or touch.
 * Wraps children in a div that intercepts pointer events for dragging.
 * The wrapper inherits position:absolute and passes through all style props.
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
  } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      dragging: true,
    };

    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const state = dragState.current;
    if (!state?.dragging) return;

    setOffset((prev) => ({
      x: prev.x + (e.clientX - state.startX),
      y: prev.y + (e.clientY - state.startY),
    }));
    // Update start position for next move delta
    state.startX = e.clientX;
    state.startY = e.clientY;
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
  }, []);

  // Compose base transform with drag offset
  const dragTransform = `translate(${offset.x}px, ${offset.y}px)`;
  const fullTransform = baseTransform
    ? `${dragTransform} ${baseTransform}`
    : dragTransform;

  // Remove transform from passed style to avoid conflict
  const { transform: _ignored, ...restStyle } = style || {};

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...restStyle,
        transform: fullTransform,
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
    </div>
  );
}
