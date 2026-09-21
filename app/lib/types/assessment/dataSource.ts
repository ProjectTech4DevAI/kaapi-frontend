import type { PagedResult } from "./core";
import type { Attachment, PrefilterConfig } from "./dataset";
import type {
  AssessmentResultsPayload,
  ListAssessmentsQuery,
  ResultsTarget,
} from "./batch";
import type {
  AssessmentSubmission,
  CreateSubmissionInput,
  SubmissionPreviewPayload,
} from "./submission";
import type {
  ConfigPublic,
  ConfigVersionItems,
  ProviderType,
} from "@/app/lib/types/configs";
import type { AssessmentRun } from "./results";

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

  listAssessments: (query?: ListAssessmentsQuery) => Promise<AssessmentRun[]>;
  createRun: (input: CreateRunInput) => Promise<AssessmentRun>;
  getRunResults: (target: ResultsTarget) => Promise<AssessmentResultsPayload>;
}
