"use client";

import { colors } from "@/app/lib/colors";
import { ToggleOffIcon, ToggleOnIcon } from "./icons/ToggleThumbIcons";

interface CompactToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  title: string;
}

export default function CompactToggleSwitch({
  checked,
  onChange,
  title,
}: CompactToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      title={title}
      className="h-7 w-12 rounded-full border p-0.5 transition-colors flex-shrink-0 cursor-pointer"
      style={{
        backgroundColor: checked
          ? "rgba(23, 23, 23, 0.9)"
          : colors.bg.secondary,
        borderColor: checked ? "rgba(23, 23, 23, 0.9)" : colors.border,
      }}
    >
      <span className="relative flex h-full w-full items-center">
        <span
          className="h-5 w-5 rounded-full shadow-sm transition-transform flex items-center justify-center"
          style={{
            backgroundColor: checked ? "#ffffff" : colors.bg.primary,
            color: checked ? "#111111" : colors.text.secondary,
            transform: checked ? "translateX(24px)" : "translateX(0)",
          }}
        >
          {checked ? (
            <ToggleOnIcon className="h-3 w-3" />
          ) : (
            <ToggleOffIcon className="h-3 w-3" />
          )}
        </span>
      </span>
    </button>
  );
}
