/**
 * Maps between the wizard's `AssessorVersionDetail` and the ASSESSMENT config blob
 * the backend stores. Pure — no React, no network.
 *
 * `input_schema` is the only record of a column's type, so it carries the
 * attachments both ways: flattening it to text loses them on reopen.
 */
import type {
  AssessorModelSelection,
  AssessorVersionDetail,
  Attachment,
  ModelParams,
  PrefilterConfig,
  PromptFieldType,
} from "@/app/lib/types/assessment";
import type { ProviderType } from "@/app/lib/types/configs";

/** The stored blob. Loosely typed: the config service owns its exact shape. */
export type AssessmentBlob = Record<string, unknown>;

interface InputColumn {
  type: PromptFieldType;
  format: "url" | "base64" | null;
  /** `true` rejects a row where the column is absent or blank; backend default is `false`. */
  strict?: boolean;
}

const PLACEHOLDER_RE = /\{([A-Za-z_]\w*)\}/g;

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

/** Params the wizard owns; the rest of the blob's params are structural. */
const STRUCTURAL_PARAM_KEYS = new Set([
  "model",
  "submission",
  "instructions",
  "json_output_schema",
]);

function modelParams(params: Record<string, unknown>): ModelParams {
  const out: ModelParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (STRUCTURAL_PARAM_KEYS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number")
      out[key] = value;
  }
  return out;
}

function columnTypes(blob: AssessmentBlob): Record<string, InputColumn> {
  return Object.fromEntries(
    Object.entries(asRecord(blob.input_schema)).map(([name, spec]) => {
      const column = asRecord(spec);
      return [
        name,
        {
          type: asString(column.type, "text") as PromptFieldType,
          format: (column.format as "url" | "base64" | null) ?? null,
          strict: column.strict === true,
        },
      ];
    }),
  );
}

function attachmentsFrom(columns: Record<string, InputColumn>): Attachment[] {
  return Object.entries(columns)
    .filter(([, column]) => column.type !== "text")
    .map(([name, column]) => ({
      column: name,
      type: column.type as "image" | "pdf",
      format: column.format ?? "url",
    }));
}

function placeholders(template: string): string[] {
  return [
    ...new Set([...template.matchAll(PLACEHOLDER_RE)].map((match) => match[1])),
  ];
}

function prefilterSelection(
  prefilters: Record<string, unknown>,
): AssessorModelSelection | null {
  const topic = asRecord(prefilters.topic_relevance);
  if (!Object.keys(topic).length) return null;

  const params = asRecord(topic.params);
  return {
    provider: asString(topic.provider, "openai") as ProviderType,
    model: asString(params.model),
    params: modelParams(params),
  };
}

function prefilterConfig(
  prefilters: Record<string, unknown>,
  columns: Record<string, InputColumn>,
): PrefilterConfig | null {
  const topic = asRecord(prefilters.topic_relevance);
  if (!Object.keys(topic).length) return null;

  const params = asRecord(topic.params);
  // No stored template means the pre-filter read every column.
  const referenced = params.submission
    ? placeholders(asString(params.submission))
    : Object.keys(columns);
  const isAttachment = (name: string) =>
    Boolean(columns[name]) && columns[name].type !== "text";

  return {
    topic_relevance: {
      columns: referenced.filter((name) => !isAttachment(name)),
      attachment_columns: referenced.filter(isAttachment),
      prompt: asString(params.instructions),
    },
  };
}

export function blobToVersionDetail(
  configId: string,
  version: number,
  commitMessage: string | null,
  blob: AssessmentBlob,
): AssessorVersionDetail {
  const assessment = asRecord(blob.assessment);
  const params = asRecord(assessment.params);
  const prefilters = asRecord(blob.pre_filters);
  const columns = columnTypes(blob);

  return {
    config_id: configId,
    version,
    commit_message: commitMessage,
    provider: asString(assessment.provider, "openai") as ProviderType,
    model: asString(params.model),
    params: modelParams(params),
    submission_id: null,
    system_instruction: asString(params.instructions),
    prompt_template: asString(params.submission),
    attachments: attachmentsFrom(columns),
    strict_columns: Object.entries(columns)
      .filter(([, column]) => column.strict)
      .map(([name]) => name),
    prefilter_config: prefilterConfig(prefilters, columns),
    prefilter_model: prefilterSelection(prefilters),
    output_schema:
      (params.json_output_schema as Record<string, unknown> | undefined) ??
      null,
  };
}

/** Only the columns the prompts reference; the backend drops the rest of the sheet. */
function inputSchema(
  referenced: string[],
  attachments: Attachment[],
  strictColumns: string[],
): Record<string, InputColumn> {
  const byColumn = new Map(attachments.map((item) => [item.column, item]));
  const strict = new Set(strictColumns);
  const names = [...new Set([...referenced, ...byColumn.keys()])];

  return Object.fromEntries(
    names.map((name) => {
      const attachment = byColumn.get(name);
      const column: InputColumn =
        attachment && attachment.type !== "mixed"
          ? { type: attachment.type, format: attachment.format ?? "url" }
          : { type: "text", format: null };
      return [name, strict.has(name) ? { ...column, strict: true } : column];
    }),
  );
}

/** The pre-filter's own template, so it reads the chosen columns and no others. */
function prefilterTemplate(columns: string[]): string {
  return columns.map((name) => `${name}: {${name}}`).join("\n");
}

/** Columns the prompts read: the assessment template's placeholders plus the pre-filter's picks. */
function referencedColumns(
  detail: Omit<AssessorVersionDetail, "config_id" | "version">,
): string[] {
  const topic = detail.prefilter_config?.topic_relevance;
  return [
    ...placeholders(detail.prompt_template),
    ...(topic?.columns ?? []),
    ...(topic?.attachment_columns ?? []),
  ];
}

export function versionDetailToBlob(
  detail: Omit<AssessorVersionDetail, "config_id" | "version">,
): AssessmentBlob {
  const topic = detail.prefilter_config?.topic_relevance;
  const blob: AssessmentBlob = {
    input_schema: inputSchema(
      referencedColumns(detail),
      detail.attachments,
      detail.strict_columns,
    ),
    assessment: {
      provider: detail.provider,
      type: "text",
      params: {
        ...detail.params,
        model: detail.model,
        instructions: detail.system_instruction,
        submission: detail.prompt_template,
        ...(detail.output_schema
          ? { json_output_schema: detail.output_schema }
          : {}),
      },
    },
  };

  if (topic) {
    const referenced = [...topic.columns, ...(topic.attachment_columns ?? [])];
    blob.pre_filters = {
      topic_relevance: {
        provider: detail.prefilter_model?.provider ?? detail.provider,
        params: {
          ...(detail.prefilter_model?.params ?? {}),
          model: detail.prefilter_model?.model ?? detail.model,
          instructions: topic.prompt,
          ...(referenced.length
            ? { submission: prefilterTemplate(referenced) }
            : {}),
        },
      },
    };
  }
  return blob;
}
