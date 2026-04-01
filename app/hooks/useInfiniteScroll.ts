"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Generic infinite-scroll hook.
 * Attach the returned ref to a scrollable container; `onLoadMore` fires
 * when the user scrolls within `threshold` pixels of the bottom.
 *
 * Reusable across any paginated list (configs, datasets, evaluations, etc.).
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 200,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkShouldLoad = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = el;

    if (scrollHeight <= clientHeight) {
      onLoadMore();
      return;
    }

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoading, threshold]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkShouldLoad, { passive: true });
    return () => el.removeEventListener("scroll", checkShouldLoad);
  }, [checkShouldLoad]);

  // After each render, check if content is still too short to scroll
  useEffect(() => {
    checkShouldLoad();
  }, [checkShouldLoad]);

  return scrollRef;
}
