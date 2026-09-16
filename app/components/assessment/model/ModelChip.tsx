"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, GearIcon } from "@/app/components/icons";
import ModelPicker from "./ModelPicker";
import type { ModelChipProps } from "@/app/lib/types/assessment";

export default function ModelChip({
  step,
  selection,
  onModel,
  onParam,
}: ModelChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Choose the model for this step"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-accent-primary bg-accent-primary/[0.07] px-3.5 py-1.5 text-xs font-semibold text-accent-primary transition-colors hover:bg-accent-primary/[0.14]"
      >
        <GearIcon className="h-3.5 w-3.5" />
        <span className="text-[10px] tracking-wider uppercase opacity-75">
          Model
        </span>
        <b className="font-mono text-[12.5px] font-semibold">
          {selection.model}
        </b>
        <ChevronDownIcon className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-1.5">
          <ModelPicker
            step={step}
            selection={selection}
            onModel={onModel}
            onParam={onParam}
          />
        </div>
      )}
    </div>
  );
}
