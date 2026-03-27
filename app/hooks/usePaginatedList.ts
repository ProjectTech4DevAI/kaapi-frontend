"use client";

/**
 * usePaginatedList<T> — generic server-side paginated list with search.
 *
 * Works with any API endpoint that accepts `?limit=N&skip=N&query=...`
 * and returns `{ success, data: T[], metadata: { has_more } }`.
 *
 * Pairs with useInfiniteScroll for seamless infinite-scroll UX.
 *
 * Usage:
 *   const { items, loadMore, ... } = usePaginatedList<ConfigPublic>({
 *     endpoint: "/api/configs",
 *     query: debouncedSearch,
 *   });
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { DEFAULT_PAGE_LIMIT } from "@/app/lib/constants";

interface PaginatedResponse<T> {
  success: boolean;
  data: T[] | null;
  error?: string | null;
  metadata?: { has_more?: boolean } | null;
}

export interface UsePaginatedListResult<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}

export function usePaginatedList<T>(options: {
  endpoint: string;
  query?: string;
  limit?: number;
  extraParams?: Record<string, string>;
}): UsePaginatedListResult<T> {
  const {
    endpoint,
    query = "",
    limit = DEFAULT_PAGE_LIMIT,
    extraParams,
  } = options;
  const { activeKey, isHydrated } = useAuth();
  const apiKey = activeKey?.key;

  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skipRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const fetchPage = useCallback(
    async (skip: number, replace: boolean) => {
      if (!apiKey) {
        setError("No API key found. Please add an API key in the Keystore.");
        return;
      }

      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
      });
      if (query) params.set("query", query);
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
      }

      const data = await apiFetch<PaginatedResponse<T>>(
        `${endpoint}?${params}`,
        apiKey,
      );

      if (!data.success || !data.data) {
        throw new Error(`Failed to fetch from ${endpoint}.`);
      }

      const newItems = data.data;
      setItems((prev) => (replace ? newItems : [...prev, ...newItems]));
      setHasMore(data.metadata?.has_more ?? false);
      skipRef.current = skip + newItems.length;
    },
    [apiKey, endpoint, query, limit, extraParams],
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (!apiKey) {
      setError("No API key found. Please add an API key in the Keystore.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setError(null);
    setItems([]);
    skipRef.current = 0;
    loadingMoreRef.current = false;

    fetchPage(0, true)
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchPage, isHydrated, apiKey]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore || isLoading) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    fetchPage(skipRef.current, false)
      .catch((e) => console.error(`Failed to load more from ${endpoint}:`, e))
      .finally(() => {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      });
  }, [fetchPage, hasMore, isLoading, endpoint]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setItems([]);
    skipRef.current = 0;
    loadingMoreRef.current = false;

    fetchPage(0, true)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [fetchPage]);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch,
  };
}
