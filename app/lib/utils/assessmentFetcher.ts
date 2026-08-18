// Assessment-scoped config fetchers, model helpers, and save logic.
import { apiFetch } from "@/app/lib/apiClient";
import { invalidateConfigCache } from "@/app/lib/configFetchers";
import { ASSESSMENT_TAG } from "@/app/lib/assessment/constants";
import {
  ASSESSMENT_DEFAULT_CONFIG,
  ASSESSMENT_MODEL_CONFIGS,
  GPT4_STYLE_CONFIG,
} from "@/app/lib/data/assessmentModels";
import { DEFAULT_PAGE_LIMIT } from "@/app/lib/constants";
import { schemaToJsonSchema } from "@/app/lib/utils/assessment";
import { fromJsonSchema } from "@/app/lib/utils/outputSchema";
import type {
  AssessmentDatasetRows,
  Attachment,
  ColumnMapping,
  ConfigParamDefinition,
  ConfigSelection,
  ModelOption,
  PagedResult,
  PrefilterConfig,
  SchemaProperty,
  VersionListState,
} from "@/app/lib/types/assessment";
import type {
  AssessmentConfigBlob,
  AssessmentInputSchemaColumn,
  AssessmentParams,
  AssessmentPreFilters,
  ConfigCreate,
  ConfigListResponse,
  ConfigPublic,
  ConfigVersionCreate,
  ConfigVersionItems,
  ConfigVersionListResponse,
  ConfigVersionPublic,
  ConfigVersionResponse,
  ConfigWithVersionResponse,
  ProviderType,
  SavedConfig,
} from "@/app/lib/types/configs";

export function getModelsByProvider(provider: string): ModelOption[] {
  return ASSESSMENT_MODEL_CONFIGS.filter(
    (model) => model.provider === provider,
  ).map(({ model_name }) => ({ value: model_name, label: model_name }));
}

export function getDefaultModelForProvider(provider: string): string {
  return (
    ASSESSMENT_MODEL_CONFIGS.find((model) => model.provider === provider)
      ?.model_name ?? "gpt-4o-mini"
  );
}

export function getModelConfigDefinition(
  modelName: string,
): Record<string, ConfigParamDefinition> {
  return (
    ASSESSMENT_MODEL_CONFIGS.find((item) => item.model_name === modelName)
      ?.config ?? GPT4_STYLE_CONFIG
  );
}

export function buildDefaultParams(
  modelName: string,
): Record<string, number | string> {
  const definition = getModelConfigDefinition(modelName);
  return Object.fromEntries(
    Object.entries(definition).map(([key, value]) => [key, value.default]),
  );
}

export function buildInitialAssessmentConfigDraft(): AssessmentConfigBlob {
  return JSON.parse(
    JSON.stringify(ASSESSMENT_DEFAULT_CONFIG),
  ) as AssessmentConfigBlob;
}

export function buildInitialAssessmentVersionState(): VersionListState {
  return {
    items: [],
    isLoading: false,
    error: null,
    hasMore: true,
    nextSkip: 0,
  };
}

export function toConfigSelection(saved: SavedConfig): ConfigSelection {
  return {
    config_id: saved.config_id,
    config_version: saved.version,
    name: saved.name,
    provider: saved.provider,
    model: saved.modelName,
  };
}

function buildPageResult<T>(
  items: T[],
  skip: number,
  limit: number,
): PagedResult<T> {
  return {
    items,
    hasMore: items.length === limit,
    nextSkip: skip + items.length,
  };
}

const PRESERVED_ASSESSMENT_PARAM_KEYS = new Set([
  "model",
  "instructions",
  "input_schema",
  "json_output_schema",
]);

// Assessment config_blob provider must be a backend TextProvider
// (openai | google | anthropic). The model catalog uses "google-aistudio" for
// Gemini (the credential provider), so narrow it to "google" at the API boundary.
function toTextProvider(provider: ProviderType): ProviderType {
  return (provider === "google-aistudio" ? "google" : provider) as ProviderType;
}

function normalizeConfigBlobForApi(
  configBlob: AssessmentConfigBlob,
): AssessmentConfigBlob {
  const src = configBlob.assessment.params;
  const nextParams: AssessmentParams = {
    model: src.model,
    instructions: src.instructions,
    input_schema: src.input_schema,
  };
  if (src.json_output_schema != null) {
    nextParams.json_output_schema = src.json_output_schema;
  }
  Object.entries(src).forEach(([key, value]) => {
    if (PRESERVED_ASSESSMENT_PARAM_KEYS.has(key)) return;
    if (value !== undefined && value !== "") {
      nextParams[key] = value;
    }
  });

  const normalized: AssessmentConfigBlob = {
    assessment: {
      provider: toTextProvider(configBlob.assessment.provider),
      type: "text",
      params: nextParams,
    },
  };
  if (
    configBlob.pre_filters &&
    Object.keys(configBlob.pre_filters).length > 0
  ) {
    const preFilters = { ...configBlob.pre_filters };
    if (preFilters.topic_relevance) {
      preFilters.topic_relevance = {
        ...preFilters.topic_relevance,
        provider: toTextProvider(preFilters.topic_relevance.provider),
      };
    }
    if (preFilters.duplicate_detection) {
      preFilters.duplicate_detection = {
        ...preFilters.duplicate_detection,
        provider: toTextProvider(preFilters.duplicate_detection.provider),
      };
    }
    normalized.pre_filters = preFilters;
  }
  return normalized;
}

