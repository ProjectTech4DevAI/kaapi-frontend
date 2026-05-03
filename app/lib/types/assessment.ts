import type {
  ChangeEvent,
  Dispatch,
  DragEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from "react";
import type { ConfigPublic, ConfigVersionItems } from "@/app/lib/types/configs";
import type { Dataset } from "@/app/lib/types/datasets";

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

export interface PageHeaderProps {
  onToggleSidebar: () => void;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: ValueSetter<number>;
  completedSteps: Set<number>;
}

export interface ConfigPanelProps {
  apiKey: string;
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

export interface JsonEditorProps {
  value: string;
  onChange: ValueSetter<string>;
  error?: string | null;
  isValid?: boolean;
  placeholder?: string;
  minHeight?: number;
}

export interface EvaluationsTabProps extends WithForbiddenHandler {
  apiKey: string;
}

export interface PageLayoutProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  hasApiKeys: boolean;
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
export type AssessmentListResponse = ListResponse<AssessmentRun>;
export type AssessmentChildRunListResponse = ListResponse<AssessmentChildRun>;

export interface DataViewModalProps {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  onClose: () => void;
}

export interface ReviewStepProps {
  formState: AssessmentFormState;
  experimentName: string;
  setExperimentName: ValueSetter<string>;
  isSubmitting: boolean;
  canSubmit: boolean;
  outputSchemaJson: JsonSchemaValue;
  submitBlockerMessage: string;
  onSubmit: () => void;
  onBack: () => void;
  onEditStep: ValueSetter<number>;
}

export interface ReviewSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  headerAction?: ReactNode;
  badge?: string;
  children: ReactNode;
}

export interface ExperimentReviewProps {
  experimentName: string;
  setExperimentName: ValueSetter<string>;
}

export interface DatasetReviewProps {
  datasetName: string;
  isOpen: boolean;
  onToggle: () => void;
}

export type ReviewColumnRole = "text" | "attachment" | "ground truth";

export interface ReviewColumn {
  key: string;
  column: string;
  role: ReviewColumnRole;
  badgeClass: string;
}

export interface ColumnsReviewProps {
  mappedColumns: ReviewColumn[];
  mappedCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export interface InputReviewProps {
  systemInstruction: string;
  promptTemplate: string;
  isOpen: boolean;
  onToggle: () => void;
}

export interface PromptNodeProps {
  title: string;
  value: string;
  fallback: string;
  isOpen: boolean;
  onToggle: () => void;
}

export interface ConfigsReviewProps {
  configs: ConfigSelection[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export interface SchemaReviewProps {
  outputSchema: SchemaProperty[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export interface PayloadReviewProps {
  experimentName: string;
  datasetId: string;
  systemInstruction: string;
  promptTemplate: string;
  columnMapping: ColumnMapping;
  outputSchemaJson: JsonSchemaValue;
  configs: ConfigSelection[];
}

export interface SubmitReviewProps {
  isSubmitting: boolean;
  canSubmit: boolean;
  submitBlockerMessage: string;
  onSubmit: () => void;
  onBack: () => void;
}

export interface DatasetsDeleteModalProps {
  datasetName?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
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

export interface DatasetsTabProps extends WithForbiddenHandler {
  apiKey: string;
  datasetId: string;
  setDatasetId: ValueSetter<string>;
  setSelectedDatasetName: ValueSetter<string>;
  onColumnsLoaded: (columns: string[], sampleRow?: SampleRow) => void;
  onNext: () => void;
}

export interface DatasetsCreatePanelProps {
  datasetName: string;
  datasetDescription: string;
  uploadedFile: File | null;
  isDragging: boolean;
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDatasetNameChange: ValueSetter<string>;
  onDatasetDescriptionChange: ValueSetter<string>;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemoveFile: () => void;
  onResetForm: () => void;
  onCreateDataset: () => void;
}

export interface DatasetsListProps {
  datasets: Dataset[];
  datasetId: string;
  isLoading: boolean;
  isLoadingColumns: boolean;
  viewingId: number | null;
  canProceed: boolean;
  onSelectDataset: (id: string, name?: string) => void;
  onViewDataset: (datasetId: number, name: string) => void;
  onRequestDelete: ValueSetter<number>;
  onNext: () => void;
}

export interface OutputSchemaStepProps extends StepNavigationProps {
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
}

export interface OutputSchemaEditorProps {
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
  title?: string;
  description?: ReactNode;
}

export interface PropertyRowProps {
  property: SchemaProperty;
  depth: number;
  onUpdate: (
    id: string,
    updater: (property: SchemaProperty) => SchemaProperty,
  ) => void;
  onRemove: ValueSetter<string>;
  onAddChild: ValueSetter<string>;
  onAddEnumValue: ValueSetter<string>;
  onUpdateEnumValue: (id: string, index: number, value: string) => void;
  onRemoveEnumValue: (id: string, index: number) => void;
}

export interface OutputSchemaModalProps {
  open: boolean;
  onClose: () => void;
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
}

export interface PromptAndConfigStepProps extends StepNavigationProps {
  apiKey: string;
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

export interface PromptPanelProps {
  textColumns: string[];
  sampleRow: SampleRow;
  systemInstruction: string;
  setSystemInstruction: ValueSetter<string>;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
}

export interface SystemPromptProps {
  value: string;
  onChange: ValueSetter<string>;
  previewMode: boolean;
}

export interface PromptEditorProps {
  value: string;
  onChange: ValueSetter<string>;
  previewMode: boolean;
  placeholder: string;
  emptyPreviewText: string;
  textColumns?: string[];
  sampleRow?: SampleRow;
  enablePlaceholders?: boolean;
}

export interface UserPromptProps {
  textColumns: string[];
  sampleRow: SampleRow;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  previewMode: boolean;
}

export interface VersionListState {
  items: ConfigVersionItems[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextSkip: number;
}

export type ConfigMode = "existing" | "create";

export interface SetupProgressProps {
  promptStatus: string;
  selectedConfigCount: number;
  responseSummary: string;
}

export interface StatusPillProps {
  label: string;
  value: string;
}

export interface ResponseSchemaProps {
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
  summary: string;
  hasFields: boolean;
}

export interface SelectedConfigsProps {
  configs: ConfigSelection[];
  onRemove: (configId: string, version: number) => void;
}

export interface ConfigCreatorProps {
  currentProvider: string;
  currentModel: string;
  providerModels: ModelOption[];
  currentParamDefs: Record<string, ConfigParamDefinition>;
  draftParams: Record<string, string | number | undefined>;
  configName: string;
  commitMessage: string;
  isSaving: boolean;
  setConfigName: ValueSetter<string>;
  setCommitMessage: ValueSetter<string>;
  onProviderChange: ValueSetter<"openai">;
  onModelChange: ValueSetter<string>;
  onParamChange: (key: string, value: string | number) => void;
  onSave: () => void | Promise<void>;
}

export interface ConfigParamControlProps {
  value: string | number;
  definition: ConfigParamDefinition;
  onChange: (value: string | number) => void;
}

export interface SavedConfigsProps {
  configCards: ConfigPublic[];
  searchQuery: string;
  setSearchQuery: ValueSetter<string>;
  isLoadingConfigs: boolean;
  hasMoreConfigs: boolean;
  nextConfigSkip: number;
  expandedConfigId: string | null;
  versionStateByConfig: Record<string, VersionListState>;
  loadingSelectionKeys: Record<string, boolean>;
  isSelected: (configId: string, version: number) => boolean;
  onLoadMoreConfigs: (skip: number) => void;
  onLoadVersions: (configId: string, skip: number) => void;
  onToggleConfigExpansion: ValueSetter<string>;
  onToggleVersionSelection: (
    config: ConfigPublic,
    version: number,
  ) => void | Promise<void>;
}

export interface SavedConfigCardProps {
  config: ConfigPublic;
  versions: VersionListState;
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

export interface VersionSummaryProps {
  previewVersions: ConfigVersionItems[];
  knownVersionCount: number;
}

export interface VersionPanelProps {
  config: ConfigPublic;
  versions: VersionListState;
  expanded: boolean;
  loadingSelectionKeys: Record<string, boolean>;
  isSelected: (configId: string, version: number) => boolean;
  onLoadVersions: (configId: string, skip: number) => void;
  onToggleVersionSelection: (
    config: ConfigPublic,
    version: number,
  ) => void | Promise<void>;
}

export interface AssessmentConfigurationProps extends Omit<
  ConfigCreatorProps,
  "onSave"
> {
  configMode: ConfigMode;
  setConfigMode: ValueSetter<ConfigMode>;
  configs: ConfigSelection[];
  onRemoveConfig: (configId: string, version: number) => void;
  configCards: ConfigPublic[];
  searchQuery: string;
  setSearchQuery: ValueSetter<string>;
  isLoadingConfigs: boolean;
  hasMoreConfigs: boolean;
  nextConfigSkip: number;
  expandedConfigId: string | null;
  versionStateByConfig: Record<string, VersionListState>;
  loadingSelectionKeys: Record<string, boolean>;
  isSelected: (configId: string, version: number) => boolean;
  onLoadMoreConfigs: (skip: number) => void;
  onLoadVersions: (configId: string, skip: number) => void;
  onToggleConfigExpansion: ValueSetter<string>;
  onToggleVersionSelection: (
    config: ConfigPublic,
    version: number,
  ) => void | Promise<void>;
  onSaveConfig: () => void | Promise<void>;
}

export interface CompactToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  title: string;
}

export const ATTACHMENT_FORMATS: Record<string, string[]> = {
  image: ["url", "base64"],
  pdf: ["url", "base64"],
};

export const MAX_CONFIGS = 4;
