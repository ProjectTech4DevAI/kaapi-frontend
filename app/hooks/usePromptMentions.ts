"use client";

/**
 * Three-stage `@`-mentions for the prompt zones. Stage 1 suggests submission
 * columns (with a "create field" escape hatch); picking one asks its type — Text /
 * Image / PDF — and then whether a row may leave it blank, because those two
 * choices define the input schema. Stage 1 reuses useAtMention for trigger
 * detection, caret placement and insertion; stages 2–3 are this hook's own small
 * state machine, which a token's marker can also open directly at stage 3.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useAtMention } from "@/app/lib/hooks/useAtMention";
import {
  PROMPT_FIELD_TYPE_LABELS,
  canonicalToken,
  fieldTypeOf,
} from "@/app/lib/assessment/promptTokens";
import type { PromptFieldType } from "@/app/lib/types/assessment";

export interface MentionColumnOption {
  name: string;
  isCreate: boolean;
  type: PromptFieldType;
}

export interface MentionTypeOption {
  type: PromptFieldType;
  label: string;
  isCurrent: boolean;
}

export interface MentionStrictOption {
  strict: boolean;
  label: string;
  hint: string;
  isCurrent: boolean;
}

/** Which follow-up question is open for `pendingField`. */
export type MentionStage = "type" | "strict";

const TYPE_ORDER: PromptFieldType[] = ["text", "image", "pdf"];

/** Grace for the pointer to travel from a token's marker into its dropdown. */
const HOVER_CLOSE_DELAY_MS = 200;

// Optional first: it is the backend default, so it is what a plain `@Column` means.
const STRICT_CHOICES: Omit<MentionStrictOption, "isCurrent">[] = [
  { strict: false, label: "Optional", hint: "rows may leave it blank" },
  { strict: true, label: "Required", hint: "a blank row fails the run" },
];

function strictIndexOf(
  fieldStrict: Record<string, boolean>,
  name: string,
): number {
  return STRICT_CHOICES.findIndex(
    (choice) => choice.strict === (fieldStrict[name] ?? false),
  );
}

/** Timer for hover-opened boxes: closes once the pointer has left marker and box. */
function useHoverClose() {
  const openedByHover = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHoverClose = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const armHover = useCallback(
    (via: "hover" | "click") => {
      cancelHoverClose();
      openedByHover.current = via === "hover";
    },
    [cancelHoverClose],
  );

  const resetHover = useCallback(() => {
    cancelHoverClose();
    openedByHover.current = false;
  }, [cancelHoverClose]);

  const scheduleHover = useCallback(
    (close: () => void) => {
      if (!openedByHover.current) return;
      cancelHoverClose();
      timer.current = setTimeout(close, HOVER_CLOSE_DELAY_MS);
    },
    [cancelHoverClose],
  );

  return { armHover, resetHover, cancelHoverClose, scheduleHover };
}

interface UsePromptMentionsParams {
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  fieldStrict: Record<string, boolean>;
  value: string;
  onChange: (value: string) => void;
  onFieldType: (name: string, type: PromptFieldType) => void;
  onFieldStrict: (name: string, strict: boolean) => void;
}

