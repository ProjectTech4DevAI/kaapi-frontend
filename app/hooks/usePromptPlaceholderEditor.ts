"use client";

import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SampleRow, ValueSetter } from "@/app/lib/types/assessment";

interface UsePromptPlaceholderEditorParams {
  value: string;
  onChange: ValueSetter<string>;
  previewMode: boolean;
  textColumns: string[];
  sampleRow: SampleRow;
  enablePlaceholders: boolean;
}

export interface UsePromptPlaceholderEditorResult {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  mirrorRef: RefObject<HTMLDivElement | null>;
  dropdownRef: RefObject<HTMLDivElement | null>;
  mentionQuery: string | null;
  mentionIndex: number;
  mentionPos: { top: number; left: number } | null;
  mentionOptions: string[];
  setMentionIndex: (index: number) => void;
  handleInput: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  insertMention: (column: string) => void;
  insertPlaceholder: (column: string) => void;
  usedColumns: string[];
  orderedColumns: string[];
  previewText: string;
}

export function usePromptPlaceholderEditor({
  value,
  onChange,
  previewMode,
  textColumns,
  sampleRow,
  enablePlaceholders,
}: UsePromptPlaceholderEditorParams): UsePromptPlaceholderEditorResult {
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

  return {
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
  };
}
