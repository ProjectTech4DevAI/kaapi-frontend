import type {
  ConfigPublic,
  ConfigVersionItems,
  ProviderType,
} from "@/app/lib/types/configs";
import type {
  AssessmentResultsPayload,
  AssessmentSubmission,
  AssessmentSummary,
  Attachment,
  CreateSubmissionInput,
  LabeledValue,
  ListAssessmentsQuery,
  PagedResult,
  PrefilterConfig,
  ResultsTarget,
  SubmissionPreviewPayload,
} from "./core";
import type { PromptFieldType, WizardDraft } from "./prompt";
import type { WizardContext } from "./wizard";

export interface ConfigRef {
  config_id: string;
  config_version: number;
}

export interface ConfigSelection extends ConfigRef {
  name?: string;
  provider?: string;
  model?: string;
}

export type ConfigParamType = "float" | "int" | "enum";

export interface ConfigParamDefinition {
  type: ConfigParamType;
  default: number | string;
  description?: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface AssessmentModelConfig {
  provider: ProviderType;
  model_name: string;
  config: Record<string, ConfigParamDefinition>;
}

export type ModelOption = LabeledValue;

export interface ConfigRunDetail {
  configId: string;
  version: number;
  name: string;
  description: string | null;
  commitMessage: string | null;
  provider: string | null;
  model: string | null;
}

export type ModelParams = Record<string, string | number>;

export interface AssessorModelSelection {
  provider: ProviderType;
  model: string;
  params: ModelParams;
}

export type AssessorSummary = ConfigPublic;

export interface AssessorPageQuery {
  skip?: number;
  limit?: number;
  search?: string;
}

export type AssessorVersion = ConfigVersionItems;

export interface AssessorVersionDetail {
  config_id: string;
  version: number;
  commit_message: string | null;
  provider: ProviderType;
  model: string;
  params: ModelParams;
  submission_id: string | null;
  system_instruction: string;
  prompt_template: string;
  attachments: Attachment[];
  strict_columns: string[];
  prefilter_config: PrefilterConfig | null;
  prefilter_model: AssessorModelSelection | null;
  output_schema: Record<string, unknown> | null;
}

export interface SaveAssessorVersionInput extends Omit<
  AssessorVersionDetail,
  "config_id" | "version"
> {
  config_id: string | null;
  name: string;
  description?: string | null;
  input_columns: string[];
}

export interface SaveAssessorVersionResult {
  config_id: string;
  version: number;
}

export type AssessmentBlob = Record<string, unknown>;

export interface AssessmentBlobInputColumn {
  type: PromptFieldType;
  format: "url" | "base64" | null;
  strict?: boolean;
}

export interface CreateRunInput {
  experiment_name: string;
  submission_id: string;
  config_id: string;
  config_version: number;
}

export interface AssessmentDataSource {
  listSubmissions: () => Promise<AssessmentSubmission[]>;
  getSubmissionPreview: (
    submissionId: string,
    limitRows?: number,
  ) => Promise<SubmissionPreviewPayload>;
  createSubmission: (
    input: CreateSubmissionInput,
  ) => Promise<AssessmentSubmission>;
  deleteSubmission: (submissionId: string) => Promise<void>;

  listAssessors: (
    page?: AssessorPageQuery,
  ) => Promise<PagedResult<AssessorSummary>>;
  listAssessorVersions: (configId: string) => Promise<AssessorVersion[]>;
  deleteAssessor: (configId: string) => Promise<void>;
  deleteAssessorVersion: (configId: string, version: number) => Promise<void>;
  getAssessorVersion: (
    configId: string,
    version: number,
  ) => Promise<AssessorVersionDetail>;
  saveAssessorVersion: (
    input: SaveAssessorVersionInput,
  ) => Promise<SaveAssessorVersionResult>;

  listAssessments: (
    query?: ListAssessmentsQuery,
  ) => Promise<AssessmentSummary[]>;
  createRun: (input: CreateRunInput) => Promise<AssessmentSummary>;
  getRunResults: (target: ResultsTarget) => Promise<AssessmentResultsPayload>;
}

export interface SaveAssessorParams {
  draft: WizardDraft;
  submissionId: string;
  submissionColumns: string[];
  configId: string | null;
  name: string;
  commitMessage: string;
}

export interface UseAssessorSaveResult {
  isSaving: boolean;
  save: (
    params: SaveAssessorParams,
  ) => Promise<
    (SaveAssessorVersionResult & { detail: AssessorVersionDetail }) | null
  >;
}

export interface UseAssessorVersionContextResult {
  versionDetail: AssessorVersionDetail | null;
  isLoading: boolean;
  load: (
    context: WizardContext,
    onLoaded: (detail: AssessorVersionDetail) => void,
  ) => void;
  adopt: (detail: AssessorVersionDetail) => void;
  reset: () => void;
}
