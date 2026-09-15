"use client";

import { ReactNode, useCallback, useRef, useState } from "react";

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  /** Left pane width as a percentage; clamped to MIN..MAX. */
  defaultLeftPercent?: number;
  label?: string;
}

const MIN_PERCENT = 28;
const MAX_PERCENT = 72;
const KEY_STEP = 4;

const clamp = (value: number) =>
  Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));

/**
 * Two panes with a draggable divider. Stacks vertically below `lg`, where a
 * horizontal split has no room. Keyboard-resizable via the divider's arrow keys.
 */
export default function SplitPane({
  left,
  right,
  defaultLeftPercent = 52,
  label = "Resize panes",
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(clamp(defaultLeftPercent));
  const [isDragging, setIsDragging] = useState(false);

  const resizeTo = useCallback((clientX: number) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;
    setLeftPercent(clamp(((clientX - bounds.left) / bounds.width) * 100));
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging) resizeTo(event.clientX);
    },
    [isDragging, resizeTo],
  );

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      setLeftPercent((current) => clamp(current - KEY_STEP));
    } else if (event.key === "ArrowRight") {
      setLeftPercent((current) => clamp(current + KEY_STEP));
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ ["--split-left" as string]: `${leftPercent}%` }}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
    >
      <div className="flex min-h-[60vh] flex-1 flex-col overflow-hidden lg:min-h-0 lg:w-[var(--split-left)] lg:flex-none">
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={Math.round(leftPercent)}
        aria-valuemin={MIN_PERCENT}
        aria-valuemax={MAX_PERCENT}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => setIsDragging(false)}
        onKeyDown={onKeyDown}
        className={`hidden w-[5px] shrink-0 cursor-col-resize transition-colors focus-visible:bg-accent-primary lg:block ${
          isDragging ? "bg-accent-primary" : "bg-border hover:bg-accent-muted"
        }`}
      />

      <div className="flex min-h-[60vh] flex-1 flex-col overflow-hidden border-t border-border lg:min-h-0 lg:border-t-0">
        {right}
      </div>
    </div>
  );
}
