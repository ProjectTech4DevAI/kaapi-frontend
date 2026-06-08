// Shared TypeScript types for the Assessment feature.
import type { Dispatch, SetStateAction } from "react";
import type { Dataset } from "@/app/lib/types/dataset";
import type { ConfigPublic, ConfigVersionItems } from "@/app/lib/types/configs";

export type ValueSetter<T> = (value: T) => void;
export type StateSetter<T> = Dispatch<SetStateAction<T>>;
export type SampleRow = Record<string, string>;
export type JsonSchemaValue = object | null;
export type ListResponse<T> = T[] | { data?: T[] };
export type CreateResponse<T> = T | { data?: T };
export type RouteContext<K extends string> = {
  params: Promise<Record<K, string>>;
};

export interface LabeledValue<T = string> {
  value: T;
  label: string;
}

export interface Attachment {
  column: string;
  type: "image" | "pdf" | "mixed";
  format: "url" | "base64";
  // For 'mixed': column whose value decides each row's type + the value->type map.
  type_column?: string | null;
  type_value_map?: Record<string, string> | null;
}

export interface ConfigRef {
  config_id: string;
  config_version: number;
}

export interface ConfigSelection extends ConfigRef {
  name?: string;
  provider?: string;
  model?: string;
}

export interface ColumnMapping {
  textColumns: string[];
  attachments: Attachment[];
  groundTruthColumns: string[];
}

export type ColumnRole = "unmapped" | "text" | "attachment" | "ground_truth";
export type RoleOption = LabeledValue<ColumnRole>;

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

export interface PrefilterDuplicateDetectionConfig {
  columns: string[];
}

export interface PrefilterConfig {
  topic_relevance?: PrefilterTopicRelevanceConfig;
  duplicate_detection?: PrefilterDuplicateDetectionConfig;
}

export interface PrefilterStepProps extends StepNavigationProps {
  columns: string[];
  attachmentColumns?: string[];
  prefilterConfig: PrefilterConfig | null;
  setPrefilterConfig: ValueSetter<PrefilterConfig | null>;
}

