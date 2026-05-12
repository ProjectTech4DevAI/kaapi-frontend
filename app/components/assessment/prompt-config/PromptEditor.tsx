"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/app/components";
import type { SampleRow, ValueSetter } from "@/app/lib/types/assessment";

interface PromptEditorProps {
  value: string;
  onChange: ValueSetter<string>;
  previewMode: boolean;
  placeholder: string;
  emptyPreviewText: string;
  textColumns?: string[];
  sampleRow?: SampleRow;
  enablePlaceholders?: boolean;
}

export default function PromptEditor({
  value,
  onChange,
  previewMode,
  placeholder,
  emptyPreviewText,
  textColumns = [],
  sampleRow = {},
  enablePlaceholders = true,
}: PromptEditorProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const mentionOptions = useMemo(() => {
    if (!enablePlaceholders || mentionQuery === null) return [];
    const normalized = mentionQuery.toLowerCase();
    return textColumns.filter((col) => col.toLowerCase().includes(normalized));
  }, [enablePlaceholders, mentionQuery, textColumns]);

  const computeCaretPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) return null;

    const style = window.getComputedStyle(textarea);
    [
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "letter-spacing",
      "padding-top",
      "padding-left",
      "padding-right",
      "padding-bottom",
      "border-top-width",
      "border-left-width",
      "word-wrap",
      "overflow-wrap",
      "tab-size",
      "box-sizing",
    ].forEach((prop) => {
      mirror.style.setProperty(prop, style.getPropertyValue(prop));
    });
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.left = "0";
    mirror.style.top = "0";

    mirror.textContent = textarea.value.substring(0, textarea.selectionStart);
    const marker = document.createElement("span");
    marker.textContent = "​";
    mirror.appendChild(marker);

    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    return {
      top:
        markerRect.top -
        mirrorRect.top -
        textarea.scrollTop +
        parseInt(style.lineHeight, 10) +
        6,
      left: markerRect.left - mirrorRect.left,
    };
  }, []);

  const closeMention = useCallback(() => {
    setMentionQuery(null);
    setMentionStart(null);
    setMentionPos(null);
  }, []);

  const handleInput = useCallback(() => {
    if (!enablePlaceholders) {
      closeMention();
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const editorValue = textarea.value;
    let index = cursor - 1;
    while (
      index >= 0 &&
      editorValue[index] !== "@" &&
      editorValue[index] !== " " &&
      editorValue[index] !== "\n" &&
      editorValue[index] !== "\t"
    ) {
      index -= 1;
    }
    if (index >= 0 && editorValue[index] === "@") {
      setMentionQuery(editorValue.substring(index + 1, cursor));
      setMentionStart(index);
      setMentionIndex(0);
      setMentionPos(computeCaretPosition());
      return;
    }
    closeMention();
  }, [closeMention, computeCaretPosition, enablePlaceholders]);

  const insertMention = useCallback(
    (column: string) => {
      const textarea = textareaRef.current;
      if (!textarea || mentionStart === null) return;
      const cursor = textarea.selectionStart;
      const nextValue = `${value.substring(0, mentionStart)}{${column}}${value.substring(cursor)}`;
      const nextCursor = mentionStart + column.length + 2;
      onChange(nextValue);
      closeMention();
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      }, 0);
    },
    [closeMention, mentionStart, onChange, value],
  );

  const insertPlaceholder = (column: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}{${column}}${value.slice(end)}`;
    const nextCursor = start + column.length + 2;
    onChange(nextValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        !enablePlaceholders ||
        mentionQuery === null ||
        mentionOptions.length === 0
      )
        return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionOptions.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex(
          (prev) => (prev - 1 + mentionOptions.length) % mentionOptions.length,
        );
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(mentionOptions[mentionIndex]);
      } else if (event.key === "Escape") {
        closeMention();
      }
    },
    [
      closeMention,
      enablePlaceholders,
      insertMention,
      mentionIndex,
      mentionOptions,
      mentionQuery,
    ],
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        textareaRef.current &&
        !textareaRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        closeMention();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [closeMention]);

  useEffect(() => {
    if (dropdownRef.current && mentionOptions.length > 0) {
      const active = dropdownRef.current.children[mentionIndex] as
        | HTMLElement
        | undefined;
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [mentionIndex, mentionOptions.length]);

  useEffect(() => {
    if (previewMode || !enablePlaceholders) {
      closeMention();
    }
  }, [closeMention, enablePlaceholders, previewMode]);

  const usedColumns = useMemo(
    () => textColumns.filter((col) => value.includes(`{${col}}`)),
    [textColumns, value],
  );

  const orderedColumns = useMemo(() => {
    const used = textColumns.filter((col) => usedColumns.includes(col));
    const unused = textColumns.filter((col) => !usedColumns.includes(col));
    return [...used, ...unused];
  }, [textColumns, usedColumns]);

  const previewText = useMemo(() => {
    if (!value.trim()) return "";
    if (!enablePlaceholders) return value;

    let next = value;
    textColumns.forEach((col) => {
      const safe = col.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      next = next.replace(
        new RegExp(`\\{${safe}\\}`, "g"),
        sampleRow[col] || "",
      );
    });
    return next;
  }, [enablePlaceholders, sampleRow, textColumns, value]);

  if (previewMode) {
    return (
      <div className="h-[260px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-bg-secondary px-4 py-3 text-sm leading-7 text-text-primary">
        {!value.trim() ? (
          <span className="text-text-secondary">{emptyPreviewText}</span>
        ) : enablePlaceholders && Object.keys(sampleRow).length === 0 ? (
          <span className="text-text-secondary">
            Sample data not available. Go back to Datasets and choose a row with
            values.
          </span>
        ) : (
          previewText || (
            <span className="text-text-secondary">{emptyPreviewText}</span>
          )
        )}
      </div>
    );
  }

  return (
    <>
      {enablePlaceholders && (
        <div className="mb-3">
          <div className="mb-2 text-xs text-text-secondary">
            Use `@` or tap a column chip to insert placeholders.
          </div>
          <div className="flex flex-wrap gap-2">
            {orderedColumns.map((col) => {
              const isUsed = usedColumns.includes(col);
              return (
                <Button
                  key={col}
                  type="button"
                  variant={isUsed ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => insertPlaceholder(col)}
                  className={`!rounded-full !px-3 !py-1.5 !font-mono !text-xs ${
                    isUsed
                      ? "!border-status-success-border !bg-status-success-bg !text-status-success-text"
                      : "!bg-bg-primary"
                  }`}
                >
                  {`{${col}}`}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative rounded-xl border border-border bg-bg-primary px-4 py-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setTimeout(handleInput, 0);
          }}
          onKeyDown={handleKeyDown}
          onSelect={handleInput}
          placeholder={placeholder}
          className="min-h-[260px] w-full resize-y border-0 bg-transparent px-0 py-0 text-sm leading-7 text-text-primary outline-none"
        />
        <div ref={mirrorRef} aria-hidden="true" />

        {mentionQuery !== null && mentionOptions.length > 0 && mentionPos && (
          <div
            ref={dropdownRef}
            className="absolute z-50 overflow-hidden rounded-xl border border-border bg-bg-primary shadow-lg"
            style={{
              top: `${mentionPos.top + 16}px`,
              left: `${Math.max(16, Math.min(mentionPos.left + 16, 320))}px`,
              minWidth: "220px",
              maxHeight: "180px",
              overflowY: "auto",
            }}
          >
            {mentionOptions.map((col, idx) => (
              <Button
                key={col}
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                className={`!justify-start !rounded-none !px-3 !py-2 !text-left !font-mono !text-sm !text-text-primary ${
                  idx === mentionIndex ? "!bg-bg-secondary" : "!bg-bg-primary"
                }`}
                onMouseEnter={() => setMentionIndex(idx)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(col);
                }}
              >
                <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs font-sans text-text-secondary">
                  @
                </span>
                {col}
              </Button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