export function usePromptMentions({
  columns,
  fieldTypes,
  fieldStrict,
  value,
  onChange,
  onFieldType,
  onFieldStrict,
}: UsePromptMentionsParams) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pendingField, setPendingField] = useState<string | null>(null);
  const [stage, setStage] = useState<MentionStage | null>(null);
  const [optionIndex, setOptionIndex] = useState(0);
  // Inserting closes stage 1, which clears its caret position — keep it for stages 2–3.
  const [stagePosition, setStagePosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const { armHover, resetHover, cancelHoverClose, scheduleHover } =
    useHoverClose();

  const mention = useAtMention({
    columns,
    inputRef: inputRef as React.RefObject<HTMLTextAreaElement>,
    mirrorRef: mirrorRef as React.RefObject<HTMLDivElement>,
    dropdownRef: dropdownRef as React.RefObject<HTMLDivElement>,
    insertFormat: (column) =>
      canonicalToken(column, fieldTypeOf(fieldTypes, column)),
  });

  const columnOptions = useMemo<MentionColumnOption[]>(() => {
    const query = mention.state.query;
    if (query === null) return [];
    const options: MentionColumnOption[] = mention.options.map((name) => ({
      name,
      isCreate: false,
      type: fieldTypeOf(fieldTypes, name),
    }));
    const exact = columns.some(
      (column) => column.toLowerCase() === query.toLowerCase(),
    );
    if (query && !exact) {
      options.push({ name: query, isCreate: true, type: "text" });
    }
    return options;
  }, [columns, fieldTypes, mention.options, mention.state.query]);

  const typeOptions = useMemo<MentionTypeOption[]>(() => {
    if (!pendingField) return [];
    const current = fieldTypeOf(fieldTypes, pendingField);
    return TYPE_ORDER.map((type) => ({
      type,
      label: PROMPT_FIELD_TYPE_LABELS[type],
      isCurrent: type === current,
    }));
  }, [fieldTypes, pendingField]);

  const strictOptions = useMemo<MentionStrictOption[]>(() => {
    if (!pendingField) return [];
    const current = fieldStrict[pendingField] ?? false;
    return STRICT_CHOICES.map((choice) => ({
      ...choice,
      isCurrent: choice.strict === current,
    }));
  }, [fieldStrict, pendingField]);

  const closeStages = useCallback(() => {
    resetHover();
    setPendingField(null);
    setStage(null);
    setStagePosition(null);
  }, [resetHover]);

  const closeAll = useCallback(() => {
    closeStages();
    mention.close();
  }, [closeStages, mention]);

  /** Stage 1 → insert the token, then ask for its type. */
  const pickColumn = useCallback(
    (option: MentionColumnOption) => {
      setStagePosition(mention.state.pos);
      mention.insert(option.name, value, onChange);
      setPendingField(option.name);
      setStage("type");
      setOptionIndex(
        Math.max(0, TYPE_ORDER.indexOf(fieldTypeOf(fieldTypes, option.name))),
      );
    },
    [fieldTypes, mention, onChange, value],
  );

  /** Stage 2 → record the type, then ask whether a row may leave it blank. */
  const pickType = useCallback(
    (type: PromptFieldType) => {
      if (!pendingField) return;
      onFieldType(pendingField, type);
      setStage("strict");
      setOptionIndex(strictIndexOf(fieldStrict, pendingField));
    },
    [fieldStrict, onFieldType, pendingField],
  );

  /** Stage 3 → record strictness and hand focus back to the textarea. */
  const pickStrict = useCallback(
    (strict: boolean) => {
      if (pendingField) onFieldStrict(pendingField, strict);
      closeStages();
      inputRef.current?.focus();
    },
    [closeStages, onFieldStrict, pendingField],
  );

  /** From a token's marker: straight to the required/optional question. */
  const openStrictFor = useCallback(
    (
      name: string,
      position: { top: number; left: number },
      via: "hover" | "click",
    ) => {
      armHover(via);
      mention.close();
      setPendingField(name);
      setStage("strict");
      setStagePosition(position);
      setOptionIndex(strictIndexOf(fieldStrict, name));
      if (via === "click") inputRef.current?.focus();
    },
    [armHover, fieldStrict, mention],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!stage) {
        if (mention.state.query !== null && columnOptions.length > 0) {
          handleColumnKeys(event, columnOptions, mention, pickColumn);
        }
        return;
      }
      handleOptionKeys(event, {
        count: stage === "type" ? TYPE_ORDER.length : STRICT_CHOICES.length,
        optionIndex,
        setOptionIndex,
        pick: (index) =>
          stage === "type"
            ? pickType(TYPE_ORDER[index])
            : pickStrict(STRICT_CHOICES[index].strict),
        cancel: closeStages,
      });
    },
    [
      closeStages,
      columnOptions,
      mention,
      optionIndex,
      pickColumn,
      pickStrict,
      pickType,
      stage,
    ],
  );

  return {
    inputRef,
    mirrorRef,
    dropdownRef,
    isOpen: stage !== null || mention.state.query !== null,
    position: stage ? stagePosition : mention.state.pos,
    activeIndex: stage ? optionIndex : mention.state.index,
    pendingField,
    stage,
    columnOptions,
    typeOptions,
    strictOptions,
    onInput: mention.onInput,
    onKeyDown,
    pickColumn,
    pickType,
    pickStrict,
    openStrictFor,
    scheduleHoverClose: () => scheduleHover(closeStages),
    cancelHoverClose,
    closeAll,
  };
}

function handleColumnKeys(
  event: React.KeyboardEvent,
  options: MentionColumnOption[],
  mention: ReturnType<typeof useAtMention>,
  pick: (option: MentionColumnOption) => void,
): void {
  if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    pick(options[Math.min(mention.state.index, options.length - 1)]);
    return;
  }
  // Arrow keys and Escape are already handled by the stage-1 engine.
  mention.onKeyDown(event, "", () => {});
}

function handleOptionKeys(
  event: React.KeyboardEvent,
  handlers: {
    count: number;
    optionIndex: number;
    setOptionIndex: (value: number) => void;
    pick: (index: number) => void;
    cancel: () => void;
  },
): void {
  const { count, optionIndex, setOptionIndex, pick, cancel } = handlers;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setOptionIndex((optionIndex + 1) % count);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setOptionIndex((optionIndex - 1 + count) % count);
  } else if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    pick(optionIndex);
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancel();
  }
}
