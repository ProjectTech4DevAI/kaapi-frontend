"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { colors } from "@/app/lib/colors";

interface PromptEditorStepProps {
  textColumns: string[];
  sampleRow: Record<string, string>;
  promptTemplate: string;
  setPromptTemplate: (template: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const MIN_EDITOR_WIDTH = 35;
const MAX_EDITOR_WIDTH = 72;

export default function PromptEditorStep({
  textColumns,
  sampleRow,
  promptTemplate,
  setPromptTemplate,
  onNext,
  onBack,
}: PromptEditorStepProps) {
  const [editorWidth, setEditorWidth] = useState(56);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const mentionOptions = useMemo(() => {
    if (mentionQuery === null) return [];
    const normalized = mentionQuery.toLowerCase();
    return textColumns.filter((column) =>
      column.toLowerCase().includes(normalized),
    );
  }, [mentionQuery, textColumns]);

  const computeCaretPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;

    if (!textarea || !mirror) return null;

    const style = window.getComputedStyle(textarea);
    const props = [
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
    ];

    props.forEach((prop) => {
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
    marker.textContent = "\u200b";
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
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const value = textarea.value;

    let index = cursor - 1;
    while (
      index >= 0 &&
      value[index] !== "@" &&
      value[index] !== " " &&
      value[index] !== "\n" &&
      value[index] !== "\t"
    ) {
      index -= 1;
    }

    if (index >= 0 && value[index] === "@") {
      setMentionQuery(value.substring(index + 1, cursor));
      setMentionStart(index);
      setMentionIndex(0);
      setMentionPos(computeCaretPosition());
      return;
    }

    closeMention();
  }, [closeMention, computeCaretPosition]);

  const insertMention = useCallback(
    (column: string) => {
      const textarea = textareaRef.current;
      if (!textarea || mentionStart === null) return;

      const cursor = textarea.selectionStart;
      const nextValue = `${promptTemplate.substring(0, mentionStart)}{${column}}${promptTemplate.substring(cursor)}`;
      const nextCursor = mentionStart + column.length + 2;

      setPromptTemplate(nextValue);
      closeMention();

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      }, 0);
    },
    [closeMention, mentionStart, promptTemplate, setPromptTemplate],
  );

