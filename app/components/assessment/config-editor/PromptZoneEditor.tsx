"use client";

import { useCallback, type KeyboardEvent } from "react";
import { Button } from "@/app/components/ui";
import { usePromptPlaceholderEditor } from "@/app/hooks/usePromptPlaceholderEditor";
import { TEMPLATE_TOKEN_CLASSES } from "@/app/lib/assessment/constants";
import { highlightTemplate } from "@/app/lib/utils/assessmentTemplate";
import type { ValueSetter } from "@/app/lib/types/assessment";

const EDITOR_FONT_CLASSES = "text-sm leading-7";

interface PromptZoneEditorProps {
  value: string;
  onChange: ValueSetter<string>;
  placeholder: string;
  minHeightClass?: string;
  // @-mentions: off for static zones (Instructions, pre-filter criteria).
  enableMentions?: boolean;
  // All @-selectable column names (dataset headers and/or declared fields).
  mentionColumns?: string[];
  // Fields currently typed as text (highlighted as valid tokens).
  knownTextFields?: string[];
  // Fields typed image/pdf: picking one attaches it instead of inserting a
  // {token} (the backend never substitutes attachment columns into text).
  attachmentFields?: string[];
  onPickAttachment?: (column: string) => void;
  // Free entry when the column isn't in the list (e.g. no reference dataset).
  onCreateField?: (column: string) => void;
}

export default function PromptZoneEditor({
  value,
  onChange,
  placeholder,
  minHeightClass = "min-h-[180px]",
  enableMentions = false,
  mentionColumns = [],
  knownTextFields = [],
  attachmentFields = [],
  onPickAttachment,
  onCreateField,
}: PromptZoneEditorProps) {
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
    replaceMentionWith,
  } = usePromptPlaceholderEditor({
    value,
    onChange,
    previewMode: false,
    textColumns: mentionColumns.filter((col) => col.trim() !== ""),
    enablePlaceholders: enableMentions,
  });

  const pick = useCallback(
    (column: string) => {
      if (attachmentFields.includes(column)) {
        replaceMentionWith("");
        onPickAttachment?.(column);
        return;
      }
      insertMention(column);
    },
    [attachmentFields, insertMention, onPickAttachment, replaceMentionWith],
  );

  const createQuery = (mentionQuery ?? "").trim();
  const hasExactMatch = mentionOptions.some(
    (col) => col.toLowerCase() === createQuery.toLowerCase(),
  );
  const showCreateOption =
    enableMentions &&
    !!onCreateField &&
    createQuery.length > 0 &&
    !hasExactMatch;

  const createField = useCallback(() => {
    insertMention(createQuery);
    onCreateField?.(createQuery);
  }, [createQuery, insertMention, onCreateField]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      enableMentions &&
      mentionQuery !== null &&
      (event.key === "Enter" || event.key === "Tab")
    ) {
      if (mentionOptions.length > 0) {
        event.preventDefault();
        pick(mentionOptions[mentionIndex]);
        return;
      }
      if (showCreateOption) {
        event.preventDefault();
        createField();
        return;
      }
    }
    handleKeyDown(event);
  };

  const showDropdown =
    enableMentions &&
    mentionQuery !== null &&
    mentionPos !== null &&
    (mentionOptions.length > 0 || showCreateOption);

  const layerClasses = `col-start-1 row-start-1 m-0 whitespace-pre-wrap break-words px-4 py-3 font-sans ${EDITOR_FONT_CLASSES} ${minHeightClass}`;

  return (
    <div className="relative rounded-xl border border-border bg-bg-primary">
      {/* Grid-stacked layers: the pre layers are in normal flow, so the
          tallest one (value highlight or the grey placeholder) sets the
          editor's height — it grows with the content and nothing truncates. */}
      <div className="grid rounded-xl">
        {/* Explicit grey placeholder layer: the textarea's text is transparent
            (the highlight layer paints it), so the native ::placeholder can't
            be relied on for a consistent grey across browsers. */}
        {!value && placeholder && (
          <pre
            aria-hidden
            className={`pointer-events-none z-10 text-text-secondary/70 ${layerClasses}`}
          >
            {placeholder}
          </pre>
        )}
        <pre
          aria-hidden
          className={`pointer-events-none z-10 text-text-primary ${layerClasses}`}
          dangerouslySetInnerHTML={{
            __html:
              highlightTemplate(
                value,
                knownTextFields,
                attachmentFields,
                TEMPLATE_TOKEN_CLASSES,
              ) + "\n",
          }}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setTimeout(handleInput, 0);
          }}
          onKeyDown={onKeyDown}
          onSelect={handleInput}
          aria-placeholder={placeholder}
          spellCheck={false}
          className={`z-20 block h-full w-full resize-none overflow-hidden border-0 bg-transparent text-transparent caret-text-primary outline-none ${layerClasses}`}
        />
        <div ref={mirrorRef} aria-hidden="true" />
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 overflow-hidden rounded-xl border border-border bg-bg-primary shadow-lg"
          style={{
            top: `${(mentionPos?.top ?? 0) + 16}px`,
            left: `${Math.max(16, Math.min((mentionPos?.left ?? 0) + 16, 320))}px`,
            minWidth: "220px",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {mentionOptions.map((col, idx) => {
            const isAttachment = attachmentFields.includes(col);
            return (
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
                  pick(col);
                }}
              >
                <span className="rounded bg-bg-secondary px-1.5 py-0.5 font-sans text-xs text-text-secondary">
                  {isAttachment ? "📎" : "@"}
                </span>
                {col}
                {isAttachment && (
                  <span className="ml-auto font-sans text-[10px] text-text-secondary">
                    attached
                  </span>
                )}
              </Button>
            );
          })}
          {showCreateOption && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              fullWidth
              className="!justify-start !rounded-none !px-3 !py-2 !text-left !text-sm !text-accent-primary"
              onMouseDown={(event) => {
                event.preventDefault();
                createField();
              }}
            >
              + Create field “{createQuery}”
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
