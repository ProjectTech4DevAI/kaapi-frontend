// Assessment types: runs, child runs, post-processing, results, spreadsheet.
import type { ListResponse } from "./core";

export interface PipelineStageEntry {
  stage: string;
  type?: string;
  order?: number;
}

export interface PipelineConfig {
  stages: PipelineStageEntry[];
}

export interface AssessmentRunStat {
  run_id: number;
  config_id: string | null;
  config_version: number | null;
  status: string;
  total_items: number;
  error_message: string | null;
  updated_at: string | null;
  prefilter_total_rows: number | null;
  prefilter_total_passed: number | null;
  prefilter_total_rejected: number | null;
  stage: string | null;
  stage_status: string | null;
}

export interface AssessmentRun {
  id: number;
  experiment_name: string;
  dataset_name: string | null;
  dataset_id: number | null;
  status: string;
  total_runs: number;
  pending_runs: number;
  processing_runs: number;
  completed_runs: number;
  failed_runs: number;
  run_stats: AssessmentRunStat[];
  error_message: string | null;
  inserted_at: string;
  updated_at: string;
}

export interface PostProcessingComputedColumn {
  name: string;
  formula: string;
}

export interface PostProcessingSortRule {
  column: string;
  direction: "asc" | "desc";
}

export interface PostProcessingFilterRule {
  column: string;
  op:
    | "eq"
    | "ne"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "contains"
    | "not_contains"
    | "is_empty"
    | "is_not_empty";
  value?: string | number;
}

export interface PostProcessingConfig {
  computed_columns: PostProcessingComputedColumn[];
  sort: PostProcessingSortRule[];
  filter: PostProcessingFilterRule[];
}

export interface AssessmentChildRun {
  id: number;
  assessment_id: number | null;
  run_name: string;
  dataset_name: string | null;
  dataset_id: number | null;
  config_id: string | null;
  config_version: number | null;
  status: string;
  total_items: number;
  error_message: string | null;
  organization_id: number;
  project_id: number;
  assessment_config: Record<string, unknown> | null;
  prefilter_total_rows: number | null;
  prefilter_total_passed: number | null;
  prefilter_total_rejected: number | null;
  stage: string | null;
  stage_status: string | null;
  pipeline: PipelineConfig | null;
  post_processing_config: PostProcessingConfig | null;
  inserted_at: string;
  updated_at: string;
}

export type StatusFilter = "all" | "processing" | "completed" | "failed";
export type ExportFormat = "csv" | "xlsx";
export type ResultTone = "default" | "warning" | "success" | "error";
export type AssessmentTag = "ASSESSMENT";
export type AssessmentListResponse = ListResponse<AssessmentRun>;
export type AssessmentChildRunListResponse = ListResponse<AssessmentChildRun>;

export interface ResultsCounts {
  total: number;
  processing: number;
  completed: number;
  failed: number;
}

export type UniverCommandInfo = {
  id: string;
  type?: number;
  params?: unknown;
};

export type UniverAPI = {
  dispose?: () => void;
  onCommandExecuted: (cb: (info: UniverCommandInfo) => void) => {
    dispose: () => void;
  };
  getActiveWorkbook: () => { save: () => object } | null;
  createUniverSheet: (d: object) => void;
};

export type SpreadsheetStateEnvelope = {
  v: number;
  ts: number;
  data: object;
};
