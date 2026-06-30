export type ParamType = "enum" | "float" | "int" | "string" | "boolean";

export interface ParamSchema {
  type: ParamType;
  default: unknown;
  options?: string[];
  min?: number;
  max?: number;
  description?: string;
}

export type ModelCompletionType = "text" | "stt" | "tts";

export interface ModelSchema {
  provider: string;
  model: string;
  completion_type: ModelCompletionType[];
  config: Record<string, ParamSchema>;
  is_active?: boolean;
}

export interface RawModelEntry {
  provider: string;
  model_name: string;
  completion_type: ModelCompletionType[];
  config: Record<string, ParamSchema>;
  is_active?: boolean;
}

export type ConfigType = ModelCompletionType;

export interface ModelOption {
  value: string;
  label: string;
  types?: ConfigType[];
}

export interface ModelSchemaCacheState {
  schemas: ModelSchema[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}
