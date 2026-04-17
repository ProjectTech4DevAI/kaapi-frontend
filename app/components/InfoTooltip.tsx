"use client";

import {
  type ReactNode,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";

interface InfoTooltipProps {
  text: ReactNode;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [positioned, setPositioned] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let top = triggerRect.top - tooltipRect.height - 8;
    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

    // Keep tooltip within viewport horizontally
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }

    // If no room above, show below
    if (top < 8) {
      top = triggerRect.bottom + 8;
    }

    setPosition({ top, left });
    setPositioned(true);
  }, []);

  // useLayoutEffect to position before paint — prevents flash at (0,0)
  useLayoutEffect(() => {
    if (!visible) {
      setPositioned(false);
      return;
    }
    updatePosition();
  }, [visible, updatePosition]);

  return (
    <span className="inline-flex items-center ml-1 align-text-bottom">
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center leading-none select-none bg-neutral-200 text-neutral-600 border border-neutral-300 cursor-pointer hover:bg-neutral-300 hover:text-neutral-700 transition-colors"
      >
        i
      </button>
      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              top: position.top,
              left: position.left,
              visibility: positioned ? "visible" : "hidden",
            }}
            className="fixed z-9999 w-64 text-xs rounded-lg p-3 shadow-lg bg-neutral-900 text-neutral-100 leading-relaxed pointer-events-none"
          >
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}
