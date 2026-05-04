"use client";

import {
  ToggleOffIcon,
  ToggleOnIcon,
} from "@/app/components/icons/assessment/ToggleThumbIcons";
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
      className={`h-7 w-12 cursor-pointer flex-shrink-0 rounded-full border p-0.5 transition-colors ${
        checked
          ? "border-accent-primary bg-accent-primary"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <span className="relative flex h-full w-full items-center">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition-transform ${
            checked
              ? "translate-x-6 bg-white text-accent-primary"
              : "translate-x-0 bg-white text-neutral-500"
          }`}
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
