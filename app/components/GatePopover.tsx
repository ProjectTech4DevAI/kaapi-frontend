"use client";

import { createPortal } from "react-dom";
import { Button } from "@/app/components";
import { GatePopoverProps } from "@/app/lib/types/nav";

export default function GatePopover({
  name,
  description,
  anchorRect,
  onMouseEnter,
  onMouseLeave,
  onLogin,
}: GatePopoverProps) {
  return createPortal(
    <div
      className="fixed z-9999 w-72"
      style={{
        top: anchorRect.top - 40,
        left: anchorRect.right + 10,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Gradient banner */}
        <div
          className="h-24"
          style={{
            background:
              "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 30%, #c7d2fe 50%, #ddd6fe 70%, #fce7f3 100%)",
          }}
        />

        {/* Content */}
        <div className="px-4 pt-3 pb-4">
          <p className="text-[15px] font-semibold text-text-primary leading-snug">
            {name}
          </p>
          <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
            {description}
          </p>

          <div className="mt-4">
            <Button size="sm" onClick={onLogin}>
              Log in
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
