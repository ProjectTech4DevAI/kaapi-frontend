"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface AtMentionState {
  query: string | null;
  index: number;
  pos: { top: number; left: number } | null;
  start: number | null;
}

export interface UseAtMentionOptions {
  columns: string[];
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  mirrorRef: React.RefObject<HTMLDivElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  /** Character to trigger mention. Default "@" */
  trigger?: string;
  /** What to wrap the inserted column name with. Default: col => `@${col}` */
  insertFormat?: (col: string) => string;
}

export function useAtMention({
  columns,
  inputRef,
  mirrorRef,
  dropdownRef,
  trigger = "@",
  insertFormat = (col) => `@${col}`,
}: UseAtMentionOptions) {
  const [state, setState] = useState<AtMentionState>({
    query: null,
    index: 0,
    pos: null,
    start: null,
  });

  const close = useCallback(() => {
    setState({ query: null, index: 0, pos: null, start: null });
  }, []);

  const options = useMemo(() => {
    if (state.query === null) return [];
    const q = state.query.toLowerCase();
    return columns.filter((c) => c.toLowerCase().includes(q));
  }, [columns, state.query]);

  const computeCaretPos = useCallback(() => {
    const el = inputRef.current;
    const mirror = mirrorRef.current;
    if (!el || !mirror) return null;

    const style = window.getComputedStyle(el);
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
    ].forEach((p) => mirror.style.setProperty(p, style.getPropertyValue(p)));

    mirror.style.width = `${el.clientWidth}px`;
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.left = "0";
    mirror.style.top = "0";

    mirror.textContent = (el as HTMLInputElement).value.substring(
      0,
      el.selectionStart ?? 0,
    );
    const marker = document.createElement("span");
    marker.textContent = "​";
    mirror.appendChild(marker);

    const mr = marker.getBoundingClientRect();
    const br = mirror.getBoundingClientRect();
    return {
      top:
        mr.top -
        br.top -
        (el as HTMLInputElement).scrollTop +
        parseInt(style.lineHeight, 10) +
        6,
      left: mr.left - br.left,
    };
  }, [inputRef, mirrorRef]);

  const onInput = useCallback(
    (value: string, cursor: number) => {
      let i = cursor - 1;
      while (
        i >= 0 &&
        value[i] !== trigger &&
        value[i] !== " " &&
        value[i] !== "\n"
      )
        i--;
      if (i >= 0 && value[i] === trigger) {
        setState({
          query: value.substring(i + 1, cursor),
          index: 0,
          pos: computeCaretPos(),
          start: i,
        });
      } else {
        close();
      }
    },
    [close, computeCaretPos, trigger],
  );

  const insert = useCallback(
    (col: string, value: string, onChange: (v: string) => void) => {
      const el = inputRef.current;
      if (!el || state.start === null) return;
      const cursor = el.selectionStart ?? value.length;
      const replacement = insertFormat(col);
      const next = `${value.substring(0, state.start)}${replacement}${value.substring(cursor)}`;
      const nextCursor = state.start + replacement.length;
      onChange(next);
      close();
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      }, 0);
    },
    [close, inputRef, insertFormat, state.start],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, value: string, onChange: (v: string) => void) => {
      if (state.query === null || options.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setState((s) => ({ ...s, index: (s.index + 1) % options.length }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setState((s) => ({
          ...s,
          index: (s.index - 1 + options.length) % options.length,
        }));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insert(options[state.index], value, onChange);
      } else if (e.key === "Escape") {
        close();
      }
    },
    [close, insert, options, state.index, state.query],
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        inputRef.current &&
        !inputRef.current.contains(t) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(t)
      )
        close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close, dropdownRef, inputRef]);

  // Scroll active option into view
  useEffect(() => {
    if (dropdownRef.current && options.length > 0) {
      const active = dropdownRef.current.children[state.index] as
        | HTMLElement
        | undefined;
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [dropdownRef, options.length, state.index]);

  return { state, options, close, onInput, insert, onKeyDown };
}
