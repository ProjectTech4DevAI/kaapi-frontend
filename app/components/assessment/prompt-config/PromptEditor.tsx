"use client";

import { Button } from "@/app/components/ui";
import { usePromptPlaceholderEditor } from "@/app/hooks/usePromptPlaceholderEditor";
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
    insertPlaceholder,
    usedColumns,
    orderedColumns,
    previewText,
  } = usePromptPlaceholderEditor({
    value,
    onChange,
    previewMode,
    textColumns,
    sampleRow,
    enablePlaceholders,
  });

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
