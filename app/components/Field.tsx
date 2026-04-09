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
  className?: string;
}

export default function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  disabled = false,
  className = "",
}: FieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 rounded-lg border text-sm text-text-primary bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-accent-primary/20 focus:border-accent-primary transition-colors ${
            isPassword ? "pr-10" : ""
          } ${error ? "border-red-400" : "border-border"} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
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
