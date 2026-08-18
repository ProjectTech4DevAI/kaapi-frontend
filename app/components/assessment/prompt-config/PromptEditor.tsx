"use client";

import { Button } from "@/app/components/ui";
import { usePromptPlaceholderEditor } from "@/app/hooks/usePromptPlaceholderEditor";
import type { ValueSetter } from "@/app/lib/types/assessment";

interface PromptEditorProps {
  value: string;
  onChange: ValueSetter<string>;
  previewMode: boolean;
  placeholder: string;
  emptyPreviewText: string;
  textColumns?: string[];
  enablePlaceholders?: boolean;
}

export default function PromptEditor({
  value,
  onChange,
  previewMode,
  placeholder,
  emptyPreviewText,
  textColumns = [],
  enablePlaceholders = true,
}: PromptEditorProps) {
  const {
    textareaRef,
    mirrorRef,
    dropdownRef,
    mentionQuery,
    mentionIndex,
    mentionPos,
    mentionOptions,
    setMentionIndex,
    handleInput,
    handleKeyDown,
    insertMention,
    previewText,
  } = usePromptPlaceholderEditor({
    value,
    onChange,
    previewMode,
    // Drop blank/whitespace column names so no empty `{}` placeholder or
    // duplicate-empty-key mention option is ever produced.
    textColumns: textColumns.filter((col) => col.trim() !== ""),
    enablePlaceholders,
  });

  if (previewMode) {
    return (
      <div className="h-[260px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-bg-secondary px-4 py-3 text-sm leading-7 text-text-primary">
        {previewText ? (
          previewText
        ) : (
          <span className="text-text-secondary">{emptyPreviewText}</span>
        )}
      </div>
    );
  }

  return (
    <>
      {enablePlaceholders && (
        <div className="mb-2 text-xs text-text-secondary">
          Type <span className="font-mono">@</span> to mention a column and
          insert it as a <span className="font-mono">{"{column}"}</span>{" "}
          placeholder.
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
