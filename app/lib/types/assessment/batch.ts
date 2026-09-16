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
  assessment?: Record<string, unknown> | string | null;
  pre_filter?: BatchPreFilter | null;
}

export interface BatchResultRow {
  row_index: number;
  input?: Record<string, string> | null;
  output: BatchItemOutput;
  error?: string | null;
}

export interface BatchCounts {
  assessed: number;
  filtered: number;
  errors: number;
}

export interface AssessmentSummary {
  assessment_id: string;
  method: AssessmentMethodValue;
  status: AssessmentStatusValue;
  experiment_name?: string | null;
  submission_id?: string | null;
  submission_name?: string | null;
  config?: AssessmentConfigRef | null;
  total_items: number;
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

export interface AssessmentResultsPayload {
  status: AssessmentStatusValue;
  rows: Record<string, unknown>[];
  total_items: number;
  counts: BatchCounts | null;
}