export interface AssessmentFormState {
  experimentName: string;
  datasetId: string;
  datasetName: string;
  columns: string[];
  sampleRow: SampleRow;
  columnMapping: ColumnMapping;
  systemInstruction: string;
  promptTemplate: string;
  outputSchema: SchemaProperty[];
  configs: ConfigSelection[];
  prefilterConfig: PrefilterConfig | null;
  postProcessingConfig: PostProcessingConfig | null;
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

export type ConfigParamType = "float" | "int" | "enum";

export interface ConfigParamDefinition {
  type: ConfigParamType;
  default: number | string;
  description: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface AssessmentModelConfig {
  provider: "openai" | "google";
  model_name: string;
  config: Record<string, ConfigParamDefinition>;
}

export type ModelOption = LabeledValue;

export interface PagedResult<T> {
  items: T[];
  hasMore: boolean;
  nextSkip: number;
}

export type AssessmentTabId = "datasets" | "config" | "results";
export interface AssessmentTab {
  id: AssessmentTabId;
  label: string;
}

export interface Step {
  id: number;
  label: string;
}

export interface StepNavigationProps {
  onNext: () => void;
  onBack: () => void;
}

export interface WithForbiddenHandler {
  onForbidden?: () => void;
}

export interface ColumnConfig {
  role: ColumnRole;
  attachmentType?: "image" | "pdf" | "mixed";
  attachmentFormat?: string;
  // For 'mixed': the type-deciding column + comma-separated values per type.
  attachmentTypeColumn?: string;
  attachmentImageValues?: string;
  attachmentPdfValues?: string;
}

export interface RoleVisuals {
  panelClass: string;
  dotClass: string;
  activeButtonClass: string;
}

export interface ColumnMapperStepProps extends StepNavigationProps {
  columns: string[];
  columnMapping: ColumnMapping;
  setColumnMapping: ValueSetter<ColumnMapping>;
}

export interface ConfigPanelProps {
  canSubmitAssessment: boolean;
  columns: string[];
  columnMapping: ColumnMapping;
  completedSteps: Set<number>;
  configStep: number;
  configs: ConfigSelection[];
  datasetId: string | null;
  experimentName: string;
  formState: AssessmentFormState;
  hasDataset: boolean;
  isSubmitting: boolean;
  prefilterConfig: PrefilterConfig | null;
  outputSchema: SchemaProperty[];
  systemInstruction: string;
  promptTemplate: string;
  sampleRow: SampleRow;
  setActiveTabToDatasets: () => void;
  setColumnMapping: ValueSetter<ColumnMapping>;
  setConfigStep: ValueSetter<number>;
  setConfigs: StateSetter<ConfigSelection[]>;
  setExperimentName: ValueSetter<string>;
  setPrefilterConfig: ValueSetter<PrefilterConfig | null>;
  setOutputSchema: ValueSetter<SchemaProperty[]>;
  setSystemInstruction: ValueSetter<string>;
  setPromptTemplate: ValueSetter<string>;
  postProcessingConfig: PostProcessingConfig | null;
  setPostProcessingConfig: ValueSetter<PostProcessingConfig | null>;
  submitBlockerMessage: string;
  onSubmit: () => void;
  onStepComplete: ValueSetter<number>;
}

export type EvaluationsTabProps = WithForbiddenHandler;

export interface DatasetsTabProps extends WithForbiddenHandler {
  datasetId: string;
  setDatasetId: ValueSetter<string>;
  setSelectedDatasetName: ValueSetter<string>;
  onColumnsLoaded: (columns: string[], sampleRow?: SampleRow) => void;
  onNext: () => void;
}

export interface PageLayoutProps {
  activeTab: AssessmentTabId;
  tabs: AssessmentTab[];
  onTabSwitch: ValueSetter<AssessmentTabId>;
  datasetsTabProps: DatasetsTabProps;
  configPanelProps: ConfigPanelProps;
  evaluationsTabProps: EvaluationsTabProps;
}

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

export interface PostProcessingStepProps extends StepNavigationProps {
  postProcessingConfig: PostProcessingConfig | null;
  setPostProcessingConfig: (config: PostProcessingConfig | null) => void;
  columnMapping: ColumnMapping;
  outputSchema: SchemaProperty[];
}

export interface PostProcessingPanelProps {
  availableColumns: string[];
  fetchColumns?: () => Promise<string[]>;
  initialConfig: PostProcessingConfig | null;
  onSave: (config: PostProcessingConfig) => Promise<void>;
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

export interface ConfigRunDetail {
  configId: string;
  version: number;
  name: string;
  description: string | null;
  commitMessage: string | null;
  provider: string | null;
  model: string | null;
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

export interface AssessmentResultsPreview {
  runId: number;
  title: string;
  headers: string[];
  rows: string[][];
}

export interface AssessmentDatasetSummary {
  dataset_id: number;
  dataset_name?: string;
}

export type DatasetResponse = ListResponse<Dataset>;
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

export type ConfigMode = "existing" | "create";

export interface VersionListState {
  items: ConfigVersionItems[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextSkip: number;
}

export type LatestConfigModel = { provider: string; model: string } | null;

export interface SavedConfigCardProps {
  config: ConfigPublic;
  versions: VersionListState;
  latestModel: LatestConfigModel;
  expanded: boolean;
  loadingSelectionKeys: Record<string, boolean>;
  isSelected: (configId: string, version: number) => boolean;
  onLoadVersions: (configId: string, skip: number) => void;
  onToggleExpansion: ValueSetter<string>;
  onToggleVersionSelection: (
    config: ConfigPublic,
    version: number,
  ) => void | Promise<void>;
}

export interface PromptAndConfigStepProps extends StepNavigationProps {
  textColumns: string[];
  sampleRow: SampleRow;
  systemInstruction: string;
  setSystemInstruction: ValueSetter<string>;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  configs: ConfigSelection[];
  setConfigs: StateSetter<ConfigSelection[]>;
  outputSchema: SchemaProperty[];
  setOutputSchema: ValueSetter<SchemaProperty[]>;
}

export const ATTACHMENT_FORMATS: Record<string, string[]> = {
  mixed: ["url", "base64"],
  image: ["url", "base64"],
  pdf: ["url", "base64"],
};

export const MAX_CONFIGS = 4;

export type ReviewColumnRole = "text" | "attachment" | "ground truth";

export interface ReviewColumn {
  key: string;
  column: string;
  role: ReviewColumnRole;
  badgeClass: string;
}
