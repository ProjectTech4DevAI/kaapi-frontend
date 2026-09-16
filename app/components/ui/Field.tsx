"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/app/components/icons";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  maxLength?: number;
  required?: boolean;
  rows?: number;
}

interface ControlProps extends Omit<FieldProps, "label" | "error"> {
  inputType: string;
  controlClass: string;
}

function FieldControl({
  value,
  onChange,
  placeholder,
  type,
  inputType,
  controlClass,
  disabled,
  autoFocus,
  maxLength,
  required,
  rows,
}: ControlProps) {
  const shared = {
    value,
    placeholder,
    disabled,
    autoFocus,
    maxLength,
    required,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
  };

  if (type === "textarea") {
    return (
      <textarea
        {...shared}
        rows={rows ?? 6}
        className={`${controlClass} font-mono resize-y`}
      />
    );
  }

  return <input {...shared} type={inputType} className={controlClass} />;
}

export default function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  disabled = false,
  autoFocus = false,
  className = "",
  maxLength,
  required,
  rows,
}: FieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;
  const controlClass = `w-full px-3 py-2 rounded-lg border text-sm text-text-primary bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-accent-primary/20 focus:border-accent-primary transition-colors ${
    isPassword ? "pr-10" : ""
  } ${error ? "border-red-400" : "border-border"} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`;

  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <FieldControl
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          inputType={inputType}
          controlClass={controlClass}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={maxLength}
          required={required}
          rows={rows}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
