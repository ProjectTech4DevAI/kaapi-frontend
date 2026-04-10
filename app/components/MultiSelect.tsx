"use client";

import { useEffect, useRef, useState } from "react";
import { colors } from "@/app/lib/colors";

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  const remove = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== opt));
  };

  const unselected = options.filter((o) => !value.includes(o));

  return (
    <div ref={containerRef} className="relative">
      {/* Input box with tags */}
      <div
        className="min-h-[36px] w-full flex flex-wrap items-center gap-1.5 rounded-md border px-2.5 py-1.5 cursor-text"
        style={{
          borderColor: open ? colors.accent.primary : colors.border,
          backgroundColor: colors.bg.primary,
          outline: open ? `1px solid ${colors.accent.primary}` : "none",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Selected tags */}
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: colors.bg.secondary,
              color: colors.text.primary,
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {v}
            <button
              type="button"
              onClick={(e) => remove(v, e)}
              className="leading-none opacity-60 hover:opacity-100"
              style={{ color: colors.text.primary }}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}

        {/* Placeholder when nothing selected */}
        {value.length === 0 && (
          <span className="text-sm" style={{ color: colors.text.secondary }}>
            {placeholder ?? "Select options…"}
          </span>
        )}

        {/* Chevron */}
        <svg
          className="w-4 h-4 flex-shrink-0 ml-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: colors.text.secondary }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={open ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
          />
        </svg>
      </div>

      {/* Dropdown list */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md shadow-md overflow-auto max-h-52"
          style={{
            backgroundColor: colors.bg.primary,
            border: `1px solid ${colors.border}`,
          }}
        >
          {unselected.length === 0 ? (
            <p
              className="px-3 py-2 text-xs"
              style={{ color: colors.text.secondary }}
            >
              All options selected
            </p>
          ) : (
            unselected.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{ color: colors.text.primary }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.bg.secondary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
