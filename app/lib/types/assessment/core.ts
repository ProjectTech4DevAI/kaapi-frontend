import type { ChangeEvent, DragEvent, RefObject } from "react";

export type ValueSetter<T> = (value: T) => void;
export type SampleRow = Record<string, string>;
export type CreateResponse<T> = T | { data?: T };
export type RouteContext<K extends string> = {
  params: Promise<Record<K, string>>;
};

export interface LabeledValue<T = string> {
  value: T;
  label: string;
}

export interface PagedResult<T> {
  items: T[];
  hasMore: boolean;
  nextSkip: number;
}

export interface PageSlice<T> {
  items: T[];
  page: number;
  pages: number;
  total: number;
}

export interface Step {
  id: number;
  label: string;
}

export interface StepNavigationProps {
  onNext: () => void;
  onBack: () => void;
}

export interface UseAssessmentFeatureGuardResult {
  guard: (error: unknown) => boolean;
}

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
  submission_id: string | null;
  config: AssessmentConfigRef | null;
}

export interface Attachment {
  column: string;
  type: "image" | "pdf" | "mixed";
  format: "url" | "base64";
  type_column?: string | null;
  type_value_map?: Record<string, string> | null;
}

export interface ColumnMapping {
  textColumns: string[];
  attachments: Attachment[];
  groundTruthColumns: string[];
}

export type SchemaPropertyType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "enum";

export interface SchemaProperty {
  id: string;
  name: string;
  type: SchemaPropertyType;
  isArray: boolean;
  isRequired: boolean;
  children: SchemaProperty[];
  enumValues: string[];
}

export interface PrefilterTopicRelevanceConfig {
  columns: string[];
  attachment_columns?: string[];
  prompt: string;
}

export interface PrefilterConfig {
  topic_relevance?: PrefilterTopicRelevanceConfig;
}

export interface AssessmentDatasetState {
  datasetId: string;
  datasetName: string;
  columns: string[];
  sampleRow: SampleRow;
  columnMapping: ColumnMapping;
  setDatasetId: ValueSetter<string>;
  setDatasetName: ValueSetter<string>;
  setDataset: (
    datasetId: string,
    columns: string[],
    sampleRow: SampleRow,
    datasetName?: string,
  ) => void;
  setColumnMapping: ValueSetter<ColumnMapping>;
  clearDataset: () => void;
}

export interface AssessmentDatasetSummary {
  dataset_id: number;
  dataset_name?: string;
}

export type CreateDatasetResponse = CreateResponse<
  Partial<AssessmentDatasetSummary>
>;

export interface DatasetPreview {
  headers: string[];
  rows: string[][];
  totalItems: number;
  truncated: boolean;
}

export interface DatasetPreviewPayload {
  total_items?: number;
  preview?: {
    headers?: string[];
    rows?: string[][];
    returned_rows?: number;
    truncated?: boolean;
  };
}

export type DatasetPreviewResponse = DatasetPreviewPayload & {
  data?: DatasetPreviewPayload;
};

export interface DatasetViewModalData {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface AssessmentSubmission {
  submission_id: string;
  name: string;
  description?: string | null;
  total_items: number;
  object_store_url?: string | null;
  signed_url?: string | null;
  preview?: SubmissionPreviewRows | null;
}

export interface SubmissionPreviewRows {
  headers?: string[];
  rows?: string[][];
  returned_rows?: number;
  truncated?: boolean;
}

export interface SubmissionPreviewPayload {
  total_items?: number;
  preview?: SubmissionPreviewRows;
}

export interface SubmissionInputs {
  headers: string[];
  records: Record<string, string>[];
}

export interface CreateSubmissionInput {
  name: string;
  description?: string;
  file: File;
}

export interface UseSubmissionListResult {
  submissions: AssessmentSubmission[];
  isLoading: boolean;
  reload: () => Promise<void>;
  loadPreview: (id: string) => Promise<DatasetPreview>;
  forgetPreview: (id: string) => void;
}

export interface UseSubmissionFormResult {
  name: string;
  description: string;
  file: File | null;
  isDragging: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setIsDragging: (value: boolean) => void;
  removeFile: () => void;
  reset: () => void;
  handleFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (event: DragEvent<HTMLElement>) => void;
}

export interface UseSubmissionStepResult {
  form: UseSubmissionFormResult;
  submissions: AssessmentSubmission[];
  selectedId: string;
  isLoading: boolean;
  isLoadingColumns: boolean;
  isCreating: boolean;
  viewingId: string | null;
  deletingId: string | null;
  viewModalData: DatasetViewModalData | null;
  confirmDeleteId: string | null;
  pendingDelete: AssessmentSubmission | undefined;
  setConfirmDeleteId: (value: string | null) => void;
  setViewModalData: (value: DatasetViewModalData | null) => void;
  handleCreate: () => Promise<void>;
  handleSelect: (id: string, name?: string) => Promise<void>;
  handleView: (submissionId: string, name: string) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

export interface SubmissionListProps {
  submissions: AssessmentSubmission[];
  selectedId: string;
  isLoading: boolean;
  isLoadingColumns: boolean;
  viewingId: string | null;
  onSelect: (id: string, name?: string) => void;
  onView: (submissionId: string, name: string) => void;
  onRequestDelete: ValueSetter<string>;
}

export interface CreatePanelProps {
  form: UseSubmissionFormResult;
  isCreating: boolean;
  onCreate: () => void;
  layout?: "panel" | "inline";
  onCancel?: () => void;
}
