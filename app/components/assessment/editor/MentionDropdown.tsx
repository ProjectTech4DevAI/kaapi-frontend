"use client";

import { DocumentFileIcon, ImageIcon } from "@/app/components/icons";
import type {
  MentionDropdownProps,
  PromptFieldType,
} from "@/app/lib/types/assessment";

const TYPE_ICONS: Record<PromptFieldType, React.ReactNode> = {
  text: <span className="font-sans text-[11px] font-semibold">Aa</span>,
  image: <ImageIcon className="h-3.5 w-3.5" />,
  pdf: <DocumentFileIcon className="h-3.5 w-3.5" />,
};

const rowBase =
  "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm";
const eyebrow =
  "px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase text-text-secondary";

/** Stage 1 picks the column; stage 2 asks what it carries; stage 3 whether it may be blank. */
export default function MentionDropdown({
  dropdownRef,
  position,
  activeIndex,
  pendingField,
  stage,
  columnOptions,
  typeOptions,
  strictOptions,
  onPickColumn,
  onPickType,
  onPickStrict,
  onMouseEnter,
  onMouseLeave,
}: MentionDropdownProps) {
  if (!position) return null;

  return (
    <div
      ref={dropdownRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ top: position.top, left: position.left }}
      className="absolute z-40 max-h-52 min-w-[220px] overflow-y-auto rounded-xl border border-border bg-bg-primary shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      {stage === "type" && (
        <>
          <p className={eyebrow}>What is “{pendingField}”?</p>
          {typeOptions.map((option, index) => (
            <OptionRow
              key={option.type}
              active={index === activeIndex}
              badge={TYPE_ICONS[option.type]}
              label={option.label}
              isCurrent={option.isCurrent}
              onPick={() => onPickType(option.type)}
            />
          ))}
        </>
      )}

      {stage === "strict" && (
        <>
          <p className={eyebrow}>Is “{pendingField}” required?</p>
          {strictOptions.map((option, index) => (
            <OptionRow
              key={String(option.strict)}
              active={index === activeIndex}
              badge={
                <span className="font-sans text-[11px] font-semibold">
                  {option.strict ? "*" : "?"}
                </span>
              }
              label={option.label}
              hint={option.hint}
              isCurrent={option.isCurrent}
              onPick={() => onPickStrict(option.strict)}
            />
          ))}
        </>
      )}

      {!stage &&
        columnOptions.map((option, index) => (
          <button
            key={`${option.name}-${option.isCreate}`}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onPickColumn(option);
            }}
            className={`${rowBase} ${
              index === activeIndex ? "bg-bg-secondary" : ""
            } ${option.isCreate ? "text-accent-primary" : "text-text-primary"}`}
          >
            {option.isCreate ? (
              <span>+ Create field “{option.name}”</span>
            ) : (
              <>
                <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs text-text-secondary">
                  @
                </span>
                <span className="truncate font-mono text-[13px]">
                  {option.name}
                </span>
                {option.type !== "text" && (
                  <span className="ml-auto text-[10px] text-text-secondary">
                    attached
                  </span>
                )}
              </>
            )}
          </button>
        ))}
    </div>
  );
}

function OptionRow({
  active,
  badge,
  label,
  hint,
  isCurrent,
  onPick,
}: {
  active: boolean;
  badge: React.ReactNode;
  label: string;
  hint?: string;
  isCurrent: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onPick();
      }}
      className={`${rowBase} ${active ? "bg-bg-secondary" : ""}`}
    >
      <span className="flex h-5 w-6 items-center justify-center rounded bg-bg-secondary text-text-secondary">
        {badge}
      </span>
      <span className="text-text-primary">{label}</span>
      {hint && <span className="text-[11px] text-text-secondary">{hint}</span>}
      {isCurrent && (
        <span className="ml-auto text-[10px] text-text-secondary">current</span>
      )}
    </button>
  );
}
