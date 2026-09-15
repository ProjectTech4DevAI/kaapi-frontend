// BATCH assessment API shapes. Field names mirror the backend.

export type AssessmentMethodValue = "BATCH" | "RUN" | "RESPONSE";

export type AssessmentStatusValue =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED";

export interface AssessmentConfigRef {
  id: string;
  version: number;
}

export interface BatchPreFilterVerdict {
  verdict: boolean;
  reasoning: string;
}

export interface BatchPreFilter {
  topic_relevance?: BatchPreFilterVerdict | null;
}

export interface BatchItemOutput {
  /** Object when the config declares a json_output_schema, string for free text. */
  assessment?: Record<string, unknown> | string | null;
  pre_filter?: BatchPreFilter | null;
}

export interface BatchResultRow {
  /** Stable correlator; position in the submitted rows. */
  row_index: number;
  /** Submitted row echoed back; null when storage could not be read. */
  input?: Record<string, string> | null;
  output: BatchItemOutput;
  error?: string | null;
}

export interface BatchCounts {
  assessed: number;
  filtered: number;
  errors: number;
}

/** List row. No per-row counts by design: those need a storage read. */
export interface AssessmentSummary {
  assessment_id: string;
  method: AssessmentMethodValue;
  status: AssessmentStatusValue;
  experiment_name?: string | null;
  submission_id?: string | null;
  submission_name?: string | null;
  config?: AssessmentConfigRef | null;
  total_items: number;
  /** This run's own stages, in order — one entry when no pre-filter is configured. */
  stages?: string[];
  stage?: string | null;
  stage_status?: string | null;
  error?: string | null;
  inserted_at: string;
  updated_at: string;
}

export interface AssessmentDetail extends AssessmentSummary {
  counts: BatchCounts;
  items: BatchResultRow[];
}

export interface CreateBatchAssessmentPayload {
  experiment_name: string;
  config: AssessmentConfigRef;
  input: { submission_doc_id: string } | { data: Record<string, string>[] };
}

export interface ListAssessmentsQuery {
  config_id?: string;
  version?: number;
  method?: AssessmentMethodValue;
  limit?: number;
  offset?: number;
}

export interface ResultsTarget {
  assessment_id: string;
  method: AssessmentMethodValue;
}

/** Rows plus the status that decides whether to keep polling. */
export interface AssessmentResultsPayload {
  status: AssessmentStatusValue;
  rows: Record<string, unknown>[];
  total_items: number;
  counts: BatchCounts | null;
}
