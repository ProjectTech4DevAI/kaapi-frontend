"use client";

import type { ReactNode } from "react";

interface InfoTooltipProps {
  text: ReactNode;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span className="relative inline-flex items-center ml-1 align-text-bottom group">
      <button
        type="button"
        className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center leading-none select-none bg-neutral-200 text-neutral-600 border border-neutral-300 cursor-pointer hover:bg-neutral-300 hover:text-neutral-700 transition-colors"
      >
        i
      </button>
      <div
        role="tooltip"
        className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 text-xs rounded-lg p-3 shadow-lg bg-neutral-900 text-neutral-100 leading-relaxed hidden group-hover:block group-focus-within:block"
      >
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-neutral-900" />
      </div>
    </span>
  );
}
