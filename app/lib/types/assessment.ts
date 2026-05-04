import type { Dispatch, SetStateAction } from "react";
import type { Dataset } from "@/app/lib/types/datasets";
import type { ConfigVersionItems } from "@/app/lib/types/configs";

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
  type: "image" | "pdf";
  format: "url" | "base64";
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
  provider: "openai";
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
  attachmentType?: "image" | "pdf";
  attachmentFormat?: string;
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
  experimentName: string;
  formState: AssessmentFormState;
  hasDataset: boolean;
  isSubmitting: boolean;
  outputSchema: SchemaProperty[];
  outputSchemaJson: JsonSchemaValue;
  systemInstruction: string;
  promptTemplate: string;
  sampleRow: SampleRow;
  setActiveTabToDatasets: () => void;
  setColumnMapping: ValueSetter<ColumnMapping>;
  setConfigStep: ValueSetter<number>;
  setConfigs: StateSetter<ConfigSelection[]>;
  setExperimentName: ValueSetter<string>;
  setOutputSchema: ValueSetter<SchemaProperty[]>;
  setSystemInstruction: ValueSetter<string>;
  setPromptTemplate: ValueSetter<string>;
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

export interface AssessmentRunStat {
  run_id: number;
  config_id: string | null;
  config_version: number | null;
  status: string;
  total_items: number;
  error_message: string | null;
  updated_at: string | null;
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
export type AssessmentConfigTag = AssessmentTag;
export type AssessmentFeatureFlag = AssessmentTag;
export type AssessmentListResponse = ListResponse<AssessmentRun>;
export type AssessmentChildRunListResponse = ListResponse<AssessmentChildRun>;

export interface ResultsCounts {
  total: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface AssessmentResultsPreview {
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
export type DatasetFileResponse = { file_content?: string };

export interface ParsedDatasetFile {
  headers: string[];
  rows: string[][];
}

export interface DatasetViewModalData extends ParsedDatasetFile {
  name: string;
}

export type ConfigMode = "existing" | "create";

export interface VersionListState {
  items: ConfigVersionItems[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextSkip: number;
}

export const ATTACHMENT_FORMATS: Record<string, string[]> = {
  image: ["url", "base64"],
  pdf: ["url", "base64"],
};

export const MAX_CONFIGS = 4;
