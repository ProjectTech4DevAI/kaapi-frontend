"use client";

import { useState } from "react";
import { colors } from "@/app/lib/colors";

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1" style={{ verticalAlign: 'text-bottom' }}>
      <button
        type="button"
        className="w-3.5 h-3.5 rounded-full text-[10px] font-bold flex items-center justify-center leading-none select-none"
        style={{
          backgroundColor: colors.bg.secondary,
          color: colors.text.secondary,
          border: `1px solid ${colors.border}`,
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        i
      </button>
      {visible && (
        <div
          className="absolute z-50 left-5 top-0 w-64 text-xs rounded-lg p-2.5 shadow-lg"
          style={{
            backgroundColor: colors.bg.primary,
            border: `1px solid ${colors.border}`,
            color: colors.text.secondary,
            lineHeight: "1.5",
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