export function buildAssessmentInputSchema(
  columnMapping: ColumnMapping,
): Record<string, AssessmentInputSchemaColumn> {
  const strictColumns = new Set(columnMapping.strictColumns ?? []);
  const schema: Record<string, AssessmentInputSchemaColumn> = {};
  for (const column of columnMapping.textColumns) {
    schema[column] = { type: "text", strict: strictColumns.has(column) };
  }
  for (const attachment of columnMapping.attachments) {
    const type = attachment.type === "pdf" ? "pdf" : "image";
    schema[attachment.column] = {
      type,
      format: "url",
      strict: strictColumns.has(attachment.column),
    };
  }
  return schema;
}

function buildPreFilters(
  prefilterConfig: PrefilterConfig | null,
  provider: ProviderType,
  model: string,
): AssessmentPreFilters | undefined {
  if (!prefilterConfig) return undefined;
  const preFilters: AssessmentPreFilters = {};
  if (prefilterConfig.topic_relevance?.prompt?.trim()) {
    preFilters.topic_relevance = {
      provider,
      params: {
        model,
        instructions: prefilterConfig.topic_relevance.prompt.trim(),
      },
      stop_on_fail: true,
    };
  }
  if (prefilterConfig.duplicate_detection) {
    preFilters.duplicate_detection = {
      provider,
      params: {
        model,
        instructions: "Flag rows that duplicate an earlier row.",
      },
      stop_on_fail: false,
    };
  }
  return Object.keys(preFilters).length > 0 ? preFilters : undefined;
}

export function buildAssessmentConfigBlob(params: {
  draft: AssessmentConfigBlob;
  systemInstruction: string;
  outputSchema: SchemaProperty[];
  columnMapping: ColumnMapping;
  prefilterConfig: PrefilterConfig | null;
}): AssessmentConfigBlob {
  const { draft, systemInstruction, outputSchema, columnMapping } = params;
  const provider = draft.assessment.provider;
  const model = String(draft.assessment.params.model || "");
  const jsonOutputSchema = schemaToJsonSchema(outputSchema);

  const nextParams: AssessmentParams = {
    ...draft.assessment.params,
    model,
    instructions: systemInstruction.trim(),
    input_schema: buildAssessmentInputSchema(columnMapping),
  };
  if (jsonOutputSchema) {
    nextParams.json_output_schema = jsonOutputSchema;
  } else {
    delete nextParams.json_output_schema;
  }

  const blob: AssessmentConfigBlob = {
    assessment: { provider, type: "text", params: nextParams },
  };
  const preFilters = buildPreFilters(params.prefilterConfig, provider, model);
  if (preFilters) blob.pre_filters = preFilters;
  return blob;
}

export interface AssessmentBuilderState {
  draft: AssessmentConfigBlob;
  systemInstruction: string;
  outputSchema: SchemaProperty[];
  columnMapping: ColumnMapping;
  prefilterConfig: PrefilterConfig | null;
}

// Inverse of buildAssessmentConfigBlob: hydrate the builder from a saved
// config version's blob so an existing config can be loaded and edited into a
// new version. Pre-filter column selections are not stored in the blob, so
// they come back empty (the criteria/prompt is preserved).
export function assessmentBlobToBuilderState(
  blob: AssessmentConfigBlob,
): AssessmentBuilderState {
  if (!blob?.assessment?.params) {
    throw new Error(
      "This configuration is not a valid assessment config (no assessment block).",
    );
  }
  const params = blob.assessment.params as Record<string, unknown>;
  const inputSchema = (params.input_schema ?? {}) as Record<
    string,
    AssessmentInputSchemaColumn
  >;

  const textColumns: string[] = [];
  const attachments: Attachment[] = [];
  const strictColumns: string[] = [];
  for (const [name, column] of Object.entries(inputSchema)) {
    if (column.type === "text") {
      textColumns.push(name);
    } else {
      attachments.push({
        column: name,
        type: column.type,
        format: column.format ?? "url",
      });
    }
    if (column.strict) strictColumns.push(name);
  }

  const jsonOutputSchema = params.json_output_schema as
    | Record<string, unknown>
    | undefined;

  let prefilterConfig: PrefilterConfig | null = null;
  if (blob.pre_filters) {
    prefilterConfig = {};
    const tr = blob.pre_filters.topic_relevance;
    if (tr) {
      const trParams = (tr.params ?? {}) as Record<string, unknown>;
      prefilterConfig.topic_relevance = {
        columns: [],
        prompt: String(trParams.instructions ?? ""),
      };
    }
    if (blob.pre_filters.duplicate_detection) {
      prefilterConfig.duplicate_detection = { columns: [] };
    }
  }

  return {
    draft: blob,
    systemInstruction: String(params.instructions ?? ""),
    outputSchema: jsonOutputSchema ? fromJsonSchema(jsonOutputSchema) : [],
    columnMapping: {
      textColumns,
      attachments,
      groundTruthColumns: [],
      strictColumns,
    },
    prefilterConfig,
  };
}

