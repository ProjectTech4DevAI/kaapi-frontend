import type { ModelSchemaCacheState } from "@/app/lib/types/models";

export type { ModelSchemaCacheState } from "@/app/lib/types/models";

let cache: ModelSchemaCacheState = {
  schemas: [],
  isLoaded: false,
  isLoading: false,
  error: null,
};

const listeners = new Set<() => void>();

export function getModelSchemaCache(): ModelSchemaCacheState {
  return cache;
}

export function setModelSchemaCache(
  next: Partial<ModelSchemaCacheState>,
): void {
  cache = { ...cache, ...next };
  listeners.forEach((l) => l());
}

export function subscribeModelSchemaCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