  const insertPlaceholder = (column: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${promptTemplate.slice(0, start)}{${column}}${promptTemplate.slice(end)}`;
    const nextCursor = start + column.length + 2;

    setPromptTemplate(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionQuery === null || mentionOptions.length === 0) return;

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
    [closeMention, insertMention, mentionIndex, mentionOptions, mentionQuery],
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
    if (!isDraggingDivider) return;

    const handleMouseMove = (event: MouseEvent) => {
      const container = splitContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const percent = ((event.clientX - rect.left) / rect.width) * 100;
      setEditorWidth(
        Math.max(MIN_EDITOR_WIDTH, Math.min(MAX_EDITOR_WIDTH, percent)),
      );
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingDivider]);

  const usedColumns = useMemo(
    () =>
      textColumns.filter((column) => promptTemplate.includes(`{${column}}`)),
    [promptTemplate, textColumns],
  );

  const orderedColumns = useMemo(() => {
    const used = textColumns.filter((column) => usedColumns.includes(column));
    const unused = textColumns.filter(
      (column) => !usedColumns.includes(column),
    );
    return [...used, ...unused];
  }, [textColumns, usedColumns]);

  const previewText = useMemo(() => {
    if (!promptTemplate.trim()) {
      return "";
    }

    let next = promptTemplate;
    textColumns.forEach((column) => {
      const safeColumn = column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      next = next.replace(
        new RegExp(`\\{${safeColumn}\\}`, "g"),
        sampleRow[column] || "",
      );
    });
    return next;
  }, [promptTemplate, sampleRow, textColumns]);

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col">
      <div className="flex-1 space-y-3 pb-20">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: colors.text.primary }}
          >
            Prompt Editor
          </h2>
        </div>

        <div
          className="rounded-xl px-4 py-3"
          style={{ backgroundColor: colors.bg.secondary }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div
              className="text-sm font-medium"
              style={{ color: colors.text.primary }}
            >
              Columns
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {orderedColumns.map((column) => {
              const isUsed = usedColumns.includes(column);
              return (
                <button
                  key={column}
                  type="button"
                  onClick={() => insertPlaceholder(column)}
                  className="cursor-pointer rounded-full border px-3.5 py-2 text-sm font-mono font-xs transition-colors"
                  style={{
                    backgroundColor: isUsed
                      ? "rgba(22, 163, 74, 0.12)"
                      : colors.bg.primary,
                    borderColor: isUsed
                      ? "rgba(22, 163, 74, 0.3)"
                      : colors.border,
                    color: isUsed ? "#166534" : colors.text.primary,
                  }}
                >
                  {`{${column}}`}
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={splitContainerRef}
          className="flex flex-col lg:flex-row"
          style={{ minHeight: "520px" }}
        >
          <div
            className="flex min-h-[320px] flex-col"
            style={{ width: `${editorWidth}%` }}
          >
            <div className="px-0 py-2">
              <div
                className="text-sm font-semibold"
                style={{ color: colors.text.primary }}
              >
                Editor
              </div>
            </div>

            <div className="relative flex-1 pr-4">
              <textarea
                ref={textareaRef}
                value={promptTemplate}
                onChange={(event) => {
                  setPromptTemplate(event.target.value);
                  setTimeout(handleInput, 0);
                }}
                onKeyDown={handleKeyDown}
                onSelect={handleInput}
                placeholder={`Example:\nProblem:\n{Problem}\n\nSolution:\n{Solution}`}
                className="h-full min-h-[260px] w-full resize-none rounded-xl border p-4 text-sm font-mono outline-none"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                  color: colors.text.primary,
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                }}
              />

              <div ref={mirrorRef} aria-hidden="true" />

              {mentionQuery !== null &&
                mentionOptions.length > 0 &&
                mentionPos && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 overflow-hidden rounded-xl border shadow-lg"
                    style={{
                      top: `${mentionPos.top + 16}px`,
                      left: `${Math.max(16, Math.min(mentionPos.left + 16, 320))}px`,
                      backgroundColor: colors.bg.primary,
                      borderColor: colors.border,
                      minWidth: "220px",
                      maxHeight: "180px",
                      overflowY: "auto",
                    }}
                  >
                    {mentionOptions.map((column, index) => {
                      const isActive = index === mentionIndex;
                      return (
                        <button
                          key={column}
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-mono"
                          style={{
                            backgroundColor: isActive
                              ? colors.bg.secondary
                              : colors.bg.primary,
                            color: colors.text.primary,
                          }}
                          onMouseEnter={() => setMentionIndex(index)}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            insertMention(column);
                          }}
                        >
                          <span
                            className="rounded px-1.5 py-0.5 text-xs font-sans"
                            style={{
                              backgroundColor: colors.bg.secondary,
                              color: colors.text.secondary,
                            }}
                          >
                            @
                          </span>
                          {column}
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>

          <div
            className="hidden w-8 cursor-col-resize items-center justify-center lg:flex"
            style={{ backgroundColor: "transparent" }}
            onMouseDown={(event) => {
              event.preventDefault();
              setIsDraggingDivider(true);
            }}
          >
            <div
              className="h-full w-px"
              style={{ backgroundColor: colors.border }}
            />
          </div>

          <div className="min-h-[320px] flex-1">
            <div className="px-0 py-2 lg:pl-4">
              <div
                className="text-sm font-semibold"
                style={{ color: colors.text.primary }}
              >
                Preview
              </div>
            </div>

            <div className="h-full lg:pl-4">
              <div
                className="h-full min-h-[260px] whitespace-pre-wrap break-words rounded-xl border p-4 text-sm"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                  color: colors.text.primary,
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                }}
              >
                {!promptTemplate.trim() ? (
                  <span style={{ color: colors.text.secondary }}>
                    Preview will appear here.
                  </span>
                ) : Object.keys(sampleRow).length === 0 ? (
                  <span style={{ color: colors.text.secondary }}>
                    Sample data not available — go back to the Datasets tab,
                    re-select your dataset, and return here.
                  </span>
                ) : previewText ? (
                  previewText
                ) : (
                  <span style={{ color: colors.text.secondary }}>
                    Preview will appear here.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="sticky bottom-0 z-10 flex items-center justify-between border-t py-2"
        style={{
          backgroundColor: colors.bg.secondary,
          borderColor: colors.border,
          marginLeft: "-1.5rem",
          marginRight: "-1.5rem",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex cursor-pointer items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium"
          style={{
            borderColor: colors.border,
            color: colors.text.primary,
            backgroundColor: colors.bg.primary,
          }}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="cursor-pointer rounded-lg px-6 py-2.5 text-sm font-medium"
          style={{
            backgroundColor: colors.accent.primary,
            color: "#fff",
            border: `1px solid ${colors.accent.primary}`,
          }}
        >
          Next: Review
        </button>
      </div>
    </div>
  );
}
