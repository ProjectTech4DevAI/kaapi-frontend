"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@/app/components/icons";

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
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const remove = (opt: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== opt));
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      const first = listRef.current?.querySelector<HTMLButtonElement>("button");
      first?.focus();
    }
  };

  const handleOptionKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    opt: string,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      (e.currentTarget.nextElementSibling as HTMLButtonElement | null)?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = e.currentTarget
        .previousElementSibling as HTMLButtonElement | null;
      if (prev) {
        prev.focus();
      } else {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
  };

  const unselected = options.filter((o) => !value.includes(o));

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={`min-h-9 w-full flex flex-wrap items-center gap-1.5 rounded-md border px-2.5 py-1.5 cursor-pointer text-left bg-bg-primary transition-colors ${
          open
            ? "border-accent-primary ring-1 ring-accent-primary"
            : "border-border"
        }`}
      >
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-bg-secondary text-text-primary border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {v}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => remove(v, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") remove(v, e);
              }}
              className="leading-none opacity-60 hover:opacity-100 text-text-primary cursor-pointer"
              aria-label={`Remove ${v}`}
            >
              ×
            </span>
          </span>
        ))}

        {value.length === 0 && (
          <span className="text-sm text-text-secondary">
            {placeholder ?? "Select options…"}
          </span>
        )}

        {open ? (
          <ChevronUpIcon
            className="w-4 h-4 shrink-0 ml-auto text-text-secondary"
            aria-hidden="true"
          />
        ) : (
          <ChevronDownIcon
            className="w-4 h-4 shrink-0 ml-auto text-text-secondary"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 w-full rounded-md shadow-md overflow-auto max-h-52 bg-bg-primary border border-border"
        >
          {unselected.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-secondary">
              All options selected
            </p>
          ) : (
            unselected.map((opt) => (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => toggle(opt)}
                onKeyDown={(e) => handleOptionKeyDown(e, opt)}
                className="w-full text-left px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-secondary focus:bg-bg-secondary focus:outline-none"
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