export async function fetchAssessmentDatasetRows(
  datasetId: string,
  apiKey: string,
): Promise<AssessmentDatasetRows> {
  // Endpoint returns APIResponse[AssessmentDatasetRows] — unwrap the envelope
  // so callers get { headers, rows, total_rows } directly.
  const res = await apiFetch<{
    success: boolean;
    data: AssessmentDatasetRows | null;
    error?: string;
  }>(`/api/assessment/datasets/${datasetId}/rows`, apiKey);
  if (!res.success || !res.data) {
    throw new Error(res.error || "Failed to fetch dataset rows");
  }
  return res.data;
}

export async function fetchConfigPage(params: {
  apiKey: string;
  skip?: number;
  limit?: number;
  tag?: string;
}): Promise<PagedResult<ConfigPublic>> {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
    tag: params.tag ?? ASSESSMENT_TAG,
  });
  const data = await apiFetch<ConfigListResponse>(
    `/api/configs?${query.toString()}`,
    params.apiKey,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to fetch configs");
  }
  return buildPageResult(data.data, skip, limit);
}

export async function fetchConfigVersionsPage(
  apiKey: string,
  configId: string,
  params: { skip?: number; limit?: number; tag?: string },
): Promise<PagedResult<ConfigVersionItems>> {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
    tag: params.tag ?? ASSESSMENT_TAG,
  });
  const data = await apiFetch<ConfigVersionListResponse>(
    `/api/configs/${configId}/versions?${query.toString()}`,
    apiKey,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to fetch config versions");
  }
  return buildPageResult(data.data, skip, limit);
}

export async function fetchConfigVersionDetail(
  apiKey: string,
  configId: string,
  versionNumber: number,
  tag: string = ASSESSMENT_TAG,
): Promise<ConfigVersionPublic> {
  const query = new URLSearchParams({ tag });
  const data = await apiFetch<ConfigVersionResponse>(
    `/api/configs/${configId}/versions/${versionNumber}?${query.toString()}`,
    apiKey,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to fetch version details");
  }
  return data.data;
}

export async function fetchConfigSelection(
  apiKey: string,
  config: Pick<ConfigPublic, "id" | "name">,
  versionNumber: number,
): Promise<ConfigSelection> {
  const version = await fetchConfigVersionDetail(
    apiKey,
    config.id,
    versionNumber,
  );
  const blob = version.config_blob as unknown as AssessmentConfigBlob;
  const assessment = blob.assessment;
  return {
    config_id: config.id,
    config_version: version.version,
    name: config.name,
    provider: assessment?.provider ?? "",
    model: String(assessment?.params?.model || ""),
    input_schema: assessment?.params?.input_schema ?? {},
  };
}

export async function saveAssessmentConfig(params: {
  apiKey: string;
  configName: string;
  commitMessage: string;
  configBlob: AssessmentConfigBlob;
  existingConfig: { id: string; name: string } | null;
}): Promise<ConfigSelection> {
  const { apiKey, existingConfig } = params;

  const trimmedName = params.configName.trim();
  if (!trimmedName) {
    throw new Error("Configuration name is required");
  }

  const normalizedBlob = normalizeConfigBlobForApi(params.configBlob);
  const provider = normalizedBlob.assessment.provider;
  const model = String(normalizedBlob.assessment.params.model || "");

  if (existingConfig) {
    const versionCreate: ConfigVersionCreate = {
      config_blob: normalizedBlob,
      commit_message:
        params.commitMessage.trim() || "Updated assessment configuration",
    };
    const query = new URLSearchParams({ tag: ASSESSMENT_TAG });
    const data = await apiFetch<ConfigVersionResponse>(
      `/api/configs/${existingConfig.id}/versions?${query.toString()}`,
      apiKey,
      { method: "POST", body: JSON.stringify(versionCreate) },
    );
    if (!data.success || !data.data) {
      throw new Error(data.error || "Failed to create config version");
    }
    invalidateConfigCache();
    return {
      config_id: existingConfig.id,
      config_version: data.data.version,
      name: existingConfig.name,
      provider,
      model,
    };
  }

  const configCreate: ConfigCreate = {
    name: trimmedName,
    description: "Assessment configuration",
    tag: ASSESSMENT_TAG,
    config_blob: normalizedBlob,
    commit_message:
      params.commitMessage.trim() || "Initial assessment configuration",
  };
  const data = await apiFetch<ConfigWithVersionResponse>(
    "/api/configs",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify(configCreate),
    },
  );
  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to create configuration");
  }
  invalidateConfigCache();
  return {
    config_id: data.data.id,
    config_version: data.data.version.version,
    name: data.data.name,
    provider,
    model,
  };
}
