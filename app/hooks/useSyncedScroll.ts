"use client";

/**
 * Keeps the editor and its preview aligned on their section headings rather than
 * on total height — the editor carries cards (output schema, the fixed-output
 * strip) the preview has no counterpart for.
 *
 * What makes it feel smooth:
 * - **monotone cubic mapping** (`createScrollMapper`), so the follower's speed
 *   doesn't jump when crossing an anchor;
 * - a **tail anchor**, so the end of the last zone lands the preview at its
 *   bottom instead of holding at the last heading;
 * - **damped follow** in one rAF loop — the follower eases toward its target
 *   instead of snapping to it once per wheel event;
 * - **echo suppression**, because writing `scrollTop` fires the follower's own
 *   scroll event, which would otherwise drive back and fight the leader;
 * - **cached anchors**, re-measured only when a pane resizes or its content
 *   changes, so starting a scroll doesn't force a layout.
 */
import { useCallback, useEffect, useRef } from "react";
import {
  createScrollMapper,
  type ScrollAnchor,
  type ScrollMapper,
} from "@/app/lib/assessment/scrollMap";

type PaneKey = "editor" | "preview";

/** How long the driving pane keeps the lock after its last scroll event. */
const DRIVER_IDLE_MS = 140;
/**
 * Fraction of the remaining distance covered per frame. Heavier easing for a
 * long jump (crossing to another section) so it glides; lighter for the small
 * per-frame deltas of a normal scroll, where easing would read as lag —
 * measured at ≤16px of trail even at 24px/frame.
 */
const EASE_NEAR = 0.6;
const EASE_FAR = 0.3;
const FAR_DISTANCE_PX = 150;
const SETTLE_PX = 0.5;
const ANCHOR_GAP = 14;
const ECHO_TOLERANCE_PX = 1.5;
const REMEASURE_DEBOUNCE_MS = 120;

interface FollowState {
  goal: { pane: HTMLElement; key: PaneKey; to: number } | null;
  frame: number | null;
  /** The last value we wrote to each pane, to recognise our own echo. */
  written: Record<PaneKey, number | null>;
  driver: PaneKey | null;
  snap: boolean;
}

const maxScroll = (el: HTMLElement) =>
  Math.max(0, el.scrollHeight - el.clientHeight);

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

function offsetIn(pane: HTMLElement, el: HTMLElement, bottom = false): number {
  const rect = el.getBoundingClientRect();
  const paneRect = pane.getBoundingClientRect();
  return (bottom ? rect.bottom : rect.top) - paneRect.top + pane.scrollTop;
}

/** Strictly increasing on both axes, so the mapping stays invertible. */
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

  // Tail: the end of the last zone lines up with the end of the preview.
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

/** Writing `scrollTop` fires the follower's own scroll event; skip that one. */
function isEcho(state: FollowState, key: PaneKey, scrollTop: number): boolean {
  const value = state.written[key];
  if (value === null || Math.abs(scrollTop - value) > ECHO_TOLERANCE_PX) {
    return false;
  }
  state.written[key] = null;
  return true;
}

function stepFollow(state: FollowState): void {
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

function scheduleFollow(state: FollowState): void {
  if (state.frame === null) {
    state.frame = requestAnimationFrame(() => stepFollow(state));
  }
}

export function useSyncedScroll(params: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  previewRef: React.RefObject<HTMLDivElement | null>;
  /** Elements to align on, e.g. the zone headings and the preview's `h1`s. */
  editorAnchorSelector: string;
  previewAnchorSelector: string;
}) {
  const { editorRef, previewRef, editorAnchorSelector, previewAnchorSelector } =
    params;

  const stateRef = useRef<FollowState>({
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

  const claimDriver = useCallback((key: PaneKey): boolean => {
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
    (source: HTMLElement, sourceKey: PaneKey) => {
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

    // Anchors only move when a pane resizes or its content changes.
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
