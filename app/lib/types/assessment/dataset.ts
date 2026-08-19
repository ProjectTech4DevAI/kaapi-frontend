// Assessment types: datasets, column mapping, output schema, prefilter, review.
import type { Dataset } from "@/app/lib/types/dataset";
import type { ProviderType } from "@/app/lib/types/configs";
import type {
  CreateResponse,
  ListResponse,
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
  // Names of columns marked strict (required in every submission row). Any
  // column not listed is optional (strict: false).
  strictColumns?: string[];
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
  // Legacy field: the new pipeline shares every column with the pre-filter
  // automatically, so column selection is no longer authored.
  columns: string[];
  attachment_columns?: string[];
  prompt: string;
  // Pre-filters run their own LLM call; when unset the backend applies its
  // recommended default model.
  provider?: ProviderType;
  model?: string;
  params?: Record<string, string | number>;
  // true (default) gates rejected rows out of the assessment stage.
  stop_on_fail?: boolean;
}

export interface PrefilterDuplicateDetectionConfig {
  columns: string[];
}

export interface PrefilterConfig {
  topic_relevance?: PrefilterTopicRelevanceConfig;
  duplicate_detection?: PrefilterDuplicateDetectionConfig;
}

export interface PrefilterSectionProps extends StepNavigationProps {
  prefilterConfig: PrefilterConfig | null;
  setPrefilterConfig: ValueSetter<PrefilterConfig | null>;
  // Changes when a config is (re)loaded, so local state re-syncs from props.
  syncToken?: number;
}

// One input field derived from the prompts (Fields card): every field maps to
// an input_schema column at save time.
export interface DerivedField {
  name: string;
  type: "text" | "image" | "pdf";
  // Whether the Submission template references it ({token}) / it was attached.
  referenced: boolean;
  warning?: string;
}

export interface AssessmentDatasetState {
  datasetId: string;
  datasetName: string;
  setDatasetId: ValueSetter<string>;
  setDatasetName: ValueSetter<string>;
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

// GET /api/assessment/datasets/{id}/rows — all rows, column-keyed.
export interface AssessmentDatasetRows {
  headers: string[];
  rows: Record<string, string>[];
  total_rows: number;
}
