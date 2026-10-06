"use client";

import { useCallback, useEffect, useRef } from "react";
import { createScrollMapper } from "@/app/lib/assessment/scrollMap";
import type {
  ScrollAnchor,
  ScrollMapper,
  SyncedScrollFollowState,
  SyncedScrollPane,
  UseSyncedScrollParams,
} from "@/app/lib/types/assessment";

const DRIVER_IDLE_MS = 140;
const EASE_NEAR = 0.6;
const EASE_FAR = 0.3;
const FAR_DISTANCE_PX = 150;
const SETTLE_PX = 0.5;
const ANCHOR_GAP = 14;
const ECHO_TOLERANCE_PX = 1.5;
const REMEASURE_DEBOUNCE_MS = 120;

const maxScroll = (el: HTMLElement) =>
  Math.max(0, el.scrollHeight - el.clientHeight);

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

function offsetIn(pane: HTMLElement, el: HTMLElement, bottom = false): number {
  const rect = el.getBoundingClientRect();
  const paneRect = pane.getBoundingClientRect();
  return (bottom ? rect.bottom : rect.top) - paneRect.top + pane.scrollTop;
}

function pushAnchor(anchors: ScrollAnchor[], anchor: ScrollAnchor): void {
  const last = anchors[anchors.length - 1];
  if (!last || (anchor[0] > last[0] + 2 && anchor[1] > last[1] + 2)) {
    anchors.push(anchor);
  }
}

function measureAnchors(
  editor: HTMLElement,
  preview: HTMLElement,
  editorSelector: string,
  previewSelector: string,
): ScrollAnchor[] {
  const headings = [...editor.querySelectorAll<HTMLElement>(editorSelector)];
  const targets = [...preview.querySelectorAll<HTMLElement>(previewSelector)];
  const editorMax = maxScroll(editor);
  const previewMax = maxScroll(preview);

  const anchors: ScrollAnchor[] = [[0, 0]];
  const count = Math.min(headings.length, targets.length);
  for (let i = 0; i < count; i += 1) {
    pushAnchor(anchors, [
      clamp(offsetIn(editor, headings[i]) - ANCHOR_GAP, 0, editorMax),
      clamp(offsetIn(preview, targets[i]) - ANCHOR_GAP, 0, previewMax),
    ]);
  }

  const tail = count > 0 ? headings[count - 1].nextElementSibling : null;
  if (tail instanceof HTMLElement) {
    pushAnchor(anchors, [
      clamp(offsetIn(editor, tail, true) - editor.clientHeight, 0, editorMax),
      previewMax,
    ]);
  }

  return anchors;
}

function proportional(source: HTMLElement, target: HTMLElement): number | null {
  const sourceMax = maxScroll(source);
  const targetMax = maxScroll(target);
  if (sourceMax <= 2 || targetMax <= 2) return null;
  return (source.scrollTop / sourceMax) * targetMax;
}

function isEcho(
  state: SyncedScrollFollowState,
  key: SyncedScrollPane,
  scrollTop: number,
): boolean {
  const value = state.written[key];
  if (value === null || Math.abs(scrollTop - value) > ECHO_TOLERANCE_PX) {
    return false;
  }
  state.written[key] = null;
  return true;
}

function stepFollow(state: SyncedScrollFollowState): void {
  state.frame = null;
  const goal = state.goal;
  if (!goal) return;

  const { pane, key, to } = goal;
  const distance = to - pane.scrollTop;
  const settled = state.snap || Math.abs(distance) <= SETTLE_PX;
  const ease = Math.abs(distance) > FAR_DISTANCE_PX ? EASE_FAR : EASE_NEAR;
  const next = settled ? to : pane.scrollTop + distance * ease;

  state.written[key] = next;
  pane.scrollTop = next;

  if (settled) {
    state.goal = null;
  } else {
    state.frame = requestAnimationFrame(() => stepFollow(state));
  }
}

function scheduleFollow(state: SyncedScrollFollowState): void {
  if (state.frame === null) {
    state.frame = requestAnimationFrame(() => stepFollow(state));
  }
}

export function useSyncedScroll(params: UseSyncedScrollParams) {
  const { editorRef, previewRef, editorAnchorSelector, previewAnchorSelector } =
    params;

  const stateRef = useRef<SyncedScrollFollowState>({
    goal: null,
    frame: null,
    written: { editor: null, preview: null },
    driver: null,
    snap: false,
  });
  const mapperRef = useRef<ScrollMapper | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidate = useCallback(() => {
    mapperRef.current = null;
  }, []);

  const getMapper = useCallback((): ScrollMapper | null => {
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return null;
    if (!mapperRef.current) {
      const anchors = measureAnchors(
        editor,
        preview,
        editorAnchorSelector,
        previewAnchorSelector,
      );
      mapperRef.current =
        anchors.length > 1 ? createScrollMapper(anchors) : null;
    }
    return mapperRef.current;
  }, [editorAnchorSelector, editorRef, previewAnchorSelector, previewRef]);

  const claimDriver = useCallback((key: SyncedScrollPane): boolean => {
    const state = stateRef.current;
    if (state.driver && state.driver !== key) return false;

    state.driver = key;
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      state.driver = null;
    }, DRIVER_IDLE_MS);
    return true;
  }, []);

  const sync = useCallback(
    (source: HTMLElement, sourceKey: SyncedScrollPane) => {
      const state = stateRef.current;
      const editor = editorRef.current;
      const preview = previewRef.current;
      if (!editor || !preview) return;
      if (isEcho(state, sourceKey, source.scrollTop)) return;
      if (!claimDriver(sourceKey)) return;

      const fromEditor = sourceKey === "editor";
      const pane = fromEditor ? preview : editor;
      const mapper = getMapper();
      const mapped = mapper
        ? mapper[fromEditor ? "forward" : "backward"](source.scrollTop)
        : proportional(source, pane);
      if (mapped === null) return;

      state.goal = {
        pane,
        key: fromEditor ? "preview" : "editor",
        to: clamp(mapped, 0, maxScroll(pane)),
      };
      scheduleFollow(state);
    },
    [claimDriver, editorRef, getMapper, previewRef],
  );

  useEffect(() => {
    const editor = editorRef.current;
    const preview = previewRef.current;
    const state = stateRef.current;
    if (!editor || !preview) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    state.snap = motionQuery.matches;
    const onMotionChange = () => {
      state.snap = motionQuery.matches;
    };
    motionQuery.addEventListener("change", onMotionChange);

    const onEditorScroll = () => sync(editor, "editor");
    const onPreviewScroll = () => sync(preview, "preview");
    editor.addEventListener("scroll", onEditorScroll, { passive: true });
    preview.addEventListener("scroll", onPreviewScroll, { passive: true });

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const scheduleRemeasure = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(invalidate, REMEASURE_DEBOUNCE_MS);
    };
    const resizeObserver = new ResizeObserver(scheduleRemeasure);
    resizeObserver.observe(editor);
    resizeObserver.observe(preview);
    const mutationObserver = new MutationObserver(scheduleRemeasure);
    mutationObserver.observe(preview, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      motionQuery.removeEventListener("change", onMotionChange);
      editor.removeEventListener("scroll", onEditorScroll);
      preview.removeEventListener("scroll", onPreviewScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (debounce) clearTimeout(debounce);
      if (state.frame !== null) cancelAnimationFrame(state.frame);
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [editorRef, invalidate, previewRef, sync]);
}
