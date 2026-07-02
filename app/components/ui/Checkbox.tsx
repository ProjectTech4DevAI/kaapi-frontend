"use client";

import { CheckboxAccent, CheckboxProps } from "@/app/lib/types/ui";

const ACCENT_CLASS: Record<CheckboxAccent, string> = {
  primary: "",
  success: "accent-status-success",
  error: "accent-status-error-text",
};

export default function Checkbox({
  checked,
  onChange,
  label,
  description,
  accent = "primary",
  disabled = false,
  className = "",
  inputClassName = "",
  ...inputProps
}: CheckboxProps) {
  const inputEl = (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className={`w-4 h-4 rounded shrink-0 ${ACCENT_CLASS[accent]} ${inputClassName}`}
      {...inputProps}
    />
  );

  if (!label && !description) return inputEl;

  return (
    <label
      className={`inline-flex items-start gap-2.5 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}
    >
      <span className="flex items-center h-5 shrink-0">{inputEl}</span>
      <span className="leading-tight">
        {label && <span className="text-sm text-text-primary">{label}</span>}
        {description && (
          <span className="block text-xs text-text-secondary mt-0.5">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
