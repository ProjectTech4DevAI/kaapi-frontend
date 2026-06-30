"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  ModelSchemaCacheState,
  getModelSchemaCache,
  setModelSchemaCache,
  subscribeModelSchemaCache,
} from "@/app/lib/store/modelSchemaStore";
import { RawModelEntry, flattenGroupedModels } from "@/app/lib/modelSchema";

interface ModelsApiResponse {
  success: boolean;
  data?: Record<string, RawModelEntry[]> | null;
  error?: string | null;
}

let inflight: Promise<void> | null = null;

async function fetchOnce(): Promise<void> {
  if (inflight) return inflight;
  const state = getModelSchemaCache();
  if (state.isLoaded || state.isLoading) return;
  setModelSchemaCache({ isLoading: true, error: null });

  inflight = (async () => {
    try {
      const res = await fetch("/api/models?skip=0&limit=100");
      const body: ModelsApiResponse = await res.json();
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error || `Failed to load models (${res.status})`);
      }
      setModelSchemaCache({
        schemas: flattenGroupedModels(body.data),
        isLoaded: true,
        isLoading: false,
        error: null,
      });
    } catch (e) {
      setModelSchemaCache({
        isLoading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Subscribes to the model-schema cache and triggers a fetch the first time
 * any component reads it. Returns the latest cache snapshot; non-React code
 * paths can call `getModelSchemaCache()` directly without going through the
 * hook.
 */
export function useModelSchemas(): ModelSchemaCacheState & {
  refetch: () => Promise<void>;
} {
  const state = useSyncExternalStore(
    subscribeModelSchemaCache,
    getModelSchemaCache,
    getModelSchemaCache,
  );

  useEffect(() => {
    fetchOnce();
  }, []);

  const refetch = useCallback(async () => {
    setModelSchemaCache({ isLoaded: false });
    await fetchOnce();
  }, []);

  return { ...state, refetch };
}
