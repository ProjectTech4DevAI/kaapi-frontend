"use client";

import { ReactNode } from "react";

export interface RadioGroupOption<T extends string = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
}

export interface RadioGroupProps<T extends string = string> {
  options: RadioGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * ```tsx
 * <RadioGroup<"batch" | "fast">
 *   value={runMode}
 *   onChange={setRunMode}
 *   options={[
 *     { value: "batch", label: "Batch" },
 *     { value: "fast",  label: "Fast" },
 *   ]}
 * />
 * ```
 */
export default function RadioGroup<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  className = "",
}: RadioGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex rounded-full p-1 bg-accent-primary/10 ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const isDisabled = disabled || opt.disabled;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-selected={isSelected}
            onClick={() => onChange(opt.value)}
            disabled={isDisabled}
            title={opt.title}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer text-accent-primary/70 hover:text-accent-primary data-[selected=true]:bg-accent-primary data-[selected=true]:text-white data-[selected=true]:shadow-[0_1px_2px_rgba(0,0,0,0.12)] data-[selected=true]:hover:bg-accent-hover disabled:cursor-not-allowed disabled:text-text-secondary/40 disabled:hover:text-white"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
