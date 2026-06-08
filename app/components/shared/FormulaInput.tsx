"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useAtMention } from "@/app/lib/hooks/useAtMention";

interface FormulaInputProps {
  value: string;
  onChange: (v: string) => void;
  columns: string[];
  placeholder?: string;
  className?: string;
  showOperators?: boolean;
}

const OPERATORS: {
  label: string;
  insert: string;
  caretBack?: number;
  title: string;
}[] = [
  { label: "+", insert: " + ", title: "Add" },
  { label: "−", insert: " - ", title: "Subtract" },
  { label: "×", insert: " * ", title: "Multiply" },
  { label: "÷", insert: " / ", title: "Divide" },
  { label: "( )", insert: "()", caretBack: 1, title: "Group / precedence" },
];

export default function FormulaInput({
  value,
  onChange,
  columns,
  placeholder = "@Column_A + @Column_B",
  className = "",
  showOperators = true,
}: FormulaInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);

  const { state, options, onInput, insert, onKeyDown } = useAtMention({
    columns,
    inputRef: inputRef as React.RefObject<
      HTMLInputElement | HTMLTextAreaElement
    >,
    mirrorRef,
    dropdownRef,
  });

  useLayoutEffect(() => {
    if (state.query !== null && state.pos && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setRect({
        top: r.top + state.pos.top,
        left: r.left + Math.max(0, state.pos.left),
      });
    } else {
      setRect(null);
    }
  }, [state.query, state.pos]);

  const insertAtCursor = (text: string, caretBack = 0) => {
    const el = inputRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const next = `${value.slice(0, cursor)}${text}${value.slice(cursor)}`;
    onChange(next);
    const nextCursor = cursor + text.length - caretBack;
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  return (
    <div className="w-full">
      {showOperators && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center overflow-hidden rounded-lg border border-border">
            {OPERATORS.map((op, idx) => (
              <button
                key={op.label}
                type="button"
                title={op.title}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertAtCursor(op.insert, op.caretBack);
                }}
                className={`px-3 py-1.5 font-mono text-sm text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary active:bg-accent-primary/15 active:text-accent-primary ${
                  idx > 0 ? "border-l border-border" : ""
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-text-secondary">
            or type{" "}
            <code className="rounded bg-bg-secondary px-1 py-0.5 font-mono text-accent-primary">
              @
            </code>{" "}
            to insert a column
          </span>
        </div>
      )}

      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setTimeout(() => {
              const el = inputRef.current;
              if (el)
                onInput(
                  e.target.value,
                  el.selectionStart ?? e.target.value.length,
                );
            }, 0);
          }}
          onKeyDown={(e) => onKeyDown(e, value, onChange)}
          onSelect={() => {
            const el = inputRef.current;
            if (el) onInput(value, el.selectionStart ?? value.length);
          }}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 ${className}`}
        />
        <div ref={mirrorRef} aria-hidden="true" />
      </div>

      {typeof document !== "undefined" &&
        state.query !== null &&
        options.length > 0 &&
        rect &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[1000] overflow-y-auto rounded-xl border border-border bg-bg-primary shadow-lg"
            style={{
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              minWidth: "200px",
              maxHeight: "180px",
            }}
          >
            {options.map((col, idx) => (
              <button
                key={col}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-sm text-text-primary hover:bg-bg-secondary ${
                  idx === state.index ? "bg-bg-secondary" : "bg-bg-primary"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insert(col, value, onChange);
                }}
              >
                <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs font-sans text-text-secondary">
                  @
                </span>
                {col}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
