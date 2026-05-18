"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@/app/components/icons";

export type MultiSelectOption = string | { value: string; label: string };

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

const getValue = (opt: MultiSelectOption) =>
  typeof opt === "string" ? opt : opt.value;
const getLabel = (opt: MultiSelectOption) =>
  typeof opt === "string" ? opt : opt.label;

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
}: MultiSelectProps) {
  const labelFor = (val: string) => {
    const match = options.find((o) => getValue(o) === val);
    return match ? getLabel(match) : val;
  };
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const DROPDOWN_MAX_HEIGHT = 208; // matches max-h-52
  const FLIP_MARGIN = 8;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - FLIP_MARGIN;
    const spaceAbove = rect.top - FLIP_MARGIN;
    if (spaceBelow >= DROPDOWN_MAX_HEIGHT || spaceBelow >= spaceAbove) {
      setPlacement("bottom");
    } else {
      setPlacement("top");
    }
  }, [open]);

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

  const unselected = options.filter((o) => !value.includes(getValue(o)));

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
            {labelFor(v)}
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
          className={`absolute left-0 right-0 z-50 w-full rounded-md shadow-md overflow-auto overscroll-contain max-h-52 bg-bg-primary border border-border ${
            placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {unselected.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-secondary">
              All options selected
            </p>
          ) : (
            unselected.map((opt) => {
              const optValue = getValue(opt);
              const optLabel = getLabel(opt);
              return (
                <button
                  key={optValue}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => toggle(optValue)}
                  onKeyDown={(e) => handleOptionKeyDown(e, optValue)}
                  className="w-full text-left px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-secondary focus:bg-bg-secondary focus:outline-none"
                >
                  {optLabel}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
