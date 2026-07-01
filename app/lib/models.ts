import {
  getAllProviders,
  getModelSchema,
  getModelsForProviderAndType,
} from "@/app/lib/modelSchema";
import { getModelSchemaCache } from "@/app/lib/store/modelSchemaStore";
import type { ConfigType, ModelOption } from "@/app/lib/types/models";

export type { ConfigType, ModelOption } from "@/app/lib/types/models";

export function humanizeModelLabel(value: string): string {
  return value;
}

export const MODEL_OPTIONS: Record<string, ModelOption[]> = new Proxy(
  {} as Record<string, ModelOption[]>,
  {
    get(_t, prop) {
      if (typeof prop !== "string") return undefined;
      return getModelSchemaCache()
        .schemas.filter((m) => m.provider === prop)
        .map((m) => ({
          value: m.model,
          label: m.model,
          types: m.completion_type,
        }));
    },
    ownKeys() {
      return getAllProviders();
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    },
  },
);

export function getModelsForType(
  provider: string,
  type: ConfigType,
): ModelOption[] {
  return getModelsForProviderAndType(provider, type).map((m) => ({
    value: m.model,
    label: m.model,
    types: m.completion_type,
  }));
}

export { getModelSchema };
