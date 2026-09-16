/**
 * The wizard draft: its empty shape, how a saved version maps into it, and how
 * it serializes — for the "has anything actually changed?" check and for the
 * save payload. Whitespace-only edits must never count as a change. No React.
 */
import {
  fieldTypesFromAttachments,
  fromWireTemplate,
  toWireTemplate,
} from "@/app/lib/assessment/promptTokens";
import { fromJsonSchema } from "@/app/lib/utils/outputSchema";
import {
  buildDefaultParams,
  getDefaultModelForProvider,
} from "@/app/lib/data/assessmentModels";
import { schemaToJsonSchema } from "@/app/lib/utils/assessment";
import type {
  AssessorModelSelection,
  AssessorVersionDetail,
  PromptZones,
  SaveAssessorVersionInput,
  WizardDraft,
} from "@/app/lib/types/assessment";
import type { ProviderType } from "@/app/lib/types/configs";

const EMPTY_ZONES: PromptZones = { instructions: "", submission: "" };
const DEFAULT_PROVIDER: ProviderType = "openai";

export function defaultModel(): AssessorModelSelection {
  const model = getDefaultModelForProvider(DEFAULT_PROVIDER);
  return {
    provider: DEFAULT_PROVIDER,
    model,
    params: buildDefaultParams(model),
  };
}

export function emptyDraft(): WizardDraft {
  return {
    prefilterEnabled: false,
    prefilter: EMPTY_ZONES,
    assessment: EMPTY_ZONES,
    fieldTypes: {},
    fieldStrict: {},
    outputSchema: [],
    models: { prefilter: defaultModel(), assessment: defaultModel() },
  };
}

export function draftFromVersion(detail: AssessorVersionDetail): WizardDraft {
  const relevance = detail.prefilter_config?.topic_relevance;
  const fieldTypes = fieldTypesFromAttachments(detail.attachments);

  return {
    prefilterEnabled: Boolean(relevance),
    prefilter: {
      instructions: relevance?.prompt ?? "",
      submission: (relevance?.columns ?? [])
        .map((column) => `${column}: @${column}`)
        .join("\n"),
    },
    assessment: {
      instructions: detail.system_instruction,
      submission: fromWireTemplate(detail.prompt_template, detail.attachments),
    },
    fieldTypes,
    fieldStrict: Object.fromEntries(
      detail.strict_columns.map((column) => [column, true]),
    ),
    outputSchema: detail.output_schema
      ? fromJsonSchema(detail.output_schema)
      : [],
    models: {
      assessment: {
        provider: detail.provider,
        model: detail.model,
        params: detail.params,
      },
      prefilter: detail.prefilter_model ?? defaultModel(),
    },
  };
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** The columns marked required, sorted so two drafts compare by content. */
export function strictColumns(fieldStrict: Record<string, boolean>): string[] {
  return Object.keys(fieldStrict)
    .filter((name) => fieldStrict[name])
    .sort();
}

export function serializeDraft(
  draft: WizardDraft,
  submissionId: string,
): string {
  return JSON.stringify({
    submissionId,
    prefilterEnabled: draft.prefilterEnabled,
    prefilter: {
      instructions: normalizeWhitespace(draft.prefilter.instructions),
      submission: normalizeWhitespace(draft.prefilter.submission),
    },
    assessment: {
      instructions: normalizeWhitespace(draft.assessment.instructions),
      submission: normalizeWhitespace(draft.assessment.submission),
    },
    fieldTypes: Object.entries(draft.fieldTypes)
      .filter(([, type]) => type !== "text")
      .sort(),
    strict: strictColumns(draft.fieldStrict),
    schema: draft.outputSchema
      .filter((field) => field.name.trim())
      .map((field) => [field.name.trim(), field.type, field.isArray]),
    models: draft.models,
  });
}

/** True when the assessment prompt has content — the bar for a brand-new assessor. */
export function hasAssessmentContent(draft: WizardDraft): boolean {
  return Boolean(
    normalizeWhitespace(draft.assessment.instructions) ||
    normalizeWhitespace(draft.assessment.submission),
  );
}

/** Draft → the save payload, in the wire shapes the backend already accepts. */
export function draftToVersionInput(params: {
  draft: WizardDraft;
  submissionId: string;
  submissionColumns: string[];
  configId: string | null;
  name: string;
  commitMessage: string;
}): SaveAssessorVersionInput {
  const {
    draft,
    submissionId,
    submissionColumns,
    configId,
    name,
    commitMessage,
  } = params;
  const { template, attachments } = toWireTemplate(
    draft.assessment.submission,
    draft.fieldTypes,
  );
  const prefilter = toWireTemplate(
    draft.prefilter.submission,
    draft.fieldTypes,
  );

  return {
    config_id: configId,
    name,
    input_columns: submissionColumns,
    commit_message: commitMessage || null,
    provider: draft.models.assessment.provider,
    model: draft.models.assessment.model,
    params: draft.models.assessment.params,
    submission_id: submissionId || null,
    system_instruction: draft.assessment.instructions,
    prompt_template: template,
    attachments,
    strict_columns: strictColumns(draft.fieldStrict),
    prefilter_config: draft.prefilterEnabled
      ? {
          topic_relevance: {
            columns: prefilterColumns(prefilter.template),
            attachment_columns: prefilter.attachments.map(
              (item) => item.column,
            ),
            prompt: draft.prefilter.instructions,
          },
        }
      : null,
    prefilter_model: draft.prefilterEnabled ? draft.models.prefilter : null,
    output_schema: schemaToJsonSchema(draft.outputSchema) as Record<
      string,
      unknown
    > | null,
  };
}

/** The columns the pre-filter prompt references, in `{Column}` wire form. */
function prefilterColumns(template: string): string[] {
  return [
    ...new Set([...template.matchAll(/\{([A-Za-z_]\w*)\}/g)].map((m) => m[1])),
  ];
}

/** The version a save produced, for re-baselining without a refetch. */
export function versionDetailFrom(
  input: SaveAssessorVersionInput,
  configId: string,
  version: number,
): AssessorVersionDetail {
  return {
    config_id: configId,
    version,
    commit_message: input.commit_message,
    provider: input.provider,
    model: input.model,
    params: input.params,
    submission_id: input.submission_id,
    system_instruction: input.system_instruction,
    prompt_template: input.prompt_template,
    attachments: input.attachments,
    strict_columns: input.strict_columns,
    prefilter_config: input.prefilter_config,
    prefilter_model: input.prefilter_model,
    output_schema: input.output_schema,
  };
}
