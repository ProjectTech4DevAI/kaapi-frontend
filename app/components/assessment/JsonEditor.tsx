"use client";

import { useRef, useCallback, useId } from "react";
import { Button } from "@/app/components";
import {
  JSON_EDITOR_FONT_CLASSES,
  JSON_TOKEN_CLASSES,
} from "@/app/lib/assessment/constants";
import type { JsonEditorProps } from "@/app/lib/types/assessment";

function highlight(code: string): string {
  if (!code) return "";

  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const re =
    /("(?:\\.|[^"\\])*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  let result = "";
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(code)) !== null) {
    // punctuation / whitespace between tokens
    if (cursor < m.index) {
      result += `<span class="${JSON_TOKEN_CLASSES.punct}">${escHtml(code.slice(cursor, m.index))}</span>`;
    }

    if (m[1] !== undefined) {
      const isKey = !!m[2];
      result += `<span class="${isKey ? JSON_TOKEN_CLASSES.key : JSON_TOKEN_CLASSES.string}">${escHtml(m[1])}</span>`;
      if (m[2])
        result += `<span class="${JSON_TOKEN_CLASSES.punct}">${escHtml(m[2])}</span>`;
      cursor = m.index + m[0].length;
    } else if (m[3] !== undefined) {
      result += `<span class="${m[3] === "null" ? JSON_TOKEN_CLASSES.null : JSON_TOKEN_CLASSES.boolean}">${escHtml(m[3])}</span>`;
      cursor = m.index + m[3].length;
    } else if (m[4] !== undefined) {
      result += `<span class="${JSON_TOKEN_CLASSES.number}">${escHtml(m[4])}</span>`;
      cursor = m.index + m[4].length;
    }
  }

  if (cursor < code.length) {
    result += `<span class="${JSON_TOKEN_CLASSES.punct}">${escHtml(code.slice(cursor))}</span>`;
  }

  return result;
}

export default function JsonEditor({
  value,
  onChange,
  error,
  isValid,
  placeholder,
  minHeight = 400,
}: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const textareaId = useId();
  const errorId = `${textareaId}-error`;

  const syncScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const s = el.selectionStart;
      const newVal =
        value.substring(0, s) + "  " + value.substring(el.selectionEnd);
      onChange(newVal);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 2;
      });
      return;
    }
    const pairs: Record<string, string> = { "{": "}", "[": "]" };
    if (pairs[e.key]) {
      const el = e.currentTarget;
      const s = el.selectionStart;
      if (s === el.selectionEnd) {
        e.preventDefault();
        const newVal =
          value.substring(0, s) + e.key + pairs[e.key] + value.substring(s);
        onChange(newVal);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = s + 1;
        });
      }
    }
  };

  const borderColor = error
    ? "border-status-error/40"
    : isValid && value.trim()
      ? "border-status-success/35"
      : "border-border";
  const minHeightClass = minHeight === 420 ? "min-h-[420px]" : "min-h-[400px]";
  const statusClass = error
    ? "bg-status-error-bg text-status-error-text"
    : isValid
      ? "bg-status-success-bg text-status-success-text"
      : "";

  return (
    <div className={`overflow-hidden rounded-xl border ${borderColor}`}>
      {/* Minimal top bar */}
      <div className="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`${JSON_EDITOR_FONT_CLASSES} text-[11px] text-text-secondary`}
          >
            JSON
          </span>
          {value.trim() && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${statusClass}`}
            >
              {error ? "Invalid" : isValid ? "Valid" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span
              id={errorId}
              role="alert"
              aria-live="polite"
              className="max-w-xs truncate text-[11px] text-status-error"
            >
              {error}
            </span>
          )}
          {value.trim() && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="!px-2 !py-1 !text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className={`relative overflow-auto bg-bg-primary ${minHeightClass}`}>
        {/* Placeholder */}
        {!value && placeholder && (
          <pre
            aria-hidden
            className={`pointer-events-none absolute inset-0 z-0 m-0 px-5 py-4 text-border ${JSON_EDITOR_FONT_CLASSES}`}
          >
            {placeholder}
          </pre>
        )}

        {/* Highlighted layer */}
        <pre
          ref={preRef}
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-10 m-0 overflow-hidden whitespace-pre break-normal px-5 py-4 ${JSON_EDITOR_FONT_CLASSES} ${minHeightClass}`}
          dangerouslySetInnerHTML={{ __html: highlight(value) + "\n" }}
        />

        {/* Editable layer */}
        <textarea
          id={textareaId}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="JSON editor"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`relative z-20 block w-full resize-none border-none bg-transparent px-5 py-4 text-transparent outline-none caret-text-primary whitespace-pre break-normal ${JSON_EDITOR_FONT_CLASSES} ${minHeightClass}`}
        />
      </div>
    </div>
  );
}
