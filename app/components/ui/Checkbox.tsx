"use client";

import { InputHTMLAttributes, ReactNode } from "react";

type CheckboxAccent = "primary" | "success" | "error";

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "checked"
> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Optional label rendered to the right of the box. Omit to render just the input (e.g. inside list rows whose parent handles the click). */
  label?: ReactNode;
  /** Optional secondary text below the label. */
  description?: ReactNode;
  /** Accent colour for the checked state. Defaults to `primary`. */
  accent?: CheckboxAccent;
  disabled?: boolean;
  /** Extra classes on the outer `<label>` wrapper. */
  className?: string;
  /** Extra classes on the `<input>` itself. */
  inputClassName?: string;
}

const ACCENT_CLASS: Record<CheckboxAccent, string> = {
  // Browser default uses the page's accent (blue) so no override needed.
  primary: "",
  success: "accent-status-success",
  error: "accent-status-error-text",
};

/**
 * Single shared checkbox. Replaces the duplicated `<label><input type="checkbox" .../>label</label>`
 * pattern used in onboarding, credential, guardrail, and KB forms.
 *
 * Usage:
 *   <Checkbox checked={isActive} onChange={setIsActive} label="Active" />
 *   <Checkbox checked={hard} onChange={setHard} accent="error" label="Permanently delete" />
 *   <Checkbox checked={picked} onChange={onPick} inputClassName="mr-3" />  // bare input
 */
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
