/**
 * The schema drives every UI surface that needs to know a model's params
 * (effort, summary, voice, temperature, etc.).
 */

import { getModelSchemaCache } from "@/app/lib/store/modelSchemaStore";
import type {
  ModelCompletionType,
  ModelSchema,
  RawModelEntry,
} from "@/app/lib/types/models";

export type {
  ParamType,
  ParamSchema,
  ModelCompletionType,
  ModelSchema,
  RawModelEntry,
} from "@/app/lib/types/models";

export function flattenGroupedModels(
  grouped: Record<string, RawModelEntry[]>,
): ModelSchema[] {
  const out: ModelSchema[] = [];
  for (const entries of Object.values(grouped)) {
    for (const entry of entries) {
      if (entry.is_active === false) continue;
      out.push({
        provider: entry.provider,
        model: entry.model_name,
        completion_type: entry.completion_type,
        config: entry.config ?? {},
        is_active: entry.is_active,
      });
    }
  }
  return out;
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getProviderLabel(provider: string): string {
  return toTitleCase(provider);
}

export const PARAM_VALUE_LABELS: Record<string, Record<string, string>> = {
  effort: {
    none: "None",
    minimal: "Minimal",
    low: "Low",
    medium: "Medium",
    high: "High",
    xhigh: "Extra High",
  },
};

function schemas(): ModelSchema[] {
  return getModelSchemaCache().schemas;
}

export function getModelSchema(
  provider: string,
  model: string,
): ModelSchema | undefined {
  return schemas().find((m) => m.provider === provider && m.model === model);
}

export function getProvidersForType(type: ModelCompletionType): string[] {
  return Array.from(
    new Set(
      schemas()
        .filter((m) => m.completion_type.includes(type))
        .map((m) => m.provider),
    ),
  );
}

export function getAllProviders(): string[] {
  return Array.from(new Set(schemas().map((m) => m.provider)));
}

export function getModelsForProviderAndType(
  provider: string,
  type: ModelCompletionType,
): ModelSchema[] {
  return schemas().filter(
    (m) => m.provider === provider && m.completion_type.includes(type),
  );
}

export function getCompletionTypesForProvider(
  provider: string,
): ModelCompletionType[] {
  return Array.from(
    new Set(
      schemas()
        .filter((m) => m.provider === provider)
        .flatMap((m) => m.completion_type),
    ),
  );
}

export function getParamLabel(key: string): string {
  return toTitleCase(key);
}

export function getParamValueLabel(key: string, value: unknown): string {
  if (value === undefined || value === null) return "";
  const stringValue = String(value);
  return PARAM_VALUE_LABELS[key]?.[stringValue] ?? stringValue;
}

/**
 * Returns the default params bag for a given model: every schema-declared key
 * mapped to its declared default. Used when seeding a new config or when the
 * user switches models and the old params don't match the new schema.
 */
export function defaultParamsForModel(
  provider: string,
  model: string,
): Record<string, unknown> {
  const schema = getModelSchema(provider, model);
  if (!schema) return {};
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema.config)) {
    out[key] = spec.default;
  }
  return out;
}

/**
 * Filters a params bag to the keys declared in the target model's schema,
 * preserving values that remain valid (e.g. enum value still in options).
 * Missing keys are filled with the schema default.
 */
export function reconcileParamsForModel(
  provider: string,
  model: string,
  current: Record<string, unknown>,
): Record<string, unknown> {
  const schema = getModelSchema(provider, model);
  if (!schema) return {};
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema.config)) {
    const value = current[key];
    if (spec.type === "enum" && spec.options) {
      out[key] = spec.options.includes(String(value)) ? value : spec.default;
    } else if (value === undefined || value === null) {
      out[key] = spec.default;
    } else {
      out[key] = value;
    }
  }
  return out;
}
