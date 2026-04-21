/**
 * Types for Assessment Evaluation
 */

export interface Attachment {
  column: string;
  type: 'image' | 'pdf';
  format: 'url' | 'base64';
}

export interface ConfigSelection {
  config_id: string;
  config_version: number;
  // UI display fields
  name?: string;
  provider?: string;
  model?: string;
}

export interface ColumnMapping {
  textColumns: string[];
  attachments: Attachment[];
  groundTruthColumns: string[];
}

export interface AssessmentFormState {
  experimentName: string;
  datasetId: string;
  columns: string[]; // all columns from the dataset CSV
  columnMapping: ColumnMapping;
  promptTemplate: string;
  outputSchema: SchemaProperty[];
  configs: ConfigSelection[];
}

export interface AssessmentRequestBody {
  experiment_name: string;
  dataset_id: string;
  prompt_template: string | null;
  text_columns: string[];
  attachments: Attachment[];
  configs: { config_id: string; config_version: number }[];
}

export const ATTACHMENT_FORMATS: Record<string, string[]> = {
  image: ['url', 'base64'],
  pdf: ['url', 'base64'],
};

export type SchemaPropertyType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'enum';

export interface SchemaProperty {
  id: string;
  name: string;
  type: SchemaPropertyType;
  isArray: boolean;
  isRequired: boolean;
  children: SchemaProperty[];    // for object type
  enumValues: string[];          // for enum type
}

export const MAX_CONFIGS = 4;
