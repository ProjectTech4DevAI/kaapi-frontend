"use client";

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span className="relative inline-flex items-center ml-1 align-text-bottom group">
      <button
        type="button"
        className="w-3.5 h-3.5 rounded-full text-[10px] font-bold flex items-center justify-center leading-none select-none bg-bg-secondary text-text-secondary border border-border"
      >
        i
      </button>
      <div className="absolute z-50 left-5 top-0 w-64 text-xs rounded-lg p-2.5 shadow-lg bg-bg-primary border border-border text-text-secondary leading-relaxed hidden group-hover:block">
        {text}
      </div>
    </span>
  );
}
