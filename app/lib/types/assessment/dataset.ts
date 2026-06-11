// Assessment types: datasets, column mapping, output schema, prefilter, review.
import type { Dataset } from "@/app/lib/types/dataset";
import type {
  CreateResponse,
  LabeledValue,
  ListResponse,
  SampleRow,
  StepNavigationProps,
  ValueSetter,
} from "./core";

export interface Attachment {
  column: string;
  type: "image" | "pdf" | "mixed";
  format: "url" | "base64";
  // For 'mixed': column whose value decides each row's type + the value->type map.
  type_column?: string | null;
  type_value_map?: Record<string, string> | null;
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

export type ReviewColumnRole = "text" | "attachment" | "ground truth";

export interface ReviewColumn {
  key: string;
  column: string;
  role: ReviewColumnRole;
  badgeClass: string;
}
