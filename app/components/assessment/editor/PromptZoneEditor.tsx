"use client";

import { splitTokens } from "@/app/lib/assessment/promptTokens";
import { usePromptMentions } from "@/app/hooks/usePromptMentions";
import MentionDropdown from "./MentionDropdown";
import type { PromptZoneEditorProps } from "@/app/lib/types/assessment";

const SEGMENT_CLASSES: Record<string, string> = {
  plain: "",
  text: "rounded bg-accent-subtle/40 text-accent-primary",
  attachment: "rounded bg-status-warning-bg text-status-warning-text",
  unknown:
    "rounded bg-status-warning-bg text-status-warning-text underline decoration-status-warning decoration-wavy",
};

const MARKER_CLASSES = {
  required: "text-status-error-text",
  optional: "text-accent-primary",
};

/** Where a marker's dropdown opens, in the editor's own coordinate space. */
function markerPosition(marker: HTMLElement): { top: number; left: number } {
  const host = marker.closest<HTMLElement>("[data-mention-host]");
  const rect = marker.getBoundingClientRect();
  const origin = host?.getBoundingClientRect() ?? { top: 0, left: 0 };
  return { top: rect.bottom - origin.top, left: rect.left - origin.left };
}

/**
 * A transparent textarea over a highlighted mirror, so tokens can be coloured
 * while the caret, selection and IME stay native (the layering `JsonEditor` uses).
 */
export default function PromptZoneEditor({
  value,
  onChange,
  placeholder,
  minHeight,
  enableMentions,
  columns,
  fieldTypes,
  fieldStrict,
  onFieldType,
  onFieldStrict,
  ariaLabel,
}: PromptZoneEditorProps) {
  const {
    inputRef,
    mirrorRef,
    dropdownRef,
    isOpen,
    position,
    activeIndex,
    pendingField,
    stage,
    columnOptions,
    typeOptions,
    strictOptions,
    onInput,
    onKeyDown,
    pickColumn,
    pickType,
    pickStrict,
    openStrictFor,
    scheduleHoverClose,
    cancelHoverClose,
    closeAll,
  } = usePromptMentions({
    columns,
    fieldTypes,
    fieldStrict,
    value,
    onChange,
    onFieldType,
    onFieldStrict,
  });

  const segments = splitTokens(value, columns, fieldTypes);
  const layer =
    "m-0 px-0 font-sans text-sm leading-5 whitespace-pre-wrap break-words";

  return (
    <div
      data-mention-host
      className="relative grid h-auto cursor-text"
      style={{ minHeight: `${minHeight}px` }}
      onClick={() => inputRef.current?.focus()}
    >
      {!value && (
        <pre
          aria-hidden="true"
          className={`${layer} col-start-1 row-start-1 text-text-secondary/70`}
        >
          {placeholder}
        </pre>
      )}

      <pre
        aria-hidden="true"
        className={`${layer} col-start-1 row-start-1 text-text-primary`}
      >
        {segments.map((segment, index) => (
          <span
            key={`${index}-${segment.text}`}
            className={SEGMENT_CLASSES[segment.kind]}
          >
            {segment.text}
          </span>
        ))}
        {"​"}
      </pre>

      <textarea
        ref={inputRef}
        value={value}
        aria-label={ariaLabel}
        spellCheck={false}
        onChange={(event) => {
          onChange(event.target.value);
          if (enableMentions) {
            onInput(event.target.value, event.target.selectionStart ?? 0);
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(closeAll, 150)}
        className={`${layer} col-start-1 row-start-1 z-10 h-full w-full resize-none overflow-hidden border-0 bg-transparent text-transparent caret-text-primary outline-none`}
      />

      {enableMentions && (
        <pre
          aria-hidden="true"
          className={`${layer} pointer-events-none col-start-1 row-start-1 z-20 text-transparent`}
        >
          {segments.map((segment, index) => {
            const key = `${index}-${segment.text}`;
            const name = segment.name;
            if (segment.kind === "plain" || !name) {
              return <span key={key}>{segment.text}</span>;
            }
            const strict = fieldStrict[name] ?? false;
            return (
              <span key={key} className="relative">
                {segment.text}
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={(event) =>
                    openStrictFor(
                      name,
                      markerPosition(event.currentTarget),
                      "hover",
                    )
                  }
                  onMouseLeave={scheduleHoverClose}
                  onClick={(event) =>
                    openStrictFor(
                      name,
                      markerPosition(event.currentTarget),
                      "click",
                    )
                  }
                  className={`pointer-events-auto absolute top-0.5 left-full ml-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-accent-subtle/60 font-sans text-xs leading-none font-bold ${
                    strict ? MARKER_CLASSES.required : MARKER_CLASSES.optional
                  }`}
                >
                  {/* The asterisk glyph sits high in its em box; pull it to the circle's centre. */}
                  <span className={strict ? "translate-y-[1.5px]" : undefined}>
                    {strict ? "*" : "?"}
                  </span>
                </button>
              </span>
            );
          })}
          {"​"}
        </pre>
      )}

      {/* Caret-measuring mirror — absolute so it never takes part in layout. */}
      <div ref={mirrorRef} aria-hidden="true" className="absolute" />

      {enableMentions && isOpen && (
        <MentionDropdown
          dropdownRef={dropdownRef}
          position={position}
          activeIndex={activeIndex}
          pendingField={pendingField}
          stage={stage}
          columnOptions={columnOptions}
          typeOptions={typeOptions}
          strictOptions={strictOptions}
          onPickColumn={pickColumn}
          onPickType={pickType}
          onPickStrict={pickStrict}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={scheduleHoverClose}
        />
      )}
    </div>
  );
}
